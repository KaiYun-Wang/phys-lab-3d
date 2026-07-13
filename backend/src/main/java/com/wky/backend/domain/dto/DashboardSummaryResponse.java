package com.wky.backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardSummaryResponse {

    private long userCount;
    private long experimentCount;
    private long todayVisitCount;
    private long activeExperimentCount;
}
