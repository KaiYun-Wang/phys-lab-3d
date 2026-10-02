package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiRenameSessionRequest {

    @NotBlank
    @Size(min = 1, max = 200, message = "标题不能超过 200 字符")
    private String title;
}
