package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AdminProfileResponse;
import com.wky.backend.domain.dto.UpdateAdminProfileRequest;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IAdminAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminMeController {

    private final IAdminAuthService adminAuthService;

    @GetMapping("/me")
    public AdminProfileResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return adminAuthService.getProfile(principal.id());
    }

    @PatchMapping("/me")
    public AdminProfileResponse updateProfile(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateAdminProfileRequest request) {
        return adminAuthService.updateProfile(principal.id(), request);
    }

    @PostMapping("/me/avatar")
    public AdminProfileResponse uploadAvatar(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        return adminAuthService.uploadAvatar(principal.id(), file);
    }

    @DeleteMapping("/me/avatar")
    public AdminProfileResponse resetAvatar(@AuthenticationPrincipal AuthPrincipal principal) {
        return adminAuthService.resetAvatar(principal.id());
    }
}
