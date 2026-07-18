package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class AiChatMessageResponse {
    private Long id;
    private Long sessionId;
    private String role;
    private String content;
    /** 推理模型的思考过程（可为空） */
    private String thinking;
    private Map<String, Object> context;
    private LocalDateTime createTime;
}
