package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiChatReplyResponse {
    private AiChatMessageResponse userMessage;
    private AiChatMessageResponse assistantMessage;
    private AiChatSessionResponse session;
}
