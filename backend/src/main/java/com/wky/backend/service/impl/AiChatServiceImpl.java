package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wky.backend.ai.ExperimentAiTools;
import com.wky.backend.ai.KnowledgeAiTools;
import com.wky.backend.config.AiModelFactory;
import com.wky.backend.config.AiProperties;
import com.wky.backend.domain.dto.AiChatMessageRequest;
import com.wky.backend.domain.dto.AiChatMessageResponse;
import com.wky.backend.domain.dto.AiChatReplyResponse;
import com.wky.backend.domain.dto.AiChatSessionResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.AiChatMessage;
import com.wky.backend.domain.entity.AiChatSession;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.enums.CommentOwnerType;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.AiChatMessageMapper;
import com.wky.backend.mapper.AiChatSessionMapper;
import com.wky.backend.service.IAiChatService;
import com.wky.backend.service.IExperimentService;
import dev.langchain4j.agent.tool.ToolExecutionRequest;
import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.ToolExecutionResultMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.service.tool.ToolExecutor;
import dev.langchain4j.service.tool.ToolService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
public class AiChatServiceImpl implements IAiChatService {

    private static final int MAX_TOOL_ROUNDS = 6;

    private final AiChatSessionMapper sessionMapper;
    private final AiChatMessageMapper messageMapper;
    private final AiModelFactory aiModelFactory;
    private final AiProperties aiProperties;
    private final IExperimentService experimentService;
    private final ExperimentAiTools experimentAiTools;
    private final KnowledgeAiTools knowledgeAiTools;

    private List<ToolSpecification> toolSpecifications;
    private Map<String, ToolExecutor> toolExecutors;

    @PostConstruct
    void initTools() {
        ToolService toolService = new ToolService();
        toolService.tools(List.of(experimentAiTools, knowledgeAiTools));
        toolService.maxSequentialToolsInvocations(MAX_TOOL_ROUNDS);
        this.toolSpecifications = toolService.toolSpecifications();
        this.toolExecutors = toolService.toolExecutors();
    }

