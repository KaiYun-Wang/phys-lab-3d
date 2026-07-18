package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AdminFavoriteResponse;
import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.ExperimentFavorite;
import com.wky.backend.domain.entity.User;
import com.wky.backend.enums.ExperimentStatus;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.ExperimentFavoriteMapper;
import com.wky.backend.service.IExperimentFavoriteService;
import com.wky.backend.service.IExperimentService;
import com.wky.backend.service.IUserService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ExperimentFavoriteServiceImpl extends ServiceImpl<ExperimentFavoriteMapper, ExperimentFavorite>
        implements IExperimentFavoriteService {

    private final IExperimentService experimentService;
    private final IUserService userService;

    public ExperimentFavoriteServiceImpl(
            @Lazy IExperimentService experimentService,
            IUserService userService) {
        this.experimentService = experimentService;
        this.userService = userService;
    }

    @Override
    public List<ExperimentResponse> listFavorites(Long userId) {
        List<ExperimentFavorite> favorites = list(new LambdaQueryWrapper<ExperimentFavorite>()
                .eq(ExperimentFavorite::getUserId, userId)
                .orderByDesc(ExperimentFavorite::getCreateTime));
        if (favorites.isEmpty()) {
            return List.of();
        }
        List<Long> experimentIds = favorites.stream()
                .map(ExperimentFavorite::getExperimentId)
                .toList();
        var experimentMap = experimentService.listByIds(experimentIds).stream()
                .collect(java.util.stream.Collectors.toMap(Experiment::getId, e -> e));
        return experimentIds.stream()
                .map(experimentMap::get)
                .filter(java.util.Objects::nonNull)
                .map(e -> experimentService.toResponse(e, true))
                .toList();
    }

    @Override
    @Transactional
    public void addFavorite(Long userId, Long experimentId) {
        Experiment experiment = experimentService.getById(experimentId);
        if (experiment == null) {
            throw new ApiException(404, "实验不存在");
        }
        if (experiment.getStatus() != ExperimentStatus.PUBLISHED) {
            throw new ApiException(400, "仅可收藏已发布的实验");
        }

        boolean exists = count(new LambdaQueryWrapper<ExperimentFavorite>()
                .eq(ExperimentFavorite::getUserId, userId)
                .eq(ExperimentFavorite::getExperimentId, experimentId)) > 0;
        if (exists) {
            return;
        }

        ExperimentFavorite favorite = new ExperimentFavorite();
        favorite.setUserId(userId);
        favorite.setExperimentId(experimentId);
        save(favorite);

        experimentService.lambdaUpdate()
                .eq(Experiment::getId, experimentId)
                .setSql("favorite_count = favorite_count + 1")
                .update();
    }

    @Override
    @Transactional
    public void removeFavorite(Long userId, Long experimentId) {
        ExperimentFavorite favorite = getOne(new LambdaQueryWrapper<ExperimentFavorite>()
                .eq(ExperimentFavorite::getUserId, userId)
                .eq(ExperimentFavorite::getExperimentId, experimentId));
        if (favorite == null) {
            return;
        }

        removeById(favorite.getId());
        experimentService.lambdaUpdate()
                .eq(Experiment::getId, experimentId)
                .gt(Experiment::getFavoriteCount, 0)
                .setSql("favorite_count = favorite_count - 1")
                .update();
    }

    @Override
    public Set<Long> findFavoritedExperimentIds(Long userId, List<Long> experimentIds) {
        if (userId == null || experimentIds.isEmpty()) {
            return Set.of();
        }
        List<ExperimentFavorite> favorites = list(new LambdaQueryWrapper<ExperimentFavorite>()
                .eq(ExperimentFavorite::getUserId, userId)
                .in(ExperimentFavorite::getExperimentId, experimentIds));
        Set<Long> ids = new HashSet<>();
        for (ExperimentFavorite favorite : favorites) {
            ids.add(favorite.getExperimentId());
        }
        return ids;
    }

    @Override
    public PageResponse<AdminFavoriteResponse> adminPage(
            String keyword, Long experimentId, Long userId, long page, long pageSize) {
        Set<Long> userIdFilter = null;
        Set<Long> experimentIdFilter = null;

        if (StringUtils.hasText(keyword)) {
            List<User> matchedUsers = userService.list(new LambdaQueryWrapper<User>()
                    .like(User::getUsername, keyword)
                    .or()
                    .like(User::getNickname, keyword));
            List<Experiment> matchedExps = experimentService.list(new LambdaQueryWrapper<Experiment>()
                    .like(Experiment::getTitle, keyword)
                    .or()
                    .like(Experiment::getRoute, keyword));
            userIdFilter = matchedUsers.stream().map(User::getId).collect(Collectors.toSet());
            experimentIdFilter = matchedExps.stream().map(Experiment::getId).collect(Collectors.toSet());
            if (userIdFilter.isEmpty() && experimentIdFilter.isEmpty()) {
                return new PageResponse<>(List.of(), 0, page, pageSize);
            }
        }

        LambdaQueryWrapper<ExperimentFavorite> wrapper = new LambdaQueryWrapper<ExperimentFavorite>()
                .eq(experimentId != null, ExperimentFavorite::getExperimentId, experimentId)
                .eq(userId != null, ExperimentFavorite::getUserId, userId)
                .orderByDesc(ExperimentFavorite::getCreateTime);

        if (userIdFilter != null) {
            Set<Long> uids = userIdFilter;
            Set<Long> eids = experimentIdFilter;
            wrapper.and(w -> {
                if (!uids.isEmpty()) {
                    w.in(ExperimentFavorite::getUserId, uids);
                }
                if (!eids.isEmpty()) {
                    if (!uids.isEmpty()) {
                        w.or();
                    }
                    w.in(ExperimentFavorite::getExperimentId, eids);
                }
            });
        }

        Page<ExperimentFavorite> result = page(new Page<>(page, pageSize), wrapper);
        List<ExperimentFavorite> favorites = result.getRecords();
        if (favorites.isEmpty()) {
            return new PageResponse<>(List.of(), result.getTotal(), result.getCurrent(), result.getSize());
        }

        Set<Long> uIds = favorites.stream().map(ExperimentFavorite::getUserId).collect(Collectors.toSet());
        Set<Long> eIds = favorites.stream().map(ExperimentFavorite::getExperimentId).collect(Collectors.toSet());
        Map<Long, User> users = userService.listByIds(uIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, Experiment> experiments = experimentService.listByIds(eIds).stream()
                .collect(Collectors.toMap(Experiment::getId, e -> e));

        List<AdminFavoriteResponse> records = favorites.stream().map(f -> {
            User u = users.get(f.getUserId());
            Experiment e = experiments.get(f.getExperimentId());
            return AdminFavoriteResponse.builder()
                    .id(f.getId())
                    .userId(f.getUserId())
                    .username(u != null ? u.getUsername() : null)
                    .nickname(u != null ? u.getNickname() : null)
                    .experimentId(f.getExperimentId())
                    .experimentTitle(e != null ? e.getTitle() : null)
                    .experimentRoute(e != null ? e.getRoute() : null)
                    .createTime(f.getCreateTime())
                    .build();
        }).toList();

        return new PageResponse<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    @Transactional
    public void adminRemove(Long favoriteId) {
        ExperimentFavorite favorite = getById(favoriteId);
        if (favorite == null) {
            return;
        }
        removeById(favoriteId);
        experimentService.lambdaUpdate()
                .eq(Experiment::getId, favorite.getExperimentId())
                .gt(Experiment::getFavoriteCount, 0)
                .setSql("favorite_count = favorite_count - 1")
                .update();
    }
}
