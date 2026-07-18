package com.wky.backend.controller;

import com.wky.backend.domain.dto.CommentResponse;
import com.wky.backend.domain.dto.CreateCommentRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.exception.ApiException;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IExperimentCommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/experiments/{experimentId}/comments")
@RequiredArgsConstructor
public class ExperimentCommentController {

    private final IExperimentCommentService commentService;

    @GetMapping
    public PageResponse<CommentResponse> list(
            @PathVariable Long experimentId,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @AuthenticationPrincipal AuthPrincipal principal) {
        Long userId = principal != null && principal.isUser() ? principal.id() : null;
        return commentService.listComments(experimentId, userId, filter, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse create(
            @PathVariable Long experimentId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return commentService.createComment(experimentId, requireUser(principal), request);
    }

    @DeleteMapping("/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long experimentId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        commentService.deleteOwnComment(experimentId, commentId, requireUser(principal));
    }

    @PostMapping("/{commentId}/likes")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void like(
            @PathVariable Long experimentId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        commentService.likeComment(experimentId, commentId, requireUser(principal));
    }

    @DeleteMapping("/{commentId}/likes")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlike(
            @PathVariable Long experimentId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        commentService.unlikeComment(experimentId, commentId, requireUser(principal));
    }

    private static Long requireUser(AuthPrincipal principal) {
        if (principal == null || !principal.isUser()) {
            throw new ApiException(401, "请先登录");
        }
        return principal.id();
    }
}
