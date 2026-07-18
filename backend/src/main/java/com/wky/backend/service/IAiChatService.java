package com.wky.backend.service;

import com.wky.backend.domain.dto.AiChatMessageRequest;
import com.wky.backend.domain.dto.AiChatMessageResponse;
import com.wky.backend.domain.dto.AiChatReplyResponse;
import com.wky.backend.domain.dto.AiChatSessionResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.enums.CommentOwnerType;

import java.util.List;
import java.util.function.Consumer;

public interface IAiChatService {

    PageResponse<AiChatSessionResponse> listSessions(Long ownerId, CommentOwnerType ownerType, long page, long pageSize);

    AiChatSessionResponse createSession(Long ownerId, CommentOwnerType ownerType);

    void deleteSession(Long ownerId, CommentOwnerType ownerType, Long sessionId);

    List<AiChatMessageResponse> listMessages(Long ownerId, CommentOwnerType ownerType, Long sessionId, Long beforeId, int limit);

    AiChatReplyResponse chat(Long ownerId, CommentOwnerType ownerType, Long sessionId, AiChatMessageRequest request);

    /**
     * 流式对话。
     * onStatus：步骤提示（知识库/工具），前端单独气泡展示，不落库；
     * onClear：工具轮开始时清空当前回答气泡，便于下一轮继续流式；
     * onThinking / onDelta：可多次；思考内容仅推理模型会推送。
     */
    void chatStream(
            Long ownerId,
            CommentOwnerType ownerType,
            Long sessionId,
            AiChatMessageRequest request,
            Consumer<StreamMeta> onMeta,
            Consumer<String> onStatus,
            Runnable onClear,
            Consumer<String> onThinking,
            Consumer<String> onDelta,
            Consumer<StreamDone> onDone,
            Consumer<Throwable> onError);

    record StreamMeta(Long sessionId, String sessionTitle, Long userMessageId) {}

    record StreamDone(Long assistantMessageId, AiChatSessionResponse session, String thinking) {}
}