    @Override
    public PageResponse<AiChatSessionResponse> listSessions(
            Long ownerId, CommentOwnerType ownerType, long page, long pageSize) {
        Page<AiChatSession> p = sessionMapper.selectPage(
                new Page<>(page, pageSize),
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getOwnerId, ownerId)
                        .eq(AiChatSession::getOwnerType, ownerType)
                        .orderByDesc(AiChatSession::getUpdateTime));
        List<AiChatSessionResponse> records = p.getRecords().stream().map(this::toSession).toList();
        return new PageResponse<>(records, p.getTotal(), page, pageSize);
    }

    @Override
    @Transactional
    public AiChatSessionResponse createSession(Long ownerId, CommentOwnerType ownerType) {
        AiChatSession session = new AiChatSession();
        session.setOwnerId(ownerId);
        session.setOwnerType(ownerType);
        session.setTitle("新对话");
        sessionMapper.insert(session);
        return toSession(session);
    }

    @Override
    @Transactional
    public void deleteSession(Long ownerId, CommentOwnerType ownerType, Long sessionId) {
        AiChatSession session = requireOwnedSession(ownerId, ownerType, sessionId);
        messageMapper.delete(new LambdaQueryWrapper<AiChatMessage>()
                .eq(AiChatMessage::getSessionId, session.getId()));
        sessionMapper.deleteById(session.getId());
    }

    @Override
    public List<AiChatMessageResponse> listMessages(
            Long ownerId, CommentOwnerType ownerType, Long sessionId, Long beforeId, int limit) {
        requireOwnedSession(ownerId, ownerType, sessionId);
        int size = Math.min(Math.max(limit, 1), 100);
        LambdaQueryWrapper<AiChatMessage> q = new LambdaQueryWrapper<AiChatMessage>()
                .eq(AiChatMessage::getSessionId, sessionId)
                .orderByDesc(AiChatMessage::getId)
                .last("LIMIT " + size);
        if (beforeId != null && beforeId > 0) {
            q.lt(AiChatMessage::getId, beforeId);
        }
        List<AiChatMessage> rows = messageMapper.selectList(q);
        List<AiChatMessageResponse> out = new ArrayList<>(rows.size());
        for (int i = rows.size() - 1; i >= 0; i--) {
            out.add(toMessage(rows.get(i)));
        }
        return out;
    }

    @Override
    @Transactional
    public AiChatReplyResponse chat(
            Long ownerId, CommentOwnerType ownerType, Long sessionId, AiChatMessageRequest request) {
        PreparedChat prepared = prepareChat(ownerId, ownerType, sessionId, request);
        String answer = generateAnswerSync(prepared.session(), prepared.messages());
        AiChatMessage assistantMsg = saveAssistant(prepared.session(), answer);
        return AiChatReplyResponse.builder()
                .userMessage(toMessage(prepared.userMsg()))
                .assistantMessage(toMessage(assistantMsg))
                .session(toSession(prepared.session()))
                .build();
    }

    @Override
    public void chatStream(
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
            Consumer<Throwable> onError) {
        try {
            onStatus.accept("正在准备回答…");
            PreparedChat prepared = prepareChat(ownerId, ownerType, sessionId, request);
            AiChatSession session = prepared.session();
            onMeta.accept(new StreamMeta(
                    session.getId(),
                    session.getTitle(),
                    prepared.userMsg().getId()));

            List<ChatMessage> working = new ArrayList<>(prepared.messages());
            StringBuilder full = new StringBuilder();
            StringBuilder thinkingBuf = new StringBuilder();
            boolean finished = false;

            for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
                CountDownLatch latch = new CountDownLatch(1);
                AtomicReference<Throwable> errorRef = new AtomicReference<>();
                AtomicReference<ChatResponse> completeRef = new AtomicReference<>();
                StringBuilder roundText = new StringBuilder();
                StringBuilder roundThinking = new StringBuilder();

                aiModelFactory.streamingChatModel().chat(
                        ChatRequest.builder()
                                .messages(working)
                                .toolSpecifications(toolSpecifications)
                                .build(),
                        new StreamingChatResponseHandler() {
                            @Override
                            public void onPartialThinking(
                                    dev.langchain4j.model.chat.response.PartialThinking partialThinking) {
                                if (partialThinking == null || !StringUtils.hasText(partialThinking.text())) {
                                    return;
                                }
                                roundThinking.append(partialThinking.text());
                                thinkingBuf.append(partialThinking.text());
                                onThinking.accept(partialThinking.text());
                            }

                            @Override
                            public void onPartialResponse(String partialResponse) {
                                if (!StringUtils.hasText(partialResponse)) {
                                    return;
                                }
                                roundText.append(partialResponse);
                                onDelta.accept(partialResponse);
                            }

                            @Override
                            public void onCompleteResponse(ChatResponse completeResponse) {
                                completeRef.set(completeResponse);
                                latch.countDown();
                            }

                            @Override
                            public void onError(Throwable error) {
                                errorRef.set(error);
                                latch.countDown();
                            }
                        });

                if (!latch.await(180, TimeUnit.SECONDS)) {
                    onError.accept(new ApiException(504, "模型响应超时"));
                    return;
                }
                Throwable err = errorRef.get();
                if (err != null) {
                    onError.accept(err instanceof ApiException
                            ? err
                            : new ApiException(502, "调用 AI 模型失败：" + err.getMessage()));
                    return;
                }

                ChatResponse completeResponse = completeRef.get();
                AiMessage aiMessage = completeResponse != null ? completeResponse.aiMessage() : null;
                if (aiMessage != null
                        && roundThinking.length() == 0
                        && StringUtils.hasText(aiMessage.thinking())) {
                    roundThinking.append(aiMessage.thinking());
                    thinkingBuf.append(aiMessage.thinking());
                    onThinking.accept(aiMessage.thinking());
                }

                if (aiMessage != null && aiMessage.hasToolExecutionRequests()) {
                    // 本轮是工具调用：清空回答气泡，用 status 气泡展示步骤，再继续流式
                    onClear.run();
                    full.setLength(0);
                    saveThinking(session, roundThinking.toString());
                    thinkingBuf.setLength(0);
                    working.add(aiMessage);
                    appendToolResults(session, working, aiMessage.toolExecutionRequests(), onStatus);
                    onStatus.accept("继续生成回答…");
                    continue;
                }

                String answer = roundText.toString();
                if (!StringUtils.hasText(answer) && aiMessage != null && StringUtils.hasText(aiMessage.text())) {
                    answer = aiMessage.text();
                    onDelta.accept(answer);
                }
                if (!StringUtils.hasText(answer)) {
                    answer = "（模型未返回内容）";
                    onDelta.accept(answer);
                }
                full.append(answer);
                finished = true;
                break;
            }

            if (!finished || full.length() == 0) {
                onError.accept(new ApiException(502, !finished ? "工具调用轮次过多" : "模型未返回内容"));
                return;
            }
            String thinking = thinkingBuf.toString();
            saveThinking(session, thinking);
            AiChatMessage assistantMsg = saveAssistant(session, full.toString());
            onDone.accept(new StreamDone(
                    assistantMsg.getId(), toSession(session), blankToNull(thinking)));
        } catch (Exception e) {
            onError.accept(e instanceof ApiException
                    ? e
                    : new ApiException(502, "调用 AI 模型失败：" + e.getMessage()));
        }
    }

    private PreparedChat prepareChat(
            Long ownerId, CommentOwnerType ownerType, Long sessionId, AiChatMessageRequest request) {
        AiChatSession session = requireOwnedSession(ownerId, ownerType, sessionId);
        String content = request.getContent().trim();
        Map<String, Object> context = request.getContext();

        AiChatMessage userMsg = new AiChatMessage();
        userMsg.setSessionId(session.getId());
        userMsg.setRole("user");
        userMsg.setContent(content);
        userMsg.setContextJson(context);
        messageMapper.insert(userMsg);

        if ("新对话".equals(session.getTitle())) {
            session.setTitle(truncateTitle(content));
        }
        session.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(session);

        List<ChatMessage> messages = buildChatMessages(session.getId(), context);
        return new PreparedChat(session, userMsg, messages);
    }

    private AiChatMessage saveAssistant(AiChatSession session, String answer) {
        AiChatMessage assistantMsg = insertMessage(session.getId(), "assistant", answer, null);
        session.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(session);
        return assistantMsg;
    }

    private void saveThinking(AiChatSession session, String thinking) {
        if (!StringUtils.hasText(thinking)) {
            return;
        }
        insertMessage(session.getId(), "thinking", thinking, null);
    }

    private AiChatMessage insertMessage(
            Long sessionId, String role, String content, Map<String, Object> contextJson) {
        AiChatMessage msg = new AiChatMessage();
        msg.setSessionId(sessionId);
        msg.setRole(role);
        msg.setContent(content);
        msg.setContextJson(contextJson);
        messageMapper.insert(msg);
        return msg;
    }

    private String generateAnswerSync(AiChatSession session, List<ChatMessage> messages) {
        try {
            List<ChatMessage> working = new ArrayList<>(messages);
            for (int i = 0; i < MAX_TOOL_ROUNDS; i++) {
                ChatResponse response = aiModelFactory.chatModel().chat(ChatRequest.builder()
                        .messages(working)
                        .toolSpecifications(toolSpecifications)
                        .build());
                AiMessage aiMessage = response.aiMessage();
                if (aiMessage == null) {
                    return "（模型未返回内容）";
                }
                if (aiMessage.hasToolExecutionRequests()) {
                    saveThinking(session, aiMessage.thinking());
                    working.add(aiMessage);
                    appendToolResults(session, working, aiMessage.toolExecutionRequests(), status -> {});
                    continue;
                }
                saveThinking(session, aiMessage.thinking());
                return StringUtils.hasText(aiMessage.text()) ? aiMessage.text() : "（模型未返回内容）";
            }
            throw new ApiException(502, "工具调用轮次过多");
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(502, "调用 AI 模型失败：" + e.getMessage());
        }
    }

    private void appendToolResults(
            AiChatSession session,
            List<ChatMessage> working,
            List<ToolExecutionRequest> requests,
            Consumer<String> onStatus) {
        for (ToolExecutionRequest request : requests) {
            String label = toolLabel(request.name());
            onStatus.accept("调用工具：" + label + "…");
            Map<String, Object> callCtx = new LinkedHashMap<>();
            callCtx.put("name", request.name());
            callCtx.put("arguments", request.arguments());
            callCtx.put("toolCallId", request.id());
            insertMessage(session.getId(), "tool_call", "调用工具：" + label, callCtx);

            ToolExecutor executor = toolExecutors.get(request.name());
            String result;
            try {
                result = executor != null
                        ? executor.execute(request, null)
                        : "未知工具：" + request.name();
            } catch (Exception e) {
                result = "工具执行失败：" + e.getMessage();
            }
            onStatus.accept("工具完成：" + label);
            Map<String, Object> resultCtx = new LinkedHashMap<>();
            resultCtx.put("toolCallId", request.id());
            resultCtx.put("name", request.name());
            insertMessage(session.getId(), "tool_result", truncateForStore(result), resultCtx);
            working.add(ToolExecutionResultMessage.from(request, result));
        }
    }

    /** ponytail: store cap only; prompt-side tool-result truncate if needed later */
    private static String truncateForStore(String s) {
        if (s == null) return "";
        return s.length() <= 32_000 ? s : s.substring(0, 32_000) + "…";
    }

    private static String toolLabel(String name) {
        return switch (name) {
            case "listPublishedExperiments" -> "查询已发布实验";
            case "listKnowledgePages" -> "查询知识页目录";
            case "getKnowledgePageContents" -> "读取知识页正文";
            default -> name;
        };
    }

    private List<ChatMessage> buildChatMessages(Long sessionId, Map<String, Object> context) {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(SystemMessage.from(buildSystemPrompt(context)));

        // 按消息行滑动窗口；thinking/tool_* 占窗口但不入模（还原链留给步骤⑤）
        List<AiChatMessage> history = messageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessage>()
                        .eq(AiChatMessage::getSessionId, sessionId)
                        .orderByDesc(AiChatMessage::getId)
                        .last("LIMIT " + aiProperties.getHistoryLimit()));
        for (int i = history.size() - 1; i >= 0; i--) {
            AiChatMessage m = history.get(i);
            if ("user".equals(m.getRole())) {
                messages.add(UserMessage.from(m.getContent()));
            } else if ("assistant".equals(m.getRole())) {
                messages.add(AiMessage.from(m.getContent()));
            }
        }
        return messages;
    }

    private String buildSystemPrompt(Map<String, Object> context) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是 PhysLab 3D 交互物理实验平台的实验助手。用简洁中文回答。\n")
                .append("回答规则：\n")
                .append("1. 涉及本平台有哪些实验、某实验是否存在、实验简介/入口（route）时：")
                .append("必须先调用工具 listPublishedExperiments 查询，再根据工具结果回答；不要凭记忆编造平台实验。\n")
                .append("2. 涉及实验原理、操作说明、平台知识文档时：先调用 listKnowledgePages（可带关键词或留空看全目录），")
                .append("根据返回的 description 判断相关文档，再调用 getKnowledgePageContents 拉取必要正文；")
                .append("不要一次拉取全部正文；知识页有相关内容时必须依据正文回答，并可说明来自知识页。\n")
                .append("3. 一般性问题（如自我介绍、问候、通用物理概念解释等）：可用你自身可靠知识回答，")
                .append("但不要假装来自本平台知识页。\n")
                .append("4. 禁止编造：不要虚构本平台不存在的实验名称/功能；不要捏造未给出的实验参数或文档内容。\n")
                .append("5. 确实不知道或资料不足时，直接说不知道，不要猜测凑答。\n");

        if (context != null && !context.isEmpty()) {
            sb.append("\n【用户当前页面】\n");
            Object path = context.get("path");
            Object pageType = context.get("pageType");
            Object experimentId = context.get("experimentId");
            Object experimentTitle = context.get("experimentTitle");
            if (path != null) sb.append("- path: ").append(path).append('\n');
            if (pageType != null) sb.append("- pageType: ").append(pageType).append('\n');
            if (experimentTitle != null) sb.append("- 实验: ").append(experimentTitle).append('\n');
            if (experimentId != null) {
                sb.append("- experimentId: ").append(experimentId).append('\n');
                try {
                    Long id = Long.valueOf(String.valueOf(experimentId));
                    Experiment exp = experimentService.getById(id);
                    if (exp != null) {
                        sb.append("- 实验说明: ").append(nullToEmpty(exp.getDescription())).append('\n');
                    }
                } catch (Exception ignored) {
                    // ignore
                }
            }
        }

        return sb.toString();
    }

    private AiChatSession requireOwnedSession(Long ownerId, CommentOwnerType ownerType, Long sessionId) {
        AiChatSession session = sessionMapper.selectById(sessionId);
        if (session == null) {
            throw new ApiException(404, "会话不存在");
        }
        if (!ownerId.equals(session.getOwnerId()) || ownerType != session.getOwnerType()) {
            throw new ApiException(403, "无权访问该会话");
        }
        return session;
    }

    private AiChatSessionResponse toSession(AiChatSession s) {
        return AiChatSessionResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .createTime(s.getCreateTime())
                .updateTime(s.getUpdateTime())
                .build();
    }

    private AiChatMessageResponse toMessage(AiChatMessage m) {
        String thinking = null;
        if ("thinking".equals(m.getRole())) {
            thinking = m.getContent();
        } else if ("assistant".equals(m.getRole())) {
            // 旧数据：thinking 曾塞在 assistant.context_json
            thinking = extractThinking(m.getContextJson());
        }
        return AiChatMessageResponse.builder()
                .id(m.getId())
                .sessionId(m.getSessionId())
                .role(m.getRole())
                .content(m.getContent())
                .thinking(thinking)
                .context(m.getContextJson())
                .createTime(m.getCreateTime())
                .build();
    }

    private static String extractThinking(Map<String, Object> contextJson) {
        if (contextJson == null) return null;
        Object t = contextJson.get("thinking");
        return t == null ? null : String.valueOf(t);
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s : null;
    }

    private static String truncateTitle(String content) {
        String t = content.replaceAll("\\s+", " ").trim();
        if (t.length() <= 40) return t.isEmpty() ? "新对话" : t;
        return t.substring(0, 40) + "…";
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private record PreparedChat(
            AiChatSession session, AiChatMessage userMsg, List<ChatMessage> messages) {}
}
