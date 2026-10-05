package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.CreateSubjectTypeRequest;
import com.wky.backend.domain.dto.SubjectTypeCountRow;
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
        Map<Long, Long> experimentCountBySubjectTypeId = experimentMapper.countBySubjectTypeId().stream()
                .collect(Collectors.toMap(SubjectTypeCountRow::getSubjectTypeId, SubjectTypeCountRow::getCnt));
        return list(new LambdaQueryWrapper<SubjectType>()
                .orderByAsc(SubjectType::getSortOrder)
                .orderByAsc(SubjectType::getId))
                .stream()
                .map(subjectType -> SubjectTypeResponse.from(
                        subjectType, experimentCountBySubjectTypeId.getOrDefault(subjectType.getId(), 0L)))
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
        subjectType.setSortOrder(nextSortOrder());
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

    @Override
    @Transactional
    public void adminReorder(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new ApiException(400, "排序列表不能为空");
        }
        if (ids.stream().distinct().count() != ids.size()) {
            throw new ApiException(400, "排序列表存在重复 id");
        }
        if (ids.size() != count()) {
            throw new ApiException(409, "排序列表与学科分类总数不一致，请刷新后重试");
        }
        // 单条 SQL 原子覆盖（unnest + ORDINALITY）；不经过实体更新，update_time 不会被刷
        baseMapper.updateSortOrder(ids.stream().map(String::valueOf).collect(Collectors.joining(",")));
    }

    private int nextSortOrder() {
        SubjectType last = getOne(new LambdaQueryWrapper<SubjectType>()
                .orderByDesc(SubjectType::getSortOrder)
                .orderByDesc(SubjectType::getId)
                .last("LIMIT 1"));
        return last == null || last.getSortOrder() == null ? 0 : last.getSortOrder() + 1;
    }
}
