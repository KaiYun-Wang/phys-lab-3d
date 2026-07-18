package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminReplyCommentRequest {

    @NotNull
    private Long experimentId;

    /** 回复目标评论 ID（必填；管理员仅可回复，不可发一级楼） */
    @NotNull
    private Long replyToId;

    @NotBlank
    @Size(min = 1, max = 1000)
    private String content;
}
