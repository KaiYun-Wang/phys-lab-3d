package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAnnouncementRequest {

    @NotBlank
    @Size(max = 100)
    private String title;

    /** 列表图标（Font Awesome 类名，如 fa-flask）；空则不展示 */
    @Size(max = 32)
    private String icon;

    @NotBlank
    private String content;
}
