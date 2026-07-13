package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.DashboardSummaryResponse;
import com.wky.backend.service.IExperimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final IExperimentService experimentService;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return new DashboardSummaryResponse(0, experimentService.countAll(), 0, 0);
    }
}
