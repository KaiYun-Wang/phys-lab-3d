package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminFavoriteResponse {

    private Long id;
    private Long userId;
    private String username;
    private String nickname;
    private Long experimentId;
    private String experimentTitle;
    private String experimentRoute;
    private LocalDateTime createTime;
}
