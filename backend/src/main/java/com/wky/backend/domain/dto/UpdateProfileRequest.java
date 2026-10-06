package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "昵称不能为空")
    @Size(min = 3, max = 10, message = "昵称长度须为 3-10 个字符")
    private String nickname;
}
