package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAdminProfileRequest {

    @NotBlank
    @Size(max = 40)
    private String displayName;
}
