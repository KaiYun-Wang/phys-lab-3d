package com.wky.backend.service;

import com.wky.backend.domain.dto.AdminFavoriteResponse;
import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.domain.dto.PageResponse;

import java.util.List;
import java.util.Set;

public interface IExperimentFavoriteService {

    List<ExperimentResponse> listFavorites(Long userId);

    void addFavorite(Long userId, Long experimentId);

    void removeFavorite(Long userId, Long experimentId);

    Set<Long> findFavoritedExperimentIds(Long userId, List<Long> experimentIds);

    PageResponse<AdminFavoriteResponse> adminPage(
            String keyword, Long experimentId, Long userId, long page, long pageSize);

    void adminRemove(Long favoriteId);
}
