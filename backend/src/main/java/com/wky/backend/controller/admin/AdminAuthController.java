package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AdminLoginResponse;
import com.wky.backend.domain.dto.LoginRequest;
import com.wky.backend.service.IAdminAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final IAdminAuthService adminAuthService;

    @PostMapping("/login")
    public AdminLoginResponse login(@Valid @RequestBody LoginRequest request) {
        return adminAuthService.login(request);
    }
}
