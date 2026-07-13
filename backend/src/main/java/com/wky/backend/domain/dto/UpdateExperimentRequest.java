package com.wky.backend.domain.dto;

import com.wky.backend.enums.ExperimentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class UpdateExperimentRequest {

    @NotBlank
    @Size(max = 120)
    private String title;

    @NotNull
    private Long subjectTypeId;

    @NotBlank
    private String description;

    @Size(max = 512)
    private String coverUrl;

    private List<String> topics;

    @NotNull
    private ExperimentStatus status;
}
