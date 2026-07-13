package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AdminLoginResponse;
import com.wky.backend.domain.dto.AdminProfileResponse;
import com.wky.backend.domain.dto.LoginRequest;
import com.wky.backend.domain.entity.Admin;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.AdminMapper;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IAdminAuthService;
import com.wky.backend.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminAuthServiceImpl extends ServiceImpl<AdminMapper, Admin> implements IAdminAuthService {

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public AdminLoginResponse login(LoginRequest request) {
        Admin admin = lambdaQuery()
                .eq(Admin::getUsername, request.getUsername())
                .one();
        if (admin == null || !passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            throw new ApiException(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(
                admin.getId(),
                admin.getUsername(),
                AuthPrincipal.TYPE_ADMIN);
        return new AdminLoginResponse(token, AdminProfileResponse.from(admin));
    }

    @Override
    public AdminProfileResponse getProfile(Long adminId) {
        Admin admin = getById(adminId);
        if (admin == null) {
            throw new ApiException(404, "管理员不存在");
        }
        return AdminProfileResponse.from(admin);
    }
}
