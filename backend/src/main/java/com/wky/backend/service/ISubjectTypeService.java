package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.CreateSubjectTypeRequest;
import com.wky.backend.domain.dto.SubjectTypeResponse;
import com.wky.backend.domain.dto.UpdateSubjectTypeRequest;
import com.wky.backend.domain.entity.SubjectType;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface ISubjectTypeService extends IService<SubjectType> {

    List<SubjectTypeResponse> listAll();

    SubjectTypeResponse getByIdOrThrow(Long id);

    SubjectType requireById(Long id);

    Map<Long, String> labelMapByIds(Collection<Long> ids);

    SubjectTypeResponse create(CreateSubjectTypeRequest request);

    SubjectTypeResponse update(Long id, UpdateSubjectTypeRequest request);

    void delete(Long id);
}
