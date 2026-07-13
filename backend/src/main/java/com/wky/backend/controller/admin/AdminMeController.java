package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AdminProfileResponse;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IAdminAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminMeController {

    private final IAdminAuthService adminAuthService;

    @GetMapping("/me")
    public AdminProfileResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return adminAuthService.getProfile(principal.id());
    }
}
