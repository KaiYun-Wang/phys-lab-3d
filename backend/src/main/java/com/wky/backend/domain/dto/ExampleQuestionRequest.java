package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExampleQuestionRequest {

    @NotBlank
    @Size(max = 100)
    private String title;

    @Size(max = 200)
    private String description;

    @NotBlank
    @Size(max = 500)
    private String question;

    private Integer sortOrder;
}
