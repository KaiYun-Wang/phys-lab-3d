package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DashboardAnalyticsResponse {

    private int days;
    private List<TrendPoint> visitTrend;
    private List<TrendPoint> registerTrend;
    private List<FavoriteTopItem> favoriteTop;
    private AiStats ai;

    @Data
    @Builder
    public static class TrendPoint {
        private String date;
        private long count;
    }

    @Data
    @Builder
    public static class FavoriteTopItem {
        private Long experimentId;
        private String title;
        private long favoriteCount;
    }

    @Data
    @Builder
    public static class AiStats {
        private long sessionCount;
        private long questionCount;
        /** 提问数 / 会话数；无会话时为 0 */
        private double avgSessionDepth;
        /** 0~1；无带 rag 记录的回复时为 null */
        private Double ragHitRate;
        private List<TrendPoint> questionTrend;
    }
}
