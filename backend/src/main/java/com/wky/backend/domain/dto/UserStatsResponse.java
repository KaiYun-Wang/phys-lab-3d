package com.wky.backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 个人中心活动读数（一次请求聚合，避免前端多次串行拉取）。 */
@Data
@AllArgsConstructor
public class UserStatsResponse {

    /** 收藏的实验数 */
    private long favoriteCount;

    /** AI 对话会话数（跨全部作用域） */
    private long sessionCount;

    /** 我发出的评论数（根评论 + 回复，仅可见） */
    private long commentCount;

    /** 实验浏览次数 */
    private long viewCount;
}
