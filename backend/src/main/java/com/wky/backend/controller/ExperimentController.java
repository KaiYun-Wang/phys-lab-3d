package com.wky.backend.controller;

import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IExperimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/experiments")
@RequiredArgsConstructor
public class ExperimentController {

    private final IExperimentService experimentService;

    @GetMapping
    public List<ExperimentResponse> list(
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal AuthPrincipal principal) {
        Long userId = principal != null && principal.isUser() ? principal.id() : null;
        return experimentService.listPublished(q, userId);
    }

    @GetMapping("/{route}")
    public ExperimentResponse detail(
            @PathVariable String route,
            @AuthenticationPrincipal AuthPrincipal principal) {
        Long userId = principal != null && principal.isUser() ? principal.id() : null;
        return experimentService.getPublishedByRoute(route, userId);
    }
}
