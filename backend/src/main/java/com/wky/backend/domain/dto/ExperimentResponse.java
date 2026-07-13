package com.wky.backend.domain.dto;

import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.enums.ExperimentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExperimentResponse {

    private Long id;
    private String route;
    private String title;
    private Long subjectTypeId;
    private String subjectType;
    private String subjectTypeLabel;
    private String description;
    private String coverUrl;
    private List<String> topics;
    private ExperimentStatus status;
    private Long visitorCount;
    private Long favoriteCount;
    private Long viewCount;
    private Long commentCount;
    private Boolean favorited;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    public static ExperimentResponse from(Experiment experiment) {
        return from(experiment, null, null);
    }

    public static ExperimentResponse from(Experiment experiment, Boolean favorited) {
        return from(experiment, null, favorited);
    }

    public static ExperimentResponse from(Experiment experiment, String subjectTypeLabel, Boolean favorited) {
        return ExperimentResponse.builder()
                .id(experiment.getId())
                .route(experiment.getRoute())
                .title(experiment.getTitle())
                .subjectTypeId(experiment.getSubjectTypeId())
                .subjectType(experiment.getSubjectType())
                .subjectTypeLabel(subjectTypeLabel)
                .description(experiment.getDescription())
                .coverUrl(experiment.getCoverUrl())
                .topics(experiment.getTopics())
                .status(experiment.getStatus())
                .visitorCount(experiment.getVisitorCount())
                .favoriteCount(experiment.getFavoriteCount())
                .viewCount(experiment.getViewCount())
                .commentCount(experiment.getCommentCount())
                .favorited(favorited)
                .createTime(experiment.getCreateTime())
                .updateTime(experiment.getUpdateTime())
                .build();
    }
}
