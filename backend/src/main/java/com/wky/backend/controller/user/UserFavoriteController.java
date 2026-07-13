package com.wky.backend.controller.user;

import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IExperimentFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users/me/favorites")
@RequiredArgsConstructor
public class UserFavoriteController {

    private final IExperimentFavoriteService favoriteService;

    @GetMapping
    public List<ExperimentResponse> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return favoriteService.listFavorites(principal.id());
    }

    @PostMapping("/{experimentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long experimentId) {
        favoriteService.addFavorite(principal.id(), experimentId);
    }

    @DeleteMapping("/{experimentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long experimentId) {
        favoriteService.removeFavorite(principal.id(), experimentId);
    }
}
