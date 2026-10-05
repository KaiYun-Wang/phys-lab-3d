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

    /** 卡片图标（Font Awesome 类名，如 fa-atom）；空则不展示 */
    @Size(max = 32)
    private String icon;

    @NotBlank
    @Size(max = 500)
    private String question;

    private Integer sortOrder;
}
