package com.wky.backend.domain.dto;

import java.time.LocalDateTime;

import com.wky.backend.domain.entity.Announcement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementResponse {

    private Long id;
    private String title;
    private String icon;
    private String content;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    public static AnnouncementResponse from(Announcement announcement) {
        return AnnouncementResponse.builder()
                .id(announcement.getId())
                .title(announcement.getTitle())
                .icon(announcement.getIcon())
                .content(announcement.getContent())
                .createTime(announcement.getCreateTime())
                .updateTime(announcement.getUpdateTime())
                .build();
    }
}
