package com.wky.backend.service;

import com.wky.backend.domain.dto.AdminLoginResponse;
import com.wky.backend.domain.dto.AdminProfileResponse;
import com.wky.backend.domain.dto.LoginRequest;
import com.wky.backend.domain.dto.UpdateAdminProfileRequest;
import org.springframework.web.multipart.MultipartFile;

public interface IAdminAuthService {

    AdminLoginResponse login(LoginRequest request);

    AdminProfileResponse getProfile(Long adminId);

    AdminProfileResponse updateProfile(Long adminId, UpdateAdminProfileRequest request);

    AdminProfileResponse uploadAvatar(Long adminId, MultipartFile file);

    AdminProfileResponse resetAvatar(Long adminId);
}
