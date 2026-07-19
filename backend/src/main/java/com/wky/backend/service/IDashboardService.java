package com.wky.backend.service;

import com.wky.backend.domain.dto.DashboardAnalyticsResponse;
import com.wky.backend.domain.dto.DashboardSummaryResponse;

public interface IDashboardService {

    DashboardSummaryResponse summary();

    DashboardAnalyticsResponse analytics(int days);
}
