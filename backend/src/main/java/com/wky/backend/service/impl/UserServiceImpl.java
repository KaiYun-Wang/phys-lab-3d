package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AdminUserResponse;
import com.wky.backend.domain.dto.ChangePasswordRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateProfileRequest;
import com.wky.backend.domain.dto.UserProfileResponse;
import com.wky.backend.domain.dto.UserStatsResponse;
import com.wky.backend.domain.entity.AiChatSession;
import com.wky.backend.domain.entity.ExperimentComment;
import com.wky.backend.domain.entity.ExperimentFavorite;
import com.wky.backend.domain.entity.ExperimentView;
import com.wky.backend.domain.entity.User;
import com.wky.backend.enums.CommentOwnerType;
import com.wky.backend.enums.UserStatus;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.AiChatSessionMapper;
import com.wky.backend.mapper.ExperimentCommentMapper;
import com.wky.backend.mapper.ExperimentFavoriteMapper;
import com.wky.backend.mapper.ExperimentViewMapper;
import com.wky.backend.mapper.UserMapper;
import com.wky.backend.service.IUserService;
import org.dromara.x.file.storage.core.FileInfo;
import org.dromara.x.file.storage.core.FileStorageService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {

    private static final String STORAGE_PLATFORM = "minio-1";
    private static final String AVATAR_BASE_PATH = "avatars/";

    /** 与评论模块一致的可见状态值 */
    private static final String COMMENT_STATUS_VISIBLE = "VISIBLE";

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp");

    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final ExperimentFavoriteMapper favoriteMapper;
    private final ExperimentViewMapper viewMapper;
    private final ExperimentCommentMapper commentMapper;
    private final AiChatSessionMapper aiSessionMapper;

    public UserServiceImpl(
            PasswordEncoder passwordEncoder,
            FileStorageService fileStorageService,
            ExperimentFavoriteMapper favoriteMapper,
            ExperimentViewMapper viewMapper,
            ExperimentCommentMapper commentMapper,
            AiChatSessionMapper aiSessionMapper) {
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
        this.favoriteMapper = favoriteMapper;
        this.viewMapper = viewMapper;
        this.commentMapper = commentMapper;
        this.aiSessionMapper = aiSessionMapper;
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
    public UserStatsResponse getStats(Long userId) {
        long favoriteCount = favoriteMapper.selectCount(new LambdaQueryWrapper<ExperimentFavorite>()
                .eq(ExperimentFavorite::getUserId, userId));
        long sessionCount = aiSessionMapper.selectCount(new LambdaQueryWrapper<AiChatSession>()
                .eq(AiChatSession::getOwnerId, userId)
                .eq(AiChatSession::getOwnerType, CommentOwnerType.USER));
        long commentCount = commentMapper.selectCount(new LambdaQueryWrapper<ExperimentComment>()
                .eq(ExperimentComment::getOwnerId, userId)
                .eq(ExperimentComment::getOwnerType, CommentOwnerType.USER)
                .eq(ExperimentComment::getStatus, COMMENT_STATUS_VISIBLE));
        long viewCount = viewMapper.selectCount(new LambdaQueryWrapper<ExperimentView>()
                .eq(ExperimentView::getUserId, userId));
        return new UserStatsResponse(favoriteCount, sessionCount, commentCount, viewCount);
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

        // ponytail: relative path; host comes from frontend API_BASE
        user.setAvatarUrl("/api/avatars/" + filename);
        updateById(user);
        return UserProfileResponse.from(user);
    }

    @Override
    @Transactional
    public UserProfileResponse resetAvatar(Long userId) {
        User user = requireUser(userId);
        deleteAvatarFile(user.getAvatarUrl());
        // ponytail: updateById 默认跳过 null 字段，须用 lambdaUpdate 显式 SET NULL；
        // 否则数据库旧链接残留，前端刷新后仍指向已删除的 MinIO 文件（破图）
        lambdaUpdate()
                .eq(User::getId, userId)
                .set(User::getAvatarUrl, null)
                .update();
        user.setAvatarUrl(null);
        return UserProfileResponse.from(user);
    }

    @Override
    public PageResponse<AdminUserResponse> adminPage(
            String q, String status, LocalDate from, LocalDate to, long page, long pageSize) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(q)) {
            String keyword = q.trim();
            wrapper.and(w -> w
                    .like(User::getUsername, keyword)
                    .or()
                    .like(User::getNickname, keyword));
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(User::getStatus, UserStatus.fromValue(status));
        }
        if (from != null) {
            wrapper.ge(User::getCreateTime, from.atStartOfDay());
        }
        if (to != null) {
            wrapper.lt(User::getCreateTime, to.plusDays(1).atStartOfDay());
        }
        wrapper.orderByDesc(User::getCreateTime).orderByDesc(User::getId);

        Page<User> result = page(new Page<>(page, pageSize), wrapper);
        List<AdminUserResponse> records = result.getRecords().stream()
                .map(AdminUserResponse::from)
                .toList();
        return new PageResponse<>(records, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    @Transactional
    public AdminUserResponse adminUpdateStatus(Long userId, UserStatus status) {
        if (status == null) {
            throw new ApiException(400, "状态不能为空");
        }
        User user = requireUser(userId);
        user.setStatus(status);
        updateById(user);
        return AdminUserResponse.from(user);
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
