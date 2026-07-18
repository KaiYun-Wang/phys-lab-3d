package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.AdminCommentLikeResponse;
import com.wky.backend.domain.dto.AdminCommentResponse;
import com.wky.backend.domain.dto.CommentResponse;
import com.wky.backend.domain.dto.CreateCommentRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.ExperimentComment;

public interface IExperimentCommentService extends IService<ExperimentComment> {

    PageResponse<CommentResponse> listComments(
            Long experimentId, Long currentUserId, String filter, long page, long pageSize);

    CommentResponse createComment(Long experimentId, Long userId, CreateCommentRequest request);

    void deleteOwnComment(Long experimentId, Long commentId, Long userId);

    void likeComment(Long experimentId, Long commentId, Long userId);

    void unlikeComment(Long experimentId, Long commentId, Long userId);

    PageResponse<AdminCommentResponse> adminPage(
            Long experimentId, Long userId, String status, String keyword, long page, long pageSize);

    void adminUpdateStatus(Long commentId, String status);

    void adminDelete(Long commentId);

    PageResponse<AdminCommentLikeResponse> adminLikePage(
            Long commentId, Long userId, Long experimentId, long page, long pageSize);

    void adminDeleteLike(Long likeId);
}
