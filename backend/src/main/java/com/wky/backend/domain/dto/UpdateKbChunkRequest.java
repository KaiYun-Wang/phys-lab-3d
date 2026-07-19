package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateKbChunkRequest {

    @NotBlank
    private String content;
}
