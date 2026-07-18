package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

@Data
public class AiChatMessageRequest {

    @NotBlank
    @Size(min = 1, max = 4000)
    private String content;

    /** 当前页上下文：path / pageType / experimentId / experimentTitle 等 */
    private Map<String, Object> context;
}
