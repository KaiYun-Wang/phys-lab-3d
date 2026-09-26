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
     * onStatus：短暂步骤提示；onMessage：已落库的 thinking / tool_call / tool_result；
     * onClear：工具轮开始时清空当前回答气泡（思考已通过 onMessage 固化）；
     * onThinking / onDelta：可多次流式推送。
     */
    void chatStream(
            Long ownerId,
            CommentOwnerType ownerType,
            Long sessionId,
            AiChatMessageRequest request,
            Consumer<StreamMeta> onMeta,
            Consumer<String> onStatus,
            Consumer<AiChatMessageResponse> onMessage,
            Runnable onClear,
            Consumer<String> onThinking,
            Consumer<String> onDelta,
            Consumer<StreamDone> onDone,
            Consumer<Throwable> onError);

    record StreamMeta(Long sessionId, String sessionTitle, Long userMessageId) {}

    record StreamDone(Long assistantMessageId, AiChatSessionResponse session, String thinking) {}
}
