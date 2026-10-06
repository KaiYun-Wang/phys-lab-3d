package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.wky.backend.config.ReadOnlyMode;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.ExperimentView;
import com.wky.backend.mapper.ExperimentMapper;
import com.wky.backend.mapper.ExperimentViewMapper;
import com.wky.backend.service.IExperimentViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ExperimentViewServiceImpl implements IExperimentViewService {

    private final ExperimentViewMapper experimentViewMapper;
    private final ExperimentMapper experimentMapper;
    private final ReadOnlyMode readOnlyMode;

    @Override
    @Transactional
    public void recordView(Long experimentId, Long userId) {
        if (readOnlyMode.enabled()) {
            // 只读体验（演示版本）：GET 详情触发的浏览计数不落库
            return;
        }
        ExperimentView row = new ExperimentView();
        row.setExperimentId(experimentId);
        row.setUserId(userId);
        row.setViewedAt(LocalDateTime.now());
        experimentViewMapper.insert(row);

        experimentMapper.update(
                null,
                new LambdaUpdateWrapper<Experiment>()
                        .eq(Experiment::getId, experimentId)
                        .setSql("view_count = view_count + 1"));
    }

    @Override
    public long countToday() {
        LocalDate today = LocalDate.now();
        return experimentViewMapper.countBetween(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
    }
}
