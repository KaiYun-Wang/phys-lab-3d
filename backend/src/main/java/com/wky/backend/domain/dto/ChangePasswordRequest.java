package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank
    @Size(min = 5, max = 20)
    private String oldPassword;

    @NotBlank
    @Size(min = 5, max = 20)
    private String newPassword;
}
