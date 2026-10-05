package com.wky.backend.domain.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiChatSessionResponse {
    private Long id;
    /** 所属实验；null=首页/非实验页 */
    private Long experimentId;
    /** 所属实验展示名（列表标注用） */
    private String experimentTitle;
    /** 所属实验路由（深链跳转用） */
    private String experimentRoute;
    private String title;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
