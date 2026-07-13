package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.CreateSubjectTypeRequest;
import com.wky.backend.domain.dto.SubjectTypeResponse;
import com.wky.backend.domain.dto.UpdateSubjectTypeRequest;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.SubjectType;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.ExperimentMapper;
import com.wky.backend.mapper.SubjectTypeMapper;
import com.wky.backend.service.ISubjectTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectTypeServiceImpl extends ServiceImpl<SubjectTypeMapper, SubjectType> implements ISubjectTypeService {

    private final ExperimentMapper experimentMapper;

    @Override
    public List<SubjectTypeResponse> listAll() {
        return list(new LambdaQueryWrapper<SubjectType>()
                .orderByAsc(SubjectType::getSortOrder)
                .orderByAsc(SubjectType::getId))
                .stream()
                .map(SubjectTypeResponse::from)
                .toList();
    }

    @Override
    public SubjectTypeResponse getByIdOrThrow(Long id) {
        return SubjectTypeResponse.from(requireById(id));
    }

    @Override
    public SubjectType requireById(Long id) {
        SubjectType subjectType = getById(id);
        if (subjectType == null) {
            throw new ApiException(404, "学科类型不存在");
        }
        return subjectType;
    }

    @Override
    public Map<Long, String> labelMapByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return listByIds(ids).stream()
                .collect(Collectors.toMap(SubjectType::getId, SubjectType::getLabel));
    }

    @Override
    @Transactional
    public SubjectTypeResponse create(CreateSubjectTypeRequest request) {
        if (count(new LambdaQueryWrapper<SubjectType>().eq(SubjectType::getCode, request.getCode())) > 0) {
            throw new ApiException(409, "code 已存在");
        }

        SubjectType subjectType = new SubjectType();
        subjectType.setCode(request.getCode());
        subjectType.setLabel(request.getLabel());
        subjectType.setDescription(request.getDescription());
        subjectType.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        save(subjectType);
        return SubjectTypeResponse.from(subjectType);
    }

    @Override
    @Transactional
    public SubjectTypeResponse update(Long id, UpdateSubjectTypeRequest request) {
        SubjectType subjectType = requireById(id);
        if (!subjectType.getCode().equals(request.getCode())
                && count(new LambdaQueryWrapper<SubjectType>().eq(SubjectType::getCode, request.getCode())) > 0) {
            throw new ApiException(409, "code 已存在");
        }

        String oldCode = subjectType.getCode();
        subjectType.setCode(request.getCode());
        subjectType.setLabel(request.getLabel());
        subjectType.setDescription(request.getDescription());
        if (request.getSortOrder() != null) {
            subjectType.setSortOrder(request.getSortOrder());
        }
        updateById(subjectType);

        if (!oldCode.equals(request.getCode())) {
            experimentMapper.update(null, new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<Experiment>()
                    .eq(Experiment::getSubjectTypeId, id)
                    .set(Experiment::getSubjectType, request.getCode()));
        }
        return SubjectTypeResponse.from(subjectType);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        requireById(id);
        if (experimentMapper.selectCount(new LambdaQueryWrapper<Experiment>()
                .eq(Experiment::getSubjectTypeId, id)) > 0) {
            throw new ApiException(409, "该学科下仍有实验，无法删除");
        }
        if (!removeById(id)) {
            throw new ApiException(404, "学科类型不存在");
        }
    }
}
