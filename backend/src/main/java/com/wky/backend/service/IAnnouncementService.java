package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.AnnouncementResponse;
import com.wky.backend.domain.dto.CreateAnnouncementRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateAnnouncementRequest;
import com.wky.backend.domain.entity.Announcement;

public interface IAnnouncementService extends IService<Announcement> {

    PageResponse<AnnouncementResponse> page(long page, long size);

    AnnouncementResponse latest();

    AnnouncementResponse getByIdOrThrow(Long id);

    AnnouncementResponse create(CreateAnnouncementRequest request);

    AnnouncementResponse update(Long id, UpdateAnnouncementRequest request);

    void delete(Long id);
}
