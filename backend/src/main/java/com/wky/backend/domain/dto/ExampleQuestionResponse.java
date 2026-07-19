package com.wky.backend.domain.dto;

import com.wky.backend.domain.entity.ExampleQuestion;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ExampleQuestionResponse {

    private Long id;
    private String title;
    private String description;
    private String question;
    private Integer sortOrder;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    public static ExampleQuestionResponse from(ExampleQuestion row) {
        return ExampleQuestionResponse.builder()
                .id(row.getId())
                .title(row.getTitle())
                .description(row.getDescription())
                .question(row.getQuestion())
                .sortOrder(row.getSortOrder() == null ? 0 : row.getSortOrder())
                .createTime(row.getCreateTime())
                .updateTime(row.getUpdateTime())
                .build();
    }
}
