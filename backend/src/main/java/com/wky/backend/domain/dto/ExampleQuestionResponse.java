package com.wky.backend.domain.dto;

import java.time.LocalDateTime;

import com.wky.backend.domain.entity.ExampleQuestion;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExampleQuestionResponse {

    private Long id;
    private String title;
    private String description;
    private String icon;
    private String question;
    private Integer sortOrder;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    public static ExampleQuestionResponse from(ExampleQuestion row) {
        return ExampleQuestionResponse.builder()
                .id(row.getId())
                .title(row.getTitle())
                .description(row.getDescription())
                .icon(row.getIcon())
                .question(row.getQuestion())
                .sortOrder(row.getSortOrder() == null ? 0 : row.getSortOrder())
                .createTime(row.getCreateTime())
                .updateTime(row.getUpdateTime())
                .build();
    }
}
