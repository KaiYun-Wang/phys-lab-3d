package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AnnouncementResponse;
import com.wky.backend.domain.dto.CreateAnnouncementRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateAnnouncementRequest;
import com.wky.backend.service.IAnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/announcements")
@RequiredArgsConstructor
public class AdminAnnouncementController {

    private final IAnnouncementService announcementService;

    @GetMapping
    public PageResponse<AnnouncementResponse> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return announcementService.page(page, size);
    }

    @GetMapping("/{id}")
    public AnnouncementResponse get(@PathVariable Long id) {
        return announcementService.getByIdOrThrow(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementResponse create(@Valid @RequestBody CreateAnnouncementRequest request) {
        return announcementService.create(request);
    }

    @PutMapping("/{id}")
    public AnnouncementResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAnnouncementRequest request) {
        return announcementService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        announcementService.delete(id);
    }
}
