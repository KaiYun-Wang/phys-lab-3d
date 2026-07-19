package com.wky.backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DashboardSummaryResponse {

    private long userCount;
    private long experimentCount;
    private long todayVisitCount;
    /** 累计用户提问数 */
    private long aiQuestionCount;
}
