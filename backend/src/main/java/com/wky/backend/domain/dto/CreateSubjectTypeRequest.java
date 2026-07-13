package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSubjectTypeRequest {

    @NotBlank
    @Size(max = 40)
    @Pattern(regexp = "^[A-Z][A-Z0-9_]*$", message = "code 须为大写下划线枚举名，如 MECHANICS")
    private String code;

    @NotBlank
    @Size(max = 40)
    private String label;

    private String description;

    private Integer sortOrder = 0;
}
