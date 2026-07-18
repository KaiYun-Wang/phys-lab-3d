package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.AdminCommentLikeResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.service.IExperimentCommentService;
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
@RequestMapping("/api/admin/comment-likes")
@RequiredArgsConstructor
public class AdminCommentLikeController {

    private final IExperimentCommentService commentService;

    @GetMapping
    public PageResponse<AdminCommentLikeResponse> list(
            @RequestParam(required = false) Long commentId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long experimentId,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return commentService.adminLikePage(commentId, userId, experimentId, page, size);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        commentService.adminDeleteLike(id);
    }
}
