package com.wky.backend.domain.dto;

import com.wky.backend.domain.entity.SubjectType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectTypeResponse {

    private Long id;
    private String code;
    private String label;
    private String description;
    private Integer sortOrder;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    public static SubjectTypeResponse from(SubjectType subjectType) {
        return SubjectTypeResponse.builder()
                .id(subjectType.getId())
                .code(subjectType.getCode())
                .label(subjectType.getLabel())
                .description(subjectType.getDescription())
                .sortOrder(subjectType.getSortOrder())
                .createTime(subjectType.getCreateTime())
                .updateTime(subjectType.getUpdateTime())
                .build();
    }
}
