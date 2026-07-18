package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AdminCommentLikeResponse;
import com.wky.backend.domain.dto.AdminCommentResponse;
import com.wky.backend.domain.dto.CommentResponse;
import com.wky.backend.domain.dto.CreateCommentRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.ExperimentComment;
import com.wky.backend.domain.entity.ExperimentCommentLike;
import com.wky.backend.domain.entity.User;
import com.wky.backend.enums.ExperimentStatus;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.ExperimentCommentLikeMapper;
import com.wky.backend.mapper.ExperimentCommentMapper;
import com.wky.backend.service.IExperimentCommentService;
import com.wky.backend.service.IExperimentService;
import com.wky.backend.service.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExperimentCommentServiceImpl extends ServiceImpl<ExperimentCommentMapper, ExperimentComment>
        implements IExperimentCommentService {

    public static final String STATUS_VISIBLE = "VISIBLE";
    public static final String STATUS_HIDDEN = "HIDDEN";
    public static final String STATUS_DELETED = "DELETED";

    private final IExperimentService experimentService;
    private final IUserService userService;
    private final ExperimentCommentLikeMapper likeMapper;

    @Override
    public PageResponse<CommentResponse> listComments(
            Long experimentId, Long currentUserId, String filter, long page, long pageSize) {
        requirePublished(experimentId);

        LambdaQueryWrapper<ExperimentComment> wrapper = new LambdaQueryWrapper<ExperimentComment>()
                .eq(ExperimentComment::getExperimentId, experimentId)
                .eq(ExperimentComment::getStatus, STATUS_VISIBLE)
                .isNull(ExperimentComment::getRootId)
                .orderByDesc(ExperimentComment::getCreateTime);

        if ("mine".equalsIgnoreCase(filter)) {
            if (currentUserId == null) {
                return new PageResponse<>(List.of(), 0, page, pageSize);
            }
            wrapper.eq(ExperimentComment::getUserId, currentUserId);
        }

        Page<ExperimentComment> result = page(new Page<>(page, pageSize), wrapper);
        List<ExperimentComment> roots = result.getRecords();
        if (roots.isEmpty()) {
            return new PageResponse<>(List.of(), result.getTotal(), result.getCurrent(), result.getSize());
        }

        List<Long> rootIds = roots.stream().map(ExperimentComment::getId).toList();
        List<ExperimentComment> replies = list(new LambdaQueryWrapper<ExperimentComment>()
                .eq(ExperimentComment::getExperimentId, experimentId)
                .eq(ExperimentComment::getStatus, STATUS_VISIBLE)
                .in(ExperimentComment::getRootId, rootIds)
                .orderByAsc(ExperimentComment::getCreateTime));

        Set<Long> userIds = new HashSet<>();
        Set<Long> commentIds = new HashSet<>();
        for (ExperimentComment c : roots) {
            userIds.add(c.getUserId());
            commentIds.add(c.getId());
        }
        for (ExperimentComment c : replies) {
            userIds.add(c.getUserId());
            commentIds.add(c.getId());
        }

        Map<Long, User> users = loadUsers(userIds);
        Set<Long> likedIds = findLikedCommentIds(currentUserId, commentIds);
        Map<Long, ExperimentComment> replyTargets = loadReplyTargets(replies);

        // also need nicknames of reply-to authors
        Set<Long> replyToUserIds = replyTargets.values().stream()
                .map(ExperimentComment::getUserId)
                .collect(Collectors.toSet());
        if (!replyToUserIds.isEmpty()) {
            users = mergeUsers(users, loadUsers(replyToUserIds));
        }

        Map<Long, List<ExperimentComment>> repliesByRoot = replies.stream()
                .collect(Collectors.groupingBy(ExperimentComment::getRootId));

        Map<Long, User> finalUsers = users;
        List<CommentResponse> records = roots.stream()
                .map(root -> toResponse(
                        root,
                        finalUsers,
                        likedIds,
                        replyTargets,
                        repliesByRoot.getOrDefault(root.getId(), List.of()).stream()
                                .map(r -> toResponse(r, finalUsers, likedIds, replyTargets, null))
                                .toList()))
                .toList();

        return new PageResponse<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    @Transactional
    public CommentResponse createComment(Long experimentId, Long userId, CreateCommentRequest request) {
        Experiment experiment = requirePublished(experimentId);
        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty() || content.length() > 1000) {
            throw new ApiException(400, "评论内容须为 1–1000 字");
        }

        Long rootId = null;
        Long replyToId = request.getReplyToId();
        ExperimentComment replyTarget = null;

        if (replyToId != null) {
            replyTarget = getById(replyToId);
            if (replyTarget == null
                    || !Objects.equals(replyTarget.getExperimentId(), experimentId)
                    || !STATUS_VISIBLE.equals(replyTarget.getStatus())) {
                throw new ApiException(400, "回复目标不存在");
            }
            // 一级：root_id 为空；楼内回复：root_id 指向一级
            rootId = replyTarget.getRootId() != null ? replyTarget.getRootId() : replyTarget.getId();
        }

        ExperimentComment comment = new ExperimentComment();
        comment.setExperimentId(experimentId);
        comment.setUserId(userId);
        comment.setRootId(rootId);
        comment.setReplyToId(replyToId);
        comment.setContent(content);
        comment.setLikeCount(0L);
        comment.setStatus(STATUS_VISIBLE);
        save(comment);

        experimentService.lambdaUpdate()
                .eq(Experiment::getId, experiment.getId())
                .setSql("comment_count = comment_count + 1")
                .update();

        User user = userService.getById(userId);
        Map<Long, User> users = user != null ? Map.of(userId, user) : Map.of();
        Map<Long, ExperimentComment> targets = replyTarget != null
                ? Map.of(replyTarget.getId(), replyTarget)
                : Map.of();
        if (replyTarget != null) {
            User targetUser = userService.getById(replyTarget.getUserId());
            if (targetUser != null) {
                users = mergeUsers(users, Map.of(targetUser.getId(), targetUser));
            }
        }
        return toResponse(comment, users, Set.of(), targets, List.of());
    }

    @Override
    @Transactional
    public void deleteOwnComment(Long experimentId, Long commentId, Long userId) {
        ExperimentComment comment = requireComment(commentId, experimentId);
        if (!Objects.equals(comment.getUserId(), userId)) {
            throw new ApiException(403, "仅可删除自己的评论");
        }
        softDeleteVisible(comment);
    }

    @Override
    @Transactional
    public void likeComment(Long experimentId, Long commentId, Long userId) {
        ExperimentComment comment = requireVisibleComment(commentId, experimentId);
        boolean exists = likeMapper.selectCount(new LambdaQueryWrapper<ExperimentCommentLike>()
                .eq(ExperimentCommentLike::getCommentId, commentId)
                .eq(ExperimentCommentLike::getUserId, userId)) > 0;
        if (exists) {
            return;
        }
        ExperimentCommentLike like = new ExperimentCommentLike();
        like.setCommentId(commentId);
        like.setUserId(userId);
        likeMapper.insert(like);
        lambdaUpdate()
                .eq(ExperimentComment::getId, comment.getId())
                .setSql("like_count = like_count + 1")
                .update();
    }

    @Override
    @Transactional
    public void unlikeComment(Long experimentId, Long commentId, Long userId) {
        requireComment(commentId, experimentId);
        ExperimentCommentLike like = likeMapper.selectOne(new LambdaQueryWrapper<ExperimentCommentLike>()
                .eq(ExperimentCommentLike::getCommentId, commentId)
                .eq(ExperimentCommentLike::getUserId, userId));
        if (like == null) {
            return;
        }
        likeMapper.deleteById(like.getId());
        lambdaUpdate()
                .eq(ExperimentComment::getId, commentId)
                .gt(ExperimentComment::getLikeCount, 0)
                .setSql("like_count = like_count - 1")
                .update();
    }

    @Override
    public PageResponse<AdminCommentResponse> adminPage(
            Long experimentId, Long userId, String status, String keyword, long page, long pageSize) {
        LambdaQueryWrapper<ExperimentComment> wrapper = new LambdaQueryWrapper<ExperimentComment>()
                .eq(experimentId != null, ExperimentComment::getExperimentId, experimentId)
                .eq(userId != null, ExperimentComment::getUserId, userId)
                .eq(StringUtils.hasText(status), ExperimentComment::getStatus, status)
                .like(StringUtils.hasText(keyword), ExperimentComment::getContent, keyword)
                .orderByDesc(ExperimentComment::getCreateTime);

        Page<ExperimentComment> result = page(new Page<>(page, pageSize), wrapper);
        return new PageResponse<>(
                toAdminComments(result.getRecords()),
                result.getTotal(),
                result.getCurrent(),
                result.getSize());
    }

    @Override
    @Transactional
    public void adminUpdateStatus(Long commentId, String status) {
        if (!STATUS_VISIBLE.equals(status) && !STATUS_HIDDEN.equals(status)) {
            throw new ApiException(400, "status 仅支持 VISIBLE 或 HIDDEN");
        }
        ExperimentComment comment = getById(commentId);
        if (comment == null || STATUS_DELETED.equals(comment.getStatus())) {
            throw new ApiException(404, "评论不存在");
        }
        String prev = comment.getStatus();
        if (prev.equals(status)) {
            return;
        }

        if (STATUS_VISIBLE.equals(prev) && STATUS_HIDDEN.equals(status)) {
            int delta = countVisibleSubtree(comment);
            comment.setStatus(status);
            updateById(comment);
            if (isRoot(comment)) {
                hideReplies(comment.getId());
            }
            adjustCommentCount(comment.getExperimentId(), -delta);
        } else if (STATUS_HIDDEN.equals(prev) && STATUS_VISIBLE.equals(status)) {
            comment.setStatus(status);
            updateById(comment);
            if (isRoot(comment)) {
                restoreHiddenReplies(comment.getId());
            }
            ExperimentComment refreshed = getById(commentId);
            adjustCommentCount(
                    comment.getExperimentId(),
                    countVisibleSubtree(refreshed != null ? refreshed : comment));
        } else {
            comment.setStatus(status);
            updateById(comment);
        }
    }

    @Override
    @Transactional
    public void adminDelete(Long commentId) {
        ExperimentComment comment = getById(commentId);
        if (comment == null || STATUS_DELETED.equals(comment.getStatus())) {
            return;
        }
        softDeleteVisible(comment);
    }

    @Override
    public PageResponse<AdminCommentLikeResponse> adminLikePage(
            Long commentId, Long userId, Long experimentId, long page, long pageSize) {
        LambdaQueryWrapper<ExperimentCommentLike> wrapper = new LambdaQueryWrapper<ExperimentCommentLike>()
                .eq(commentId != null, ExperimentCommentLike::getCommentId, commentId)
                .eq(userId != null, ExperimentCommentLike::getUserId, userId)
                .orderByDesc(ExperimentCommentLike::getCreateTime);

        if (experimentId != null) {
            List<Long> commentIds = list(new LambdaQueryWrapper<ExperimentComment>()
                    .eq(ExperimentComment::getExperimentId, experimentId)
                    .select(ExperimentComment::getId))
                    .stream()
                    .map(ExperimentComment::getId)
                    .toList();
            if (commentIds.isEmpty()) {
                return new PageResponse<>(List.of(), 0, page, pageSize);
            }
            wrapper.in(ExperimentCommentLike::getCommentId, commentIds);
        }

        Page<ExperimentCommentLike> result = likeMapper.selectPage(new Page<>(page, pageSize), wrapper);
        List<ExperimentCommentLike> likes = result.getRecords();
        if (likes.isEmpty()) {
            return new PageResponse<>(List.of(), result.getTotal(), result.getCurrent(), result.getSize());
        }

        Set<Long> cIds = likes.stream().map(ExperimentCommentLike::getCommentId).collect(Collectors.toSet());
        Set<Long> uIds = likes.stream().map(ExperimentCommentLike::getUserId).collect(Collectors.toSet());
        Map<Long, ExperimentComment> comments = listByIds(cIds).stream()
                .collect(Collectors.toMap(ExperimentComment::getId, c -> c));
        Set<Long> expIds = comments.values().stream().map(ExperimentComment::getExperimentId).collect(Collectors.toSet());
        Map<Long, Experiment> experiments = experimentService.listByIds(expIds).stream()
                .collect(Collectors.toMap(Experiment::getId, e -> e));
        Map<Long, User> users = loadUsers(uIds);

        List<AdminCommentLikeResponse> records = likes.stream().map(like -> {
            ExperimentComment c = comments.get(like.getCommentId());
            Experiment exp = c != null ? experiments.get(c.getExperimentId()) : null;
            User u = users.get(like.getUserId());
            String content = c != null ? c.getContent() : "";
            if (content.length() > 80) {
                content = content.substring(0, 80) + "…";
            }
            return AdminCommentLikeResponse.builder()
                    .id(like.getId())
                    .commentId(like.getCommentId())
                    .commentContent(content)
                    .experimentId(c != null ? c.getExperimentId() : null)
                    .experimentTitle(exp != null ? exp.getTitle() : null)
                    .userId(like.getUserId())
                    .username(u != null ? u.getUsername() : null)
                    .nickname(u != null ? u.getNickname() : null)
                    .createTime(like.getCreateTime())
                    .build();
        }).toList();

        return new PageResponse<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    @Transactional
    public void adminDeleteLike(Long likeId) {
        ExperimentCommentLike like = likeMapper.selectById(likeId);
        if (like == null) {
            return;
        }
        likeMapper.deleteById(likeId);
        lambdaUpdate()
                .eq(ExperimentComment::getId, like.getCommentId())
                .gt(ExperimentComment::getLikeCount, 0)
                .setSql("like_count = like_count - 1")
                .update();
    }

    private static boolean isRoot(ExperimentComment comment) {
        return comment.getRootId() == null;
    }

    private void softDeleteVisible(ExperimentComment comment) {
        if (STATUS_DELETED.equals(comment.getStatus())) {
            return;
        }
        int delta = 0;
        if (STATUS_VISIBLE.equals(comment.getStatus())) {
            delta = countVisibleSubtree(comment);
        }
        comment.setStatus(STATUS_DELETED);
        updateById(comment);

        if (isRoot(comment)) {
            List<ExperimentComment> replies = list(new LambdaQueryWrapper<ExperimentComment>()
                    .eq(ExperimentComment::getRootId, comment.getId())
                    .ne(ExperimentComment::getStatus, STATUS_DELETED));
            for (ExperimentComment reply : replies) {
                reply.setStatus(STATUS_DELETED);
                updateById(reply);
            }
        }

        if (delta > 0) {
            adjustCommentCount(comment.getExperimentId(), -delta);
        }
    }

    private int countVisibleSubtree(ExperimentComment comment) {
        if (!STATUS_VISIBLE.equals(comment.getStatus())) {
            return 0;
        }
        int count = 1;
        if (isRoot(comment)) {
            count += (int) count(new LambdaQueryWrapper<ExperimentComment>()
                    .eq(ExperimentComment::getRootId, comment.getId())
                    .eq(ExperimentComment::getStatus, STATUS_VISIBLE));
        }
        return count;
    }

    private void hideReplies(Long rootId) {
        List<ExperimentComment> replies = list(new LambdaQueryWrapper<ExperimentComment>()
                .eq(ExperimentComment::getRootId, rootId)
                .eq(ExperimentComment::getStatus, STATUS_VISIBLE));
        for (ExperimentComment reply : replies) {
            reply.setStatus(STATUS_HIDDEN);
            updateById(reply);
        }
    }

    private void restoreHiddenReplies(Long rootId) {
        List<ExperimentComment> replies = list(new LambdaQueryWrapper<ExperimentComment>()
                .eq(ExperimentComment::getRootId, rootId)
                .eq(ExperimentComment::getStatus, STATUS_HIDDEN));
        for (ExperimentComment reply : replies) {
            reply.setStatus(STATUS_VISIBLE);
            updateById(reply);
        }
    }

    private void adjustCommentCount(Long experimentId, int delta) {
        if (delta == 0) {
            return;
        }
        if (delta > 0) {
            experimentService.lambdaUpdate()
                    .eq(Experiment::getId, experimentId)
                    .setSql("comment_count = comment_count + " + delta)
                    .update();
        } else {
            experimentService.lambdaUpdate()
                    .eq(Experiment::getId, experimentId)
                    .setSql("comment_count = GREATEST(comment_count - " + (-delta) + ", 0)")
                    .update();
        }
    }

    private Experiment requirePublished(Long experimentId) {
        Experiment experiment = experimentService.getById(experimentId);
        if (experiment == null) {
            throw new ApiException(404, "实验不存在");
        }
        if (experiment.getStatus() != ExperimentStatus.PUBLISHED) {
            throw new ApiException(400, "仅可对已发布实验评论");
        }
        return experiment;
    }

    private ExperimentComment requireComment(Long commentId, Long experimentId) {
        ExperimentComment comment = getById(commentId);
        if (comment == null || !Objects.equals(comment.getExperimentId(), experimentId)) {
            throw new ApiException(404, "评论不存在");
        }
        return comment;
    }

    private ExperimentComment requireVisibleComment(Long commentId, Long experimentId) {
        ExperimentComment comment = requireComment(commentId, experimentId);
        if (!STATUS_VISIBLE.equals(comment.getStatus())) {
            throw new ApiException(404, "评论不存在");
        }
        return comment;
    }

    private Map<Long, User> loadUsers(Set<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userService.listByIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private static Map<Long, User> mergeUsers(Map<Long, User> a, Map<Long, User> b) {
        if (b.isEmpty()) {
            return a;
        }
        if (a.isEmpty()) {
            return b;
        }
        java.util.HashMap<Long, User> merged = new java.util.HashMap<>(a);
        merged.putAll(b);
        return merged;
    }

    private Map<Long, ExperimentComment> loadReplyTargets(List<ExperimentComment> replies) {
        Set<Long> ids = replies.stream()
                .map(ExperimentComment::getReplyToId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        return listByIds(ids).stream().collect(Collectors.toMap(ExperimentComment::getId, c -> c));
    }

    private Set<Long> findLikedCommentIds(Long userId, Set<Long> commentIds) {
        if (userId == null || commentIds.isEmpty()) {
            return Set.of();
        }
        return likeMapper.selectList(new LambdaQueryWrapper<ExperimentCommentLike>()
                        .eq(ExperimentCommentLike::getUserId, userId)
                        .in(ExperimentCommentLike::getCommentId, commentIds))
                .stream()
                .map(ExperimentCommentLike::getCommentId)
                .collect(Collectors.toSet());
    }

    private CommentResponse toResponse(
            ExperimentComment comment,
            Map<Long, User> users,
            Set<Long> likedIds,
            Map<Long, ExperimentComment> replyTargets,
            List<CommentResponse> replies) {
        User user = users.get(comment.getUserId());
        ExperimentComment target =
                comment.getReplyToId() != null && replyTargets != null
                        ? replyTargets.get(comment.getReplyToId())
                        : null;
        User replyToUser = target != null ? users.get(target.getUserId()) : null;
        // 回复一级时不必展示「回复 @楼主」；仅楼内互回展示
        boolean showReplyTo =
                target != null
                        && comment.getRootId() != null
                        && !Objects.equals(comment.getReplyToId(), comment.getRootId());

        return CommentResponse.builder()
                .id(comment.getId())
                .experimentId(comment.getExperimentId())
                .userId(comment.getUserId())
                .nickname(user != null ? user.getNickname() : null)
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .rootId(comment.getRootId())
                .replyToId(comment.getReplyToId())
                .replyToUserId(showReplyTo && target != null ? target.getUserId() : null)
                .replyToNickname(showReplyTo && replyToUser != null ? replyToUser.getNickname() : null)
                .content(comment.getContent())
                .likeCount(comment.getLikeCount() != null ? comment.getLikeCount() : 0L)
                .liked(likedIds.contains(comment.getId()))
                .createTime(comment.getCreateTime())
                .replies(replies != null ? replies : List.of())
                .build();
    }

    private List<AdminCommentResponse> toAdminComments(List<ExperimentComment> comments) {
        if (comments.isEmpty()) {
            return List.of();
        }
        Set<Long> userIds = comments.stream().map(ExperimentComment::getUserId).collect(Collectors.toSet());
        Set<Long> expIds = comments.stream().map(ExperimentComment::getExperimentId).collect(Collectors.toSet());
        Map<Long, User> users = loadUsers(userIds);
        Map<Long, Experiment> experiments = experimentService.listByIds(expIds).stream()
                .collect(Collectors.toMap(Experiment::getId, e -> e));

        List<AdminCommentResponse> list = new ArrayList<>();
        for (ExperimentComment c : comments) {
            User u = users.get(c.getUserId());
            Experiment e = experiments.get(c.getExperimentId());
            list.add(AdminCommentResponse.builder()
                    .id(c.getId())
                    .experimentId(c.getExperimentId())
                    .experimentTitle(e != null ? e.getTitle() : null)
                    .experimentRoute(e != null ? e.getRoute() : null)
                    .userId(c.getUserId())
                    .username(u != null ? u.getUsername() : null)
                    .nickname(u != null ? u.getNickname() : null)
                    .rootId(c.getRootId())
                    .replyToId(c.getReplyToId())
                    .content(c.getContent())
                    .likeCount(c.getLikeCount())
                    .status(c.getStatus())
                    .createTime(c.getCreateTime())
                    .updateTime(c.getUpdateTime())
                    .build());
        }
        return list;
    }
}
