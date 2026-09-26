package com.wky.backend.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class KnowledgePageResponse {
    private Long id;
    private String title;
    private String description;
    /** 列表接口可为 null，详情接口有正文 */
    private String content;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
