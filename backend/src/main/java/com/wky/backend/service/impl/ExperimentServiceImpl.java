package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.CreateExperimentRequest;
import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateExperimentRequest;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.SubjectType;
import com.wky.backend.enums.ExperimentStatus;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.ExperimentMapper;
import com.wky.backend.service.IExperimentFavoriteService;
import com.wky.backend.service.IExperimentService;
import com.wky.backend.service.ISubjectTypeService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ExperimentServiceImpl extends ServiceImpl<ExperimentMapper, Experiment> implements IExperimentService {

    private final IExperimentFavoriteService favoriteService;
    private final ISubjectTypeService subjectTypeService;

    public ExperimentServiceImpl(
            @Lazy IExperimentFavoriteService favoriteService,
            ISubjectTypeService subjectTypeService) {
        this.favoriteService = favoriteService;
        this.subjectTypeService = subjectTypeService;
    }

    @Override
    public List<ExperimentResponse> listPublished(String q, Long userId) {
        LambdaQueryWrapper<Experiment> wrapper = publishedWrapper(q);
        wrapper.orderByAsc(Experiment::getId);
        List<Experiment> experiments = list(wrapper);
        return toResponses(experiments, userId);
    }

    @Override
    public ExperimentResponse getPublishedByRoute(String route, Long userId) {
        Experiment experiment = getOne(new LambdaQueryWrapper<Experiment>()
                .eq(Experiment::getRoute, route)
                .eq(Experiment::getStatus, ExperimentStatus.PUBLISHED));
        if (experiment == null) {
            throw new ApiException(404, "实验不存在");
        }
        Boolean favorited = resolveFavorited(userId, experiment.getId());
        return toResponse(experiment, favorited);
    }

    @Override
    public PageResponse<ExperimentResponse> adminPage(String q, String status, long page, long pageSize) {
        LambdaQueryWrapper<Experiment> wrapper = new LambdaQueryWrapper<>();
        applySearch(wrapper, q);
        if (StringUtils.hasText(status)) {
            wrapper.eq(Experiment::getStatus, ExperimentStatus.fromValue(status));
        }
        wrapper.orderByDesc(Experiment::getUpdateTime).orderByDesc(Experiment::getId);

        Page<Experiment> result = page(new Page<>(page, pageSize), wrapper);
        List<ExperimentResponse> records = toResponses(result.getRecords(), null);
        return new PageResponse<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    public ExperimentResponse adminGetById(Long id) {
        return toResponse(requireExperiment(id), null);
    }

    @Override
    @Transactional
    public ExperimentResponse adminCreate(CreateExperimentRequest request) {
        if (count(new LambdaQueryWrapper<Experiment>().eq(Experiment::getRoute, request.getRoute())) > 0) {
            throw new ApiException(409, "route 已存在");
        }

        SubjectType subjectType = subjectTypeService.requireById(request.getSubjectTypeId());

        Experiment experiment = new Experiment();
        experiment.setRoute(request.getRoute());
        experiment.setTitle(request.getTitle());
        experiment.setSubjectTypeId(subjectType.getId());
        experiment.setSubjectType(subjectType.getCode());
        experiment.setDescription(request.getDescription());
        experiment.setCoverUrl(normalizeCoverUrl(request.getCoverUrl()));
        experiment.setTopics(normalizeTopics(request.getTopics()));
        experiment.setStatus(request.getStatus() != null ? request.getStatus() : ExperimentStatus.PUBLISHED);
        experiment.setVisitorCount(0L);
        experiment.setFavoriteCount(0L);
        experiment.setViewCount(0L);
        experiment.setCommentCount(0L);
        save(experiment);
        return toResponse(experiment, null);
    }

    @Override
    @Transactional
    public ExperimentResponse adminUpdate(Long id, UpdateExperimentRequest request) {
        Experiment experiment = requireExperiment(id);
        SubjectType subjectType = subjectTypeService.requireById(request.getSubjectTypeId());

        experiment.setTitle(request.getTitle());
        experiment.setSubjectTypeId(subjectType.getId());
        experiment.setSubjectType(subjectType.getCode());
        experiment.setDescription(request.getDescription());
        experiment.setCoverUrl(normalizeCoverUrl(request.getCoverUrl()));
        experiment.setTopics(normalizeTopics(request.getTopics()));
        experiment.setStatus(request.getStatus());
        updateById(experiment);
        return toResponse(experiment, null);
    }

    @Override
    @Transactional
    public void adminDelete(Long id) {
        if (!removeById(id)) {
            throw new ApiException(404, "实验不存在");
        }
    }

    @Override
    public long countAll() {
        return count();
    }

    @Override
    public ExperimentResponse toResponse(Experiment experiment, Boolean favorited) {
        String label = subjectTypeService.labelMapByIds(List.of(experiment.getSubjectTypeId()))
                .get(experiment.getSubjectTypeId());
        return ExperimentResponse.from(experiment, label, favorited);
    }

    Experiment requireExperiment(Long id) {
        Experiment experiment = getById(id);
        if (experiment == null) {
            throw new ApiException(404, "实验不存在");
        }
        return experiment;
    }

    private List<ExperimentResponse> toResponses(List<Experiment> experiments, Long userId) {
        if (experiments.isEmpty()) {
            return List.of();
        }

        Map<Long, String> labelMap = subjectTypeService.labelMapByIds(
                experiments.stream().map(Experiment::getSubjectTypeId).collect(Collectors.toSet()));

        if (userId == null) {
            return experiments.stream()
                    .map(e -> ExperimentResponse.from(e, labelMap.get(e.getSubjectTypeId()), null))
                    .toList();
        }

        List<Long> ids = experiments.stream().map(Experiment::getId).toList();
        Set<Long> favoritedIds = favoriteService.findFavoritedExperimentIds(userId, ids);
        return experiments.stream()
                .map(e -> ExperimentResponse.from(e, labelMap.get(e.getSubjectTypeId()), favoritedIds.contains(e.getId())))
                .toList();
    }

    private Boolean resolveFavorited(Long userId, Long experimentId) {
        if (userId == null) {
            return null;
        }
        return favoriteService.findFavoritedExperimentIds(userId, List.of(experimentId))
                .contains(experimentId);
    }

    private static LambdaQueryWrapper<Experiment> publishedWrapper(String q) {
        LambdaQueryWrapper<Experiment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Experiment::getStatus, ExperimentStatus.PUBLISHED);
        applySearch(wrapper, q);
        return wrapper;
    }

    private static void applySearch(LambdaQueryWrapper<Experiment> wrapper, String q) {
        if (!StringUtils.hasText(q)) {
            return;
        }
        String keyword = q.trim();
        wrapper.and(w -> w.like(Experiment::getTitle, keyword)
                .or().like(Experiment::getDescription, keyword)
                .or().like(Experiment::getRoute, keyword));
    }

    private static List<String> normalizeTopics(List<String> topics) {
        return topics == null ? Collections.emptyList() : topics;
    }

    /** Store relative API path; accept legacy full URLs from older uploads. */
    private static String normalizeCoverUrl(String coverUrl) {
        if (!StringUtils.hasText(coverUrl)) {
            return coverUrl;
        }
        int idx = coverUrl.indexOf("/api/covers/");
        if (idx >= 0) {
            return coverUrl.substring(idx);
        }
        return coverUrl;
    }
}
