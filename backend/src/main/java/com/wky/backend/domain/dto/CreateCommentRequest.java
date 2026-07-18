package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCommentRequest {

    @NotBlank
    @Size(min = 1, max = 1000)
    private String content;

    /** 回复目标评论 ID；发一级评论时为 null */
    private Long replyToId;
}
