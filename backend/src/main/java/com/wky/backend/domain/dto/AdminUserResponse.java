package com.wky.backend.domain.dto;

import com.wky.backend.domain.entity.User;
import com.wky.backend.enums.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {

    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private UserStatus status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    public static AdminUserResponse from(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus() != null ? user.getStatus() : UserStatus.ENABLED)
                .createTime(user.getCreateTime())
                .updateTime(user.getUpdateTime())
                .build();
    }
}
