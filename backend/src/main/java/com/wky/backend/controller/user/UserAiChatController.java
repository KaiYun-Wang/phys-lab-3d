package com.wky.backend.controller.user;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wky.backend.domain.dto.AiChatMessageRequest;
import com.wky.backend.domain.dto.AiChatMessageResponse;
import com.wky.backend.domain.dto.AiChatReplyResponse;
import com.wky.backend.domain.dto.AiChatSessionResponse;
import com.wky.backend.domain.dto.AiRenameSessionRequest;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.enums.CommentOwnerType;
import com.wky.backend.exception.ApiException;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IAiChatService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/me/ai")
@RequiredArgsConstructor
public class UserAiChatController {

    private final IAiChatService aiChatService;

    @GetMapping("/sessions")
    public PageResponse<AiChatSessionResponse> listSessions(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) Long experimentId,
            @RequestParam(required = false) Boolean all,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        Long userId = requireUser(principal);
        // all=true：个人中心用，跨全部作用域（含首页与各实验）
        if (Boolean.TRUE.equals(all)) {
            return aiChatService.listAllSessions(userId, CommentOwnerType.USER, page, size);
        }
        return aiChatService.listSessions(userId, CommentOwnerType.USER, experimentId, page, size);
    }

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public AiChatSessionResponse createSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) Long experimentId) {
        return aiChatService.createSession(requireUser(principal), CommentOwnerType.USER, experimentId);
    }

    @PatchMapping("/sessions/{sessionId}")
    public AiChatSessionResponse renameSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody AiRenameSessionRequest request) {
        return aiChatService.renameSession(
                requireUser(principal), CommentOwnerType.USER, sessionId, request.getTitle());
    }

    @DeleteMapping("/sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId) {
        aiChatService.deleteSession(requireUser(principal), CommentOwnerType.USER, sessionId);
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public List<AiChatMessageResponse> listMessages(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "40") int limit) {
        return aiChatService.listMessages(
                requireUser(principal), CommentOwnerType.USER, sessionId, beforeId, limit);
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public AiChatReplyResponse chat(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody AiChatMessageRequest request) {
        return aiChatService.chat(requireUser(principal), CommentOwnerType.USER, sessionId, request);
    }

    @PostMapping(value = "/sessions/{sessionId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody AiChatMessageRequest request) {
        Long userId = requireUser(principal);
        SseEmitter emitter = new SseEmitter(180_000L);
        ObjectMapper mapper = new ObjectMapper();
        SecurityContext securityContext = SecurityContextHolder.getContext();

        CompletableFuture.runAsync(() -> {
            SecurityContextHolder.setContext(securityContext);
            try {
                aiChatService.chatStream(
                        userId,
                        CommentOwnerType.USER,
                        sessionId,
                        request,
                        meta -> sendEvent(emitter, mapper, Map.of(
                                "type", "meta",
                                "sessionId", meta.sessionId(),
                                "sessionTitle", meta.sessionTitle(),
                                "userMessageId", meta.userMessageId())),
                        status -> sendEvent(emitter, mapper, Map.of("type", "status", "content", status)),
                        msg -> sendEvent(emitter, mapper, messagePayload(msg)),
                        () -> sendEvent(emitter, mapper, Map.of("type", "clear")),
                        thinking -> sendEvent(emitter, mapper, Map.of("type", "thinking", "content", thinking)),
                        delta -> sendEvent(emitter, mapper, Map.of("type", "delta", "content", delta)),
                        done -> {
                            Map<String, Object> payload = new HashMap<>();
                            payload.put("type", "done");
                            payload.put("assistantMessageId", done.assistantMessageId());
                            payload.put("sessionId", done.session().getId());
                            payload.put("sessionTitle", done.session().getTitle());
                            sendEvent(emitter, mapper, payload);
                            emitter.complete();
                        },
                        err -> {
                            String msg = err.getMessage() != null ? err.getMessage() : "流式对话失败";
                            sendEvent(emitter, mapper, Map.of("type", "error", "message", msg));
                            emitter.complete();
                        });
            } finally {
                SecurityContextHolder.clearContext();
            }
        });

        emitter.onTimeout(emitter::complete);
        return emitter;
    }

    private static Map<String, Object> messagePayload(AiChatMessageResponse msg) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "message");
        payload.put("id", msg.getId());
        payload.put("sessionId", msg.getSessionId());
        payload.put("role", msg.getRole());
        payload.put("content", msg.getContent() != null ? msg.getContent() : "");
        if (msg.getThinking() != null) {
            payload.put("thinking", msg.getThinking());
        }
        if (msg.getContext() != null) {
            payload.put("context", msg.getContext());
        }
        if (msg.getCreateTime() != null) {
            payload.put("createTime", msg.getCreateTime().toString());
        }
        return payload;
    }

    private static void sendEvent(SseEmitter emitter, ObjectMapper mapper, Map<String, ?> payload) {
        try {
            emitter.send(SseEmitter.event().data(mapper.writeValueAsString(payload)));
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }

    private static Long requireUser(AuthPrincipal principal) {
        if (principal == null || !principal.isUser()) {
            throw new ApiException(401, "请先登录");
        }
        return principal.id();
    }
}
