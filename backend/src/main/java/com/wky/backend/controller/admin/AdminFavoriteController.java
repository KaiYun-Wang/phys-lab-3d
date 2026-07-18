package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AdminFavoriteResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.service.IExperimentFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/favorites")
@RequiredArgsConstructor
public class AdminFavoriteController {

    private final IExperimentFavoriteService favoriteService;

    @GetMapping
    public PageResponse<AdminFavoriteResponse> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long experimentId,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return favoriteService.adminPage(keyword, experimentId, userId, page, size);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        favoriteService.adminRemove(id);
    }
}
