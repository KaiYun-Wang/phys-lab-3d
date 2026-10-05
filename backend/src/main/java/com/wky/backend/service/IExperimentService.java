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

    PageResponse<ExperimentResponse> adminPage(String q, String status, Long subjectTypeId, long page, long pageSize);

    ExperimentResponse adminGetById(Long id);

    ExperimentResponse adminCreate(CreateExperimentRequest request);

    ExperimentResponse adminUpdate(Long id, UpdateExperimentRequest request);

    void adminDelete(Long id);

    /** 首页展示排序：一次性保存全量顺序（按传入顺序重编号 0..n-1） */
    void adminReorder(List<Long> ids);

    long countAll();

    ExperimentResponse toResponse(Experiment experiment, Boolean favorited);
}
