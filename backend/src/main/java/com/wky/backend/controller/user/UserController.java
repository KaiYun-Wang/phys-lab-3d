package com.wky.backend.controller.user;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.wky.backend.domain.dto.ChangePasswordRequest;
import com.wky.backend.domain.dto.UpdateProfileRequest;
import com.wky.backend.domain.dto.UserProfileResponse;
import com.wky.backend.domain.dto.UserStatsResponse;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IUserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

    @GetMapping
    public UserProfileResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return userService.getProfile(principal.id());
    }

    @GetMapping("/stats")
    public UserStatsResponse stats(@AuthenticationPrincipal AuthPrincipal principal) {
        return userService.getStats(principal.id());
    }

    @PatchMapping
    public UserProfileResponse updateProfile(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(principal.id(), request);
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.id(), request);
        return Map.of("message", "密码已更新");
    }

    @PostMapping("/avatar")
    public UserProfileResponse uploadAvatar(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        return userService.uploadAvatar(principal.id(), file);
    }

    @DeleteMapping("/avatar")
    public UserProfileResponse resetAvatar(@AuthenticationPrincipal AuthPrincipal principal) {
        return userService.resetAvatar(principal.id());
    }
}
