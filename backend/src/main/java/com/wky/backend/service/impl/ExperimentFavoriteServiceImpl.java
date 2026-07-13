package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.ExperimentFavorite;
import com.wky.backend.enums.ExperimentStatus;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.ExperimentFavoriteMapper;
import com.wky.backend.service.IExperimentFavoriteService;
import com.wky.backend.service.IExperimentService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ExperimentFavoriteServiceImpl extends ServiceImpl<ExperimentFavoriteMapper, ExperimentFavorite>
        implements IExperimentFavoriteService {

    private final IExperimentService experimentService;

    public ExperimentFavoriteServiceImpl(@Lazy IExperimentService experimentService) {
        this.experimentService = experimentService;
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
}
