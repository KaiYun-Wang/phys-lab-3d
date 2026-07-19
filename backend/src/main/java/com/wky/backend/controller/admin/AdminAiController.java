package com.wky.backend.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wky.backend.domain.dto.AiChatMessageRequest;
import com.wky.backend.domain.dto.AiChatMessageResponse;
import com.wky.backend.domain.dto.AiChatReplyResponse;
import com.wky.backend.domain.dto.AiChatSessionResponse;
import com.wky.backend.domain.dto.KbChunkResponse;
import com.wky.backend.domain.dto.KbDocumentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateKbChunkRequest;
import com.wky.backend.enums.CommentOwnerType;
import com.wky.backend.exception.ApiException;
import com.wky.backend.security.AuthPrincipal;
import com.wky.backend.service.IAiChatService;
import com.wky.backend.service.IKnowledgeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAiController {

    private final IKnowledgeService knowledgeService;
    private final IAiChatService aiChatService;

    @GetMapping("/knowledge/documents")
    public PageResponse<KbDocumentResponse> listDocuments(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return knowledgeService.listDocuments(page, size);
    }

    @PostMapping("/knowledge/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public KbDocumentResponse upload(
            @RequestParam(required = false) String title,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Integer chunkSize,
            @RequestParam(required = false) Integer chunkOverlap,
            @RequestParam(defaultValue = "false") boolean noChunk) {
        return knowledgeService.upload(title, file, chunkSize, chunkOverlap, noChunk);
    }

    @DeleteMapping("/knowledge/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        knowledgeService.delete(id);
    }

    @GetMapping("/knowledge/documents/{id}/chunks")
    public List<KbChunkResponse> listChunks(@PathVariable Long id) {
        return knowledgeService.listChunks(id);
    }

    @PutMapping("/knowledge/chunks/{chunkId}")
    public KbChunkResponse updateChunk(
            @PathVariable Long chunkId,
            @Valid @RequestBody UpdateKbChunkRequest request) {
        return knowledgeService.updateChunk(chunkId, request.getContent());
    }

    @DeleteMapping("/knowledge/chunks/{chunkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChunk(@PathVariable Long chunkId) {
        knowledgeService.deleteChunk(chunkId);
    }

    @GetMapping("/ai/sessions")
    public PageResponse<AiChatSessionResponse> listSessions(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return aiChatService.listSessions(requireAdmin(principal), CommentOwnerType.ADMIN, page, size);
    }

    @PostMapping("/ai/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public AiChatSessionResponse createSession(@AuthenticationPrincipal AuthPrincipal principal) {
        return aiChatService.createSession(requireAdmin(principal), CommentOwnerType.ADMIN);
    }

    @DeleteMapping("/ai/sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId) {
        aiChatService.deleteSession(requireAdmin(principal), CommentOwnerType.ADMIN, sessionId);
    }

    @GetMapping("/ai/sessions/{sessionId}/messages")
    public List<AiChatMessageResponse> listMessages(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "40") int limit) {
        return aiChatService.listMessages(
                requireAdmin(principal), CommentOwnerType.ADMIN, sessionId, beforeId, limit);
    }

    @PostMapping("/ai/sessions/{sessionId}/messages")
    public AiChatReplyResponse chat(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody AiChatMessageRequest request) {
        return aiChatService.chat(requireAdmin(principal), CommentOwnerType.ADMIN, sessionId, request);
    }

    @PostMapping(value = "/ai/sessions/{sessionId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long sessionId,
            @Valid @RequestBody AiChatMessageRequest request) {
        Long adminId = requireAdmin(principal);
        SseEmitter emitter = new SseEmitter(180_000L);
        ObjectMapper mapper = new ObjectMapper();
        SecurityContext securityContext = SecurityContextHolder.getContext();

        CompletableFuture.runAsync(() -> {
            SecurityContextHolder.setContext(securityContext);
            try {
                aiChatService.chatStream(
                        adminId,
                        CommentOwnerType.ADMIN,
                        sessionId,
                        request,
                        meta -> sendEvent(emitter, mapper, Map.of(
                                "type", "meta",
                                "sessionId", meta.sessionId(),
                                "sessionTitle", meta.sessionTitle(),
                                "userMessageId", meta.userMessageId())),
                        status -> sendEvent(emitter, mapper, Map.of("type", "status", "content", status)),
                        () -> sendEvent(emitter, mapper, Map.of("type", "clear")),
                        thinking -> sendEvent(emitter, mapper, Map.of("type", "thinking", "content", thinking)),
                        delta -> sendEvent(emitter, mapper, Map.of("type", "delta", "content", delta)),
                        done -> {
                            Map<String, Object> payload = new java.util.HashMap<>();
                            payload.put("type", "done");
                            payload.put("assistantMessageId", done.assistantMessageId());
                            payload.put("sessionId", done.session().getId());
                            payload.put("sessionTitle", done.session().getTitle());
                            if (done.thinking() != null) {
                                payload.put("thinking", done.thinking());
                            }
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

    private static void sendEvent(SseEmitter emitter, ObjectMapper mapper, Map<String, ?> payload) {
        try {
            emitter.send(SseEmitter.event().data(mapper.writeValueAsString(payload)));
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }

    private static Long requireAdmin(AuthPrincipal principal) {
        if (principal == null || !principal.isAdmin()) {
            throw new ApiException(401, "请先登录管理员账号");
        }
        return principal.id();
    }
}
