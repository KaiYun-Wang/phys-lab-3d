package com.wky.backend.domain.dto;

import com.wky.backend.enums.ExperimentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateExperimentRequest {

    @NotBlank
    @Size(max = 64)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "route 须为小写 slug，如 double-slit")
    private String route;

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

    private ExperimentStatus status = ExperimentStatus.PUBLISHED;
}
