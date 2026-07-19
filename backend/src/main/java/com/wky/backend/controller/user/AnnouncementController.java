package com.wky.backend.controller.user;

import com.wky.backend.domain.dto.AnnouncementResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.service.IAnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final IAnnouncementService announcementService;

    @GetMapping("/latest")
    public ResponseEntity<AnnouncementResponse> latest() {
        AnnouncementResponse latest = announcementService.latest();
        return latest == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(latest);
    }

    @GetMapping
    public PageResponse<AnnouncementResponse> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size) {
        return announcementService.page(page, size);
    }
}
