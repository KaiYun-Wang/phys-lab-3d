package com.wky.backend.service;

import com.wky.backend.domain.dto.AdminLoginResponse;
import com.wky.backend.domain.dto.AdminProfileResponse;
import com.wky.backend.domain.dto.LoginRequest;

public interface IAdminAuthService {

    AdminLoginResponse login(LoginRequest request);

    AdminProfileResponse getProfile(Long adminId);
}
