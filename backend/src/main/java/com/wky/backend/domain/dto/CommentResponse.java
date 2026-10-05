package com.wky.backend.domain.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommentResponse {

    private Long id;
    private Long experimentId;
    private Long ownerId;
    /** 0=用户，1=管理员 */
    private Integer ownerType;
    private String nickname;
    private String avatarUrl;
    private Long rootId;
    private Long replyToId;
    private Long replyToOwnerId;
    private Integer replyToOwnerType;
    private String replyToNickname;
    private String content;
    private Long likeCount;
    private Boolean liked;
    /** 该楼层含我的回复（仅「我的」筛选时返回，用于标注“我回复过”） */
    private Boolean participated;
    private LocalDateTime createTime;
    private List<CommentResponse> replies;
}
