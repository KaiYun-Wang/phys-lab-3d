package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CommentResponse {

    private Long id;
    private Long experimentId;
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private Long rootId;
    private Long replyToId;
    private Long replyToUserId;
    private String replyToNickname;
    private String content;
    private Long likeCount;
    private Boolean liked;
    private LocalDateTime createTime;
    private List<CommentResponse> replies;
}
