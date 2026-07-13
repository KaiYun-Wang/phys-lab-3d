package com.wky.backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminLoginResponse {

    private String token;
    private AdminProfileResponse admin;
}
