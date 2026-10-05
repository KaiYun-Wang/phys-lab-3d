package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AdminCommentLikeResponse;
import com.wky.backend.domain.dto.AdminCommentResponse;
import com.wky.backend.domain.dto.AdminReplyCommentRequest;
import com.wky.backend.domain.dto.CommentResponse;
import com.wky.backend.domain.dto.CreateCommentRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.Admin;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.ExperimentComment;
import com.wky.backend.domain.entity.ExperimentCommentLike;
import com.wky.backend.domain.entity.User;
import com.wky.backend.enums.CommentOwnerType;
import com.wky.backend.enums.ExperimentStatus;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.AdminMapper;
import com.wky.backend.mapper.ExperimentCommentLikeMapper;
import com.wky.backend.mapper.ExperimentCommentMapper;
import com.wky.backend.service.IExperimentCommentService;
import com.wky.backend.service.IExperimentService;
import com.wky.backend.service.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
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
    private final AdminMapper adminMapper;
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

        // 「我的」=我参与过的楼层：我发的楼层 + 我在其下回复过的别人的楼层
        Set<Long> participatedRootIds = Set.of();
        if ("mine".equalsIgnoreCase(filter)) {
            if (currentUserId == null) {
                return new PageResponse<>(List.of(), 0, page, pageSize);
            }
            List<ExperimentComment> myReplies = list(new LambdaQueryWrapper<ExperimentComment>()
                    .eq(ExperimentComment::getExperimentId, experimentId)
                    .eq(ExperimentComment::getStatus, STATUS_VISIBLE)
                    .isNotNull(ExperimentComment::getRootId)
                    .eq(ExperimentComment::getOwnerType, CommentOwnerType.USER)
                    .eq(ExperimentComment::getOwnerId, currentUserId)
                    .select(ExperimentComment::getRootId));
            Set<Long> replyRootIds = myReplies.stream()
                    .map(ExperimentComment::getRootId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            wrapper.and(w -> {
                w.and(x -> x.eq(ExperimentComment::getOwnerType, CommentOwnerType.USER)
                        .eq(ExperimentComment::getOwnerId, currentUserId));
                if (!replyRootIds.isEmpty()) {
                    w.or().in(ExperimentComment::getId, replyRootIds);
                }
            });
            participatedRootIds = replyRootIds;
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

        List<ExperimentComment> all = new ArrayList<>(roots);
        all.addAll(replies);
        Map<Long, ExperimentComment> replyTargets = loadReplyTargets(replies);
        all.addAll(replyTargets.values());

        AuthorMaps authors = loadAuthors(all);
        Set<Long> commentIds = new HashSet<>();
        for (ExperimentComment c : roots) {
            commentIds.add(c.getId());
        }
        for (ExperimentComment c : replies) {
            commentIds.add(c.getId());
        }
        Set<Long> likedIds = findLikedCommentIds(currentUserId, commentIds);

        Map<Long, List<ExperimentComment>> repliesByRoot = replies.stream()
                .collect(Collectors.groupingBy(ExperimentComment::getRootId));

        final Set<Long> participated = participatedRootIds;
        List<CommentResponse> records = roots.stream()
                .map(root -> {
                    CommentResponse resp = toResponse(
                            root,
                            authors,
                            likedIds,
                            replyTargets,
                            repliesByRoot.getOrDefault(root.getId(), List.of()).stream()
                                    .map(r -> toResponse(r, authors, likedIds, replyTargets, null))
                                    .toList());
                    // 仅「我的」列表：楼层不是我发的但含我的回复时标注
                    boolean mineRoot = root.getOwnerType() == CommentOwnerType.USER
                            && Objects.equals(root.getOwnerId(), currentUserId);
                    if (participated.contains(root.getId()) && !mineRoot) {
                        resp.setParticipated(Boolean.TRUE);
                    }
                    return resp;
                })
                .toList();

        return new PageResponse<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    @Transactional
    public CommentResponse createComment(Long experimentId, Long userId, CreateCommentRequest request) {
        Experiment experiment = requirePublished(experimentId);
        String content = normalizeContent(request.getContent());

        Long rootId = null;
        Long replyToId = request.getReplyToId();
        ExperimentComment replyTarget = null;

        if (replyToId != null) {
            replyTarget = requireVisibleComment(replyToId, experimentId);
            rootId = replyTarget.getRootId() != null ? replyTarget.getRootId() : replyTarget.getId();
        }

        ExperimentComment comment = new ExperimentComment();
        comment.setExperimentId(experimentId);
        comment.setOwnerId(userId);
        comment.setOwnerType(CommentOwnerType.USER);
        comment.setRootId(rootId);
        comment.setReplyToId(replyToId);
        comment.setContent(content);
        comment.setLikeCount(0L);
        comment.setStatus(STATUS_VISIBLE);
        save(comment);

        bumpCommentCount(experiment.getId(), 1);

        List<ExperimentComment> forAuthors = new ArrayList<>();
        forAuthors.add(comment);
        if (replyTarget != null) {
            forAuthors.add(replyTarget);
        }
        AuthorMaps authors = loadAuthors(forAuthors);
        Map<Long, ExperimentComment> targets = replyTarget != null
                ? Map.of(replyTarget.getId(), replyTarget)
                : Map.of();
        return toResponse(comment, authors, Set.of(), targets, List.of());
    }

    @Override
    @Transactional
    public CommentResponse adminReply(Long adminId, AdminReplyCommentRequest request) {
        Long experimentId = request.getExperimentId();
        Experiment experiment = requirePublished(experimentId);
        String content = normalizeContent(request.getContent());

        ExperimentComment replyTarget = requireVisibleComment(request.getReplyToId(), experimentId);
        Long rootId = replyTarget.getRootId() != null ? replyTarget.getRootId() : replyTarget.getId();

        ExperimentComment comment = new ExperimentComment();
        comment.setExperimentId(experimentId);
        comment.setOwnerId(adminId);
        comment.setOwnerType(CommentOwnerType.ADMIN);
        comment.setRootId(rootId);
        comment.setReplyToId(replyTarget.getId());
        comment.setContent(content);
        comment.setLikeCount(0L);
        comment.setStatus(STATUS_VISIBLE);
        save(comment);

        bumpCommentCount(experiment.getId(), 1);

        AuthorMaps authors = loadAuthors(List.of(comment, replyTarget));
        return toResponse(comment, authors, Set.of(), Map.of(replyTarget.getId(), replyTarget), List.of());
    }

    @Override
    @Transactional
    public void deleteOwnComment(Long experimentId, Long commentId, Long userId) {
        ExperimentComment comment = requireComment(commentId, experimentId);
        if (comment.getOwnerType() != CommentOwnerType.USER
                || !Objects.equals(comment.getOwnerId(), userId)) {
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
            Long experimentId, Long ownerId, Integer ownerType, String status, String keyword,
            LocalDate from, LocalDate to, long page, long pageSize) {
        CommentOwnerType type = ownerType != null ? CommentOwnerType.fromValue(ownerType) : null;

        Set<Long> matchedUserIds = null;
        Set<Long> matchedAdminIds = null;
        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            matchedUserIds = userService.list(new LambdaQueryWrapper<User>()
                            .like(User::getUsername, kw)
                            .or()
                            .like(User::getNickname, kw))
                    .stream()
                    .map(User::getId)
                    .collect(Collectors.toSet());
            matchedAdminIds = adminMapper.selectList(new LambdaQueryWrapper<Admin>()
                            .like(Admin::getUsername, kw)
                            .or()
                            .like(Admin::getDisplayName, kw))
                    .stream()
                    .map(Admin::getId)
                    .collect(Collectors.toSet());
            if (matchedUserIds.isEmpty() && matchedAdminIds.isEmpty()) {
                return new PageResponse<>(List.of(), 0, page, pageSize);
            }
        }

        LambdaQueryWrapper<ExperimentComment> wrapper = new LambdaQueryWrapper<ExperimentComment>()
                .eq(experimentId != null, ExperimentComment::getExperimentId, experimentId)
                .eq(ownerId != null, ExperimentComment::getOwnerId, ownerId)
                .eq(type != null, ExperimentComment::getOwnerType, type)
                .eq(StringUtils.hasText(status), ExperimentComment::getStatus, status)
                .ge(from != null, ExperimentComment::getCreateTime, from != null ? from.atStartOfDay() : null)
                .lt(to != null, ExperimentComment::getCreateTime, to != null ? to.plusDays(1).atStartOfDay() : null)
                .orderByDesc(ExperimentComment::getCreateTime);

        if (matchedUserIds != null) {
            Set<Long> uids = matchedUserIds;
            Set<Long> aids = matchedAdminIds;
            wrapper.and(w -> {
                if (!uids.isEmpty() && !aids.isEmpty()) {
                    w.and(u -> u.eq(ExperimentComment::getOwnerType, CommentOwnerType.USER)
                                    .in(ExperimentComment::getOwnerId, uids))
                            .or(a -> a.eq(ExperimentComment::getOwnerType, CommentOwnerType.ADMIN)
                                    .in(ExperimentComment::getOwnerId, aids));
                } else if (!uids.isEmpty()) {
                    w.eq(ExperimentComment::getOwnerType, CommentOwnerType.USER)
                            .in(ExperimentComment::getOwnerId, uids);
                } else {
                    w.eq(ExperimentComment::getOwnerType, CommentOwnerType.ADMIN)
                            .in(ExperimentComment::getOwnerId, aids);
                }
            });
        }

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
            bumpCommentCount(comment.getExperimentId(), -delta);
        } else if (STATUS_HIDDEN.equals(prev) && STATUS_VISIBLE.equals(status)) {
            comment.setStatus(status);
            updateById(comment);
            if (isRoot(comment)) {
                restoreHiddenReplies(comment.getId());
            }
            ExperimentComment refreshed = getById(commentId);
            bumpCommentCount(
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
            String keyword, LocalDate from, LocalDate to, long page, long pageSize) {
        LambdaQueryWrapper<ExperimentCommentLike> wrapper = new LambdaQueryWrapper<ExperimentCommentLike>()
                .ge(from != null, ExperimentCommentLike::getCreateTime, from != null ? from.atStartOfDay() : null)
                .lt(to != null, ExperimentCommentLike::getCreateTime, to != null ? to.plusDays(1).atStartOfDay() : null)
                .orderByDesc(ExperimentCommentLike::getCreateTime);

        if (StringUtils.hasText(keyword)) {
            String kw = keyword.trim();
            List<Long> userIds = userService.list(new LambdaQueryWrapper<User>()
                            .like(User::getUsername, kw)
                            .or()
                            .like(User::getNickname, kw))
                    .stream()
                    .map(User::getId)
                    .toList();
            List<Long> expIds = experimentService.list(new LambdaQueryWrapper<Experiment>()
                            .like(Experiment::getTitle, kw))
                    .stream()
                    .map(Experiment::getId)
                    .toList();
            List<Long> commentIds = expIds.isEmpty()
                    ? List.of()
                    : list(new LambdaQueryWrapper<ExperimentComment>()
                            .in(ExperimentComment::getExperimentId, expIds)
                            .select(ExperimentComment::getId))
                    .stream()
                    .map(ExperimentComment::getId)
                    .toList();
            if (userIds.isEmpty() && commentIds.isEmpty()) {
                return new PageResponse<>(List.of(), 0, page, pageSize);
            }
            wrapper.and(w -> {
                if (!userIds.isEmpty() && !commentIds.isEmpty()) {
                    w.in(ExperimentCommentLike::getUserId, userIds)
                            .or()
                            .in(ExperimentCommentLike::getCommentId, commentIds);
                } else if (!userIds.isEmpty()) {
                    w.in(ExperimentCommentLike::getUserId, userIds);
                } else {
                    w.in(ExperimentCommentLike::getCommentId, commentIds);
                }
            });
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

    private static String normalizeContent(String raw) {
        String content = raw == null ? "" : raw.trim();
        if (content.isEmpty() || content.length() > 1000) {
            throw new ApiException(400, "评论内容须为 1–1000 字");
        }
        return content;
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
            bumpCommentCount(comment.getExperimentId(), -delta);
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

    private void bumpCommentCount(Long experimentId, int delta) {
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

    private Map<Long, Admin> loadAdmins(Set<Long> adminIds) {
        if (adminIds.isEmpty()) {
            return Map.of();
        }
        return adminMapper.selectList(new LambdaQueryWrapper<Admin>().in(Admin::getId, adminIds)).stream()
                .collect(Collectors.toMap(Admin::getId, a -> a));
    }

    private AuthorMaps loadAuthors(List<ExperimentComment> comments) {
        Set<Long> userIds = new HashSet<>();
        Set<Long> adminIds = new HashSet<>();
        for (ExperimentComment c : comments) {
            if (c.getOwnerType() == CommentOwnerType.ADMIN) {
                adminIds.add(c.getOwnerId());
            } else if (c.getOwnerId() != null) {
                userIds.add(c.getOwnerId());
            }
        }
        return new AuthorMaps(loadUsers(userIds), loadAdmins(adminIds));
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
            AuthorMaps authors,
            Set<Long> likedIds,
            Map<Long, ExperimentComment> replyTargets,
            List<CommentResponse> replies) {
        AuthorView author = authors.resolve(comment.getOwnerType(), comment.getOwnerId());
        ExperimentComment target =
                comment.getReplyToId() != null && replyTargets != null
                        ? replyTargets.get(comment.getReplyToId())
                        : null;
        AuthorView replyToAuthor =
                target != null ? authors.resolve(target.getOwnerType(), target.getOwnerId()) : null;
        boolean showReplyTo =
                target != null
                        && comment.getRootId() != null
                        && !Objects.equals(comment.getReplyToId(), comment.getRootId());

        return CommentResponse.builder()
                .id(comment.getId())
                .experimentId(comment.getExperimentId())
                .ownerId(comment.getOwnerId())
                .ownerType(comment.getOwnerType() != null ? comment.getOwnerType().getCode() : null)
                .nickname(author != null ? author.nickname() : null)
                .avatarUrl(author != null ? author.avatarUrl() : null)
                .rootId(comment.getRootId())
                .replyToId(comment.getReplyToId())
                .replyToOwnerId(showReplyTo && target != null ? target.getOwnerId() : null)
                .replyToOwnerType(
                        showReplyTo && target != null && target.getOwnerType() != null
                                ? target.getOwnerType().getCode()
                                : null)
                .replyToNickname(showReplyTo && replyToAuthor != null ? replyToAuthor.nickname() : null)
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
        AuthorMaps authors = loadAuthors(comments);
        Set<Long> expIds = comments.stream().map(ExperimentComment::getExperimentId).collect(Collectors.toSet());
        Map<Long, Experiment> experiments = experimentService.listByIds(expIds).stream()
                .collect(Collectors.toMap(Experiment::getId, e -> e));

        List<AdminCommentResponse> list = new ArrayList<>();
        for (ExperimentComment c : comments) {
            AuthorView a = authors.resolve(c.getOwnerType(), c.getOwnerId());
            Experiment e = experiments.get(c.getExperimentId());
            list.add(AdminCommentResponse.builder()
                    .id(c.getId())
                    .experimentId(c.getExperimentId())
                    .experimentTitle(e != null ? e.getTitle() : null)
                    .experimentRoute(e != null ? e.getRoute() : null)
                    .ownerId(c.getOwnerId())
                    .ownerType(c.getOwnerType() != null ? c.getOwnerType().getCode() : null)
                    .username(a != null ? a.username() : null)
                    .nickname(a != null ? a.nickname() : null)
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

    private record AuthorView(String nickname, String username, String avatarUrl) {}

    private record AuthorMaps(Map<Long, User> users, Map<Long, Admin> admins) {
        AuthorView resolve(CommentOwnerType type, Long id) {
            if (type == null || id == null) {
                return null;
            }
            if (type.isAdmin()) {
                Admin admin = admins.get(id);
                if (admin == null) {
                    return null;
                }
                return new AuthorView(admin.getDisplayName(), admin.getUsername(), null);
            }
            User user = users.get(id);
            if (user == null) {
                return null;
            }
            return new AuthorView(user.getNickname(), user.getUsername(), user.getAvatarUrl());
        }
    }
}
