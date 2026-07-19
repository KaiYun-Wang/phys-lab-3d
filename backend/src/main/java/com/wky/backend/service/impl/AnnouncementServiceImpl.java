package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.AnnouncementResponse;
import com.wky.backend.domain.dto.CreateAnnouncementRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateAnnouncementRequest;
import com.wky.backend.domain.entity.Announcement;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.AnnouncementMapper;
import com.wky.backend.service.IAnnouncementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnouncementServiceImpl extends ServiceImpl<AnnouncementMapper, Announcement>
        implements IAnnouncementService {

    @Override
    public PageResponse<AnnouncementResponse> page(long page, long size) {
        Page<Announcement> result = page(
                new Page<>(page, size),
                new LambdaQueryWrapper<Announcement>()
                        .orderByDesc(Announcement::getCreateTime)
                        .orderByDesc(Announcement::getId));
        return new PageResponse<>(
                result.getRecords().stream().map(AnnouncementResponse::from).toList(),
                result.getTotal(),
                result.getCurrent(),
                result.getSize());
    }

    @Override
    public AnnouncementResponse latest() {
        Announcement announcement = getOne(new LambdaQueryWrapper<Announcement>()
                .orderByDesc(Announcement::getCreateTime)
                .orderByDesc(Announcement::getId)
                .last("LIMIT 1"));
        return announcement == null ? null : AnnouncementResponse.from(announcement);
    }

    @Override
    public AnnouncementResponse getByIdOrThrow(Long id) {
        Announcement announcement = getById(id);
        if (announcement == null) {
            throw new ApiException(404, "公告不存在");
        }
        return AnnouncementResponse.from(announcement);
    }

    @Override
    @Transactional
    public AnnouncementResponse create(CreateAnnouncementRequest request) {
        Announcement announcement = new Announcement();
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        save(announcement);
        return AnnouncementResponse.from(announcement);
    }

    @Override
    @Transactional
    public AnnouncementResponse update(Long id, UpdateAnnouncementRequest request) {
        Announcement announcement = getById(id);
        if (announcement == null) {
            throw new ApiException(404, "公告不存在");
        }
        announcement.setTitle(request.getTitle().trim());
        announcement.setContent(request.getContent().trim());
        updateById(announcement);
        return AnnouncementResponse.from(announcement);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!removeById(id)) {
            throw new ApiException(404, "公告不存在");
        }
    }
}
