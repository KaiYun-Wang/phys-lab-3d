package com.wky.backend.service;

public interface IExperimentViewService {

    /** 记录一次实验详情访问，并累加 experiments.view_count */
    void recordView(Long experimentId, Long userId);

    long countToday();
}
