package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wky.backend.domain.dto.DashboardAnalyticsResponse;
import com.wky.backend.domain.dto.DashboardAnalyticsResponse.AiStats;
import com.wky.backend.domain.dto.DashboardAnalyticsResponse.FavoriteTopItem;
import com.wky.backend.domain.dto.DashboardAnalyticsResponse.TrendPoint;
import com.wky.backend.domain.dto.DashboardSummaryResponse;
import com.wky.backend.domain.dto.DayCountRow;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.domain.entity.User;
import com.wky.backend.mapper.AiChatMessageMapper;
import com.wky.backend.mapper.AiChatSessionMapper;
import com.wky.backend.mapper.ExperimentMapper;
import com.wky.backend.mapper.ExperimentViewMapper;
import com.wky.backend.mapper.UserMapper;
import com.wky.backend.service.IDashboardService;
import com.wky.backend.service.IExperimentViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements IDashboardService {

    private static final int FAVORITE_TOP_LIMIT = 8;

    private final UserMapper userMapper;
    private final ExperimentMapper experimentMapper;
    private final ExperimentViewMapper experimentViewMapper;
    private final AiChatMessageMapper aiChatMessageMapper;
    private final AiChatSessionMapper aiChatSessionMapper;
    private final IExperimentViewService experimentViewService;

    @Override
    public DashboardSummaryResponse summary() {
        return new DashboardSummaryResponse(
                userMapper.selectCount(new LambdaQueryWrapper<User>()),
                experimentMapper.selectCount(new LambdaQueryWrapper<>()),
                experimentViewService.countToday(),
                aiChatMessageMapper.countAllUserQuestions());
    }

    @Override
    public DashboardAnalyticsResponse analytics(int days) {
        int range = days <= 7 ? 7 : 30;
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(range - 1L);
        LocalDateTime from = fromDate.atStartOfDay();

        return DashboardAnalyticsResponse.builder()
                .days(range)
                .visitTrend(fillTrend(fromDate, today, experimentViewMapper.countByDay(from)))
                .registerTrend(fillTrend(fromDate, today, userMapper.countRegistrationsByDay(from)))
                .favoriteTop(favoriteTop())
                .ai(buildAiStats(fromDate, today, from))
                .build();
    }

    private AiStats buildAiStats(LocalDate fromDate, LocalDate today, LocalDateTime from) {
        long sessions = aiChatSessionMapper.countSince(from);
        long questions = aiChatMessageMapper.countUserQuestionsSince(from);
        double depth = sessions == 0 ? 0 : (double) questions / sessions;

        long ragTotal = aiChatMessageMapper.countAssistantWithRagSince(from);
        long ragHits = aiChatMessageMapper.countAssistantRagHitSince(from);
        Double hitRate = ragTotal == 0 ? null : (double) ragHits / ragTotal;

        return AiStats.builder()
                .sessionCount(sessions)
                .questionCount(questions)
                .avgSessionDepth(Math.round(depth * 100.0) / 100.0)
                .ragHitRate(hitRate == null ? null : Math.round(hitRate * 1000.0) / 1000.0)
                .questionTrend(fillTrend(fromDate, today, aiChatMessageMapper.countUserQuestionsByDay(from)))
                .build();
    }

    private List<FavoriteTopItem> favoriteTop() {
        List<Experiment> rows = experimentMapper.selectList(
                new LambdaQueryWrapper<Experiment>()
                        .gt(Experiment::getFavoriteCount, 0)
                        .orderByDesc(Experiment::getFavoriteCount)
                        .orderByDesc(Experiment::getId)
                        .last("LIMIT " + FAVORITE_TOP_LIMIT));
        List<FavoriteTopItem> out = new ArrayList<>(rows.size());
        for (Experiment e : rows) {
            out.add(FavoriteTopItem.builder()
                    .experimentId(e.getId())
                    .title(e.getTitle())
                    .favoriteCount(e.getFavoriteCount() == null ? 0 : e.getFavoriteCount())
                    .build());
        }
        return out;
    }

    private static List<TrendPoint> fillTrend(LocalDate from, LocalDate to, List<DayCountRow> rows) {
        Map<LocalDate, Long> map = new HashMap<>();
        if (rows != null) {
            for (DayCountRow row : rows) {
                if (row.getDay() != null) {
                    map.put(row.getDay(), row.getCnt() == null ? 0L : row.getCnt());
                }
            }
        }
        List<TrendPoint> points = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            points.add(TrendPoint.builder()
                    .date(d.toString())
                    .count(map.getOrDefault(d, 0L))
                    .build());
        }
        return points;
    }
}
