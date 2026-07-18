package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminCommentResponse {

    private Long id;
    private Long experimentId;
    private String experimentTitle;
    private String experimentRoute;
    private Long userId;
    private String username;
    private String nickname;
    private Long rootId;
    private Long replyToId;
    private String content;
    private Long likeCount;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
