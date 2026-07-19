package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.DashboardAnalyticsResponse;
import com.wky.backend.domain.dto.DashboardSummaryResponse;
import com.wky.backend.service.IDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final IDashboardService dashboardService;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return dashboardService.summary();
    }

    @GetMapping("/analytics")
    public DashboardAnalyticsResponse analytics(@RequestParam(defaultValue = "7") int days) {
        return dashboardService.analytics(days);
    }
}
