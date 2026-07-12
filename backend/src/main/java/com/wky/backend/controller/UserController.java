package com.wky.backend.controller;

import com.wky.backend.domain.dto.ChangePasswordRequest;
import com.wky.backend.domain.dto.UpdateProfileRequest;
import com.wky.backend.domain.dto.UserProfileResponse;
import com.wky.backend.service.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

    @GetMapping
    public UserProfileResponse me(@AuthenticationPrincipal Long userId) {
        return userService.getProfile(userId);
    }

    @PatchMapping
    public UserProfileResponse updateProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(userId, request);
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userId, request);
        return Map.of("message", "密码已更新");
    }

    @PostMapping("/avatar")
    public UserProfileResponse uploadAvatar(
            @AuthenticationPrincipal Long userId,
            @RequestParam("file") MultipartFile file) {
        return userService.uploadAvatar(userId, file);
    }

    @DeleteMapping("/avatar")
    public UserProfileResponse resetAvatar(@AuthenticationPrincipal Long userId) {
        return userService.resetAvatar(userId);
    }
}
