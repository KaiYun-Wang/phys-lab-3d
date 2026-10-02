package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class AiChatSessionResponse {
    private Long id;
    /** 所属实验；null=首页/非实验页 */
    private Long experimentId;
    private String title;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
