package com.wky.backend.domain.dto;

import com.wky.backend.domain.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class UserProfileResponse {

    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    /** 注册时间（个人中心「加入第 N 天」） */
    private LocalDateTime createTime;

    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getCreateTime()
        );
    }
}
