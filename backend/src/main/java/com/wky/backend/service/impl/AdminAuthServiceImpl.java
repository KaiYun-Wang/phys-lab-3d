package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AdminLoginResponse;
import com.wky.backend.domain.dto.AdminProfileResponse;
import com.wky.backend.domain.dto.LoginRequest;
import com.wky.backend.domain.dto.UpdateAdminProfileRequest;
import com.wky.backend.domain.entity.Admin;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.AdminMapper;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IAdminAuthService;
import com.wky.backend.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.dromara.x.file.storage.core.FileInfo;
import org.dromara.x.file.storage.core.FileStorageService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminAuthServiceImpl extends ServiceImpl<AdminMapper, Admin> implements IAdminAuthService {

    private static final String STORAGE_PLATFORM = "minio-1";
    private static final String AVATAR_BASE_PATH = "avatars/";
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp");

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final FileStorageService fileStorageService;

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
        return AdminProfileResponse.from(requireAdmin(adminId));
    }

    @Override
    @Transactional
    public AdminProfileResponse updateProfile(Long adminId, UpdateAdminProfileRequest request) {
        Admin admin = requireAdmin(adminId);
        admin.setDisplayName(request.getDisplayName().trim());
        updateById(admin);
        return AdminProfileResponse.from(admin);
    }

    @Override
    @Transactional
    public AdminProfileResponse uploadAvatar(Long adminId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(400, "请选择图片");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new ApiException(400, "图片不能超过 2MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ApiException(400, "仅支持 JPG / PNG / WebP");
        }

        String ext = switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        Admin admin = requireAdmin(adminId);
        deleteAvatarFile(admin.getAvatarUrl());

        // ponytail: prefix avoids colliding with user avatar filenames (same MinIO path)
        String filename = "admin-" + adminId + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
        FileInfo fileInfo = fileStorageService.of(file)
                .setSaveFilename(filename)
                .upload();
        if (fileInfo == null) {
            throw new ApiException(500, "头像上传失败");
        }

        admin.setAvatarUrl(fileInfo.getUrl());
        updateById(admin);
        return AdminProfileResponse.from(admin);
    }

    @Override
    @Transactional
    public AdminProfileResponse resetAvatar(Long adminId) {
        Admin admin = requireAdmin(adminId);
        deleteAvatarFile(admin.getAvatarUrl());
        admin.setAvatarUrl(null);
        updateById(admin);
        return AdminProfileResponse.from(admin);
    }

    private Admin requireAdmin(Long adminId) {
        Admin admin = getById(adminId);
        if (admin == null) {
            throw new ApiException(404, "管理员不存在");
        }
        return admin;
    }

    private void deleteAvatarFile(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return;
        }
        int slash = avatarUrl.lastIndexOf('/');
        if (slash < 0) {
            return;
        }
        fileStorageService.delete(avatarFileInfo(avatarUrl.substring(slash + 1)));
    }

    private static FileInfo avatarFileInfo(String filename) {
        return new FileInfo()
                .setPlatform(STORAGE_PLATFORM)
                .setBasePath(AVATAR_BASE_PATH)
                .setFilename(filename);
    }
}
