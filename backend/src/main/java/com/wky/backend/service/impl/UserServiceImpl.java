package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.ChangePasswordRequest;
import com.wky.backend.domain.dto.UpdateProfileRequest;
import com.wky.backend.domain.dto.UserProfileResponse;
import com.wky.backend.domain.entity.User;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.UserMapper;
import com.wky.backend.service.IUserService;
import org.dromara.x.file.storage.core.FileInfo;
import org.dromara.x.file.storage.core.FileStorageService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.UUID;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {

    private static final String STORAGE_PLATFORM = "minio-1";
    private static final String AVATAR_BASE_PATH = "avatars/";

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp");

    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    public UserServiceImpl(PasswordEncoder passwordEncoder, FileStorageService fileStorageService) {
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
    }

    @Override
    public User requireUser(Long userId) {
        User user = getById(userId);
        if (user == null) {
            throw new ApiException(404, "用户不存在");
        }
        return user;
    }

    @Override
    public UserProfileResponse getProfile(Long userId) {
        return UserProfileResponse.from(requireUser(userId));
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = requireUser(userId);
        user.setNickname(request.getNickname());
        updateById(user);
        return UserProfileResponse.from(user);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = requireUser(userId);
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new ApiException(400, "当前密码错误");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        updateById(user);
    }

    @Override
    @Transactional
    public UserProfileResponse uploadAvatar(Long userId, MultipartFile file) {
        if (file.isEmpty()) {
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

        User user = requireUser(userId);
        deleteAvatarFile(user.getAvatarUrl());

        String filename = userId + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
        FileInfo fileInfo = fileStorageService.of(file)
                .setSaveFilename(filename)
                .upload();
        if (fileInfo == null) {
            throw new ApiException(500, "头像上传失败");
        }

        user.setAvatarUrl(fileInfo.getUrl());
        updateById(user);
        return UserProfileResponse.from(user);
    }

    @Override
    @Transactional
    public UserProfileResponse resetAvatar(Long userId) {
        User user = requireUser(userId);
        deleteAvatarFile(user.getAvatarUrl());
        user.setAvatarUrl(null);
        updateById(user);
        return UserProfileResponse.from(user);
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
