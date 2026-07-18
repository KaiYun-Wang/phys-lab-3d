package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateCommentStatusRequest {

    @NotBlank
    @Pattern(regexp = "VISIBLE|HIDDEN", message = "status 仅支持 VISIBLE 或 HIDDEN")
    private String status;
}
