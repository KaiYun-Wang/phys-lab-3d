package com.wky.backend.domain.dto;

import com.wky.backend.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {

    @NotNull(message = "状态不能为空")
    private UserStatus status;
}
