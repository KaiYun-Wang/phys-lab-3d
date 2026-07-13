package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.CreateExperimentRequest;
import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateExperimentRequest;
import com.wky.backend.domain.entity.Experiment;

import java.util.List;

public interface IExperimentService extends IService<Experiment> {

    List<ExperimentResponse> listPublished(String q, Long userId);

    ExperimentResponse getPublishedByRoute(String route, Long userId);

    PageResponse<ExperimentResponse> adminPage(String q, String status, long page, long pageSize);

    ExperimentResponse adminGetById(Long id);

    ExperimentResponse adminCreate(CreateExperimentRequest request);

    ExperimentResponse adminUpdate(Long id, UpdateExperimentRequest request);

    void adminDelete(Long id);

    long countAll();

    ExperimentResponse toResponse(Experiment experiment, Boolean favorited);
}
