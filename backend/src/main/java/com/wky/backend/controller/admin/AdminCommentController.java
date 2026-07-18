package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AdminCommentResponse;
import com.wky.backend.domain.dto.AdminReplyCommentRequest;
import com.wky.backend.domain.dto.CommentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateCommentStatusRequest;
import com.wky.backend.exception.ApiException;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IExperimentCommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
public class AdminCommentController {

    private final IExperimentCommentService commentService;

    @GetMapping
    public PageResponse<AdminCommentResponse> list(
            @RequestParam(required = false) Long experimentId,
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) Integer ownerType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return commentService.adminPage(experimentId, ownerId, ownerType, status, keyword, page, size);
    }

    @PostMapping("/reply")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse reply(
            @Valid @RequestBody AdminReplyCommentRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return commentService.adminReply(requireAdmin(principal), request);
    }

    @PatchMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCommentStatusRequest request) {
        commentService.adminUpdateStatus(id, request.getStatus());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        commentService.adminDelete(id);
    }

    private static Long requireAdmin(AuthPrincipal principal) {
        if (principal == null || !principal.isAdmin()) {
            throw new ApiException(401, "请先登录");
        }
        return principal.id();
    }
}
