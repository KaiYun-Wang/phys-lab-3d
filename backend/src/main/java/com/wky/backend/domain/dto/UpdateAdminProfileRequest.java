package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAdminProfileRequest {

    @NotBlank(message = "展示名不能为空")
    @Size(min = 3, max = 10, message = "展示名长度须为 3-10 个字符")
    private String displayName;
}
