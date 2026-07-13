package com.wky.backend.service;

import com.wky.backend.domain.dto.ExperimentResponse;

import java.util.List;
import java.util.Set;

public interface IExperimentFavoriteService {

    List<ExperimentResponse> listFavorites(Long userId);

    void addFavorite(Long userId, Long experimentId);

    void removeFavorite(Long userId, Long experimentId);

    Set<Long> findFavoritedExperimentIds(Long userId, List<Long> experimentIds);
}
