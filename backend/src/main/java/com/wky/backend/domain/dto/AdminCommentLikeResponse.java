package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminCommentLikeResponse {

    private Long id;
    private Long commentId;
    private String commentContent;
    private Long experimentId;
    private String experimentTitle;
    private Long userId;
    private String username;
    private String nickname;
    private LocalDateTime createTime;
}
