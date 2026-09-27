package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wky.backend.ai.ExperimentAiTools;
import com.wky.backend.ai.KnowledgeAiTools;
import com.wky.backend.config.AiModelFactory;
import com.wky.backend.config.AiProperties;
import com.wky.backend.demo.DemoAiTools;
import com.wky.backend.demo.DemoChatContext;
import com.wky.backend.demo.ExperimentDefinitionRegistry;
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
import com.wky.backend.service.AiContextSummaryService;
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
import dev.langchain4j.model.openai.OpenAiChatRequestParameters;
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
    private final AiContextSummaryService summaryService;
    private final IExperimentService experimentService;
    private final ExperimentAiTools experimentAiTools;
    private final KnowledgeAiTools knowledgeAiTools;
    private final DemoAiTools demoAiTools;
    private final ExperimentDefinitionRegistry experimentDefinitionRegistry;

    /** Base tools always; demoTools = base + createDemo/lookupDemo. */
    private ToolBundle baseTools;
    private ToolBundle demoTools;

    @PostConstruct
    void initTools() {
        this.baseTools = buildToolBundle(List.of(experimentAiTools, knowledgeAiTools));
        this.demoTools = buildToolBundle(List.of(experimentAiTools, knowledgeAiTools, demoAiTools));
    }

    private static ToolBundle buildToolBundle(List<Object> tools) {
        ToolService toolService = new ToolService();
        toolService.tools(tools);
        toolService.maxSequentialToolsInvocations(MAX_TOOL_ROUNDS);
        return new ToolBundle(toolService.toolSpecifications(), toolService.toolExecutors());
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
        try {
            bindDemoContext(ownerId, prepared.context(), prepared.demoEnabled());
            String answer = prepared.busy()
                    ? AiContextSummaryService.BUSY_MSG
                    : generateAnswerSync(prepared);
            AiChatMessage assistantMsg = saveAssistant(prepared.session(), answer);
            return AiChatReplyResponse.builder()
                    .userMessage(toMessage(prepared.userMsg()))
                    .assistantMessage(toMessage(assistantMsg))
                    .session(toSession(prepared.session()))
                    .build();
        } finally {
            DemoChatContext.clear();
        }
    }

    @Override
    public void chatStream(
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
            Consumer<Throwable> onError) {
        try {
            PreparedChat prepared = prepareChat(ownerId, ownerType, sessionId, request);
            bindDemoContext(ownerId, prepared.context(), prepared.demoEnabled());
            AiChatSession session = prepared.session();
            onMeta.accept(new StreamMeta(
                    session.getId(),
                    session.getTitle(),
                    prepared.userMsg().getId()));

            if (prepared.busy()) {
                onDelta.accept(AiContextSummaryService.BUSY_MSG);
                AiChatMessage assistantMsg = saveAssistant(session, AiContextSummaryService.BUSY_MSG);
                onDone.accept(new StreamDone(assistantMsg.getId(), toSession(session), null));
                return;
            }

            onStatus.accept("正在准备回答…");
            List<ChatMessage> working = new ArrayList<>(prepared.messages());
            StringBuilder full = new StringBuilder();
            boolean finished = false;

            for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
                CountDownLatch latch = new CountDownLatch(1);
                AtomicReference<Throwable> errorRef = new AtomicReference<>();
                AtomicReference<ChatResponse> completeRef = new AtomicReference<>();
                StringBuilder roundText = new StringBuilder();
                StringBuilder roundThinking = new StringBuilder();

                aiModelFactory.streamingChatModel().chat(
                        buildChatRequest(working, prepared.enableThinking(), prepared.tools()),
                        new StreamingChatResponseHandler() {
                            @Override
                            public void onPartialThinking(
                                    dev.langchain4j.model.chat.response.PartialThinking partialThinking) {
                                if (partialThinking == null || !StringUtils.hasText(partialThinking.text())) {
                                    return;
                                }
                                roundThinking.append(partialThinking.text());
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
                    onThinking.accept(aiMessage.thinking());
                }

                if (aiMessage != null && aiMessage.hasToolExecutionRequests()) {
                    // 先固化本轮思考，再清回答气泡，避免思考闪一下消失
                    emitMessage(onMessage, saveThinking(session, roundThinking.toString()));
                    onClear.run();
                    full.setLength(0);
                    working.add(aiMessage);
                    appendToolResults(
                            session, working, aiMessage.toolExecutionRequests(), prepared.tools(), onMessage);
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
                emitMessage(onMessage, saveThinking(session, roundThinking.toString()));
                finished = true;
                break;
            }

            if (!finished || full.length() == 0) {
                onError.accept(new ApiException(502, !finished ? "工具调用轮次过多" : "模型未返回内容"));
                return;
            }
            AiChatMessage assistantMsg = saveAssistant(session, full.toString());
            onDone.accept(new StreamDone(assistantMsg.getId(), toSession(session), null));
        } catch (Exception e) {
            onError.accept(e instanceof ApiException
                    ? e
                    : new ApiException(502, "调用 AI 模型失败：" + e.getMessage()));
        } finally {
            DemoChatContext.clear();
        }
    }

    private PreparedChat prepareChat(
            Long ownerId, CommentOwnerType ownerType, Long sessionId, AiChatMessageRequest request) {
        AiChatSession session = requireOwnedSession(ownerId, ownerType, sessionId);
        String content = request.getContent().trim();
        Map<String, Object> context = request.getContext();
        boolean demoEnabled = demoToolsAvailable(context);
        ToolBundle tools = demoEnabled ? demoTools : baseTools;

        AiChatMessage userMsg = new AiChatMessage();
        userMsg.setSessionId(session.getId());
        userMsg.setRole("user");
        userMsg.setContent(content);
        // 只落轻量页面身份，不存实时参数（避免回复期间用户改参导致错位）
        userMsg.setContextJson(slimPageContext(context));
        messageMapper.insert(userMsg);

        if ("新对话".equals(session.getTitle())) {
            session.setTitle(truncateTitle(content));
        }
        session.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(session);

        session = sessionMapper.selectById(session.getId());
        boolean busy = summaryService.checkAndMaybeEnqueue(session);
        boolean enableThinking = Boolean.TRUE.equals(request.getEnableThinking());
        if (busy) {
            return new PreparedChat(session, userMsg, List.of(), true, enableThinking, context, demoEnabled, tools);
        }
        return new PreparedChat(
                session,
                userMsg,
                buildChatMessages(session, context, demoEnabled),
                false,
                enableThinking,
                context,
                demoEnabled,
                tools);
    }

    private void bindDemoContext(Long ownerId, Map<String, Object> context, boolean demoEnabled) {
        if (!demoEnabled) {
            return;
        }
        String route = resolveExperimentRoute(context);
        Long experimentId = null;
        if (context != null && context.get("experimentId") != null) {
            try {
                experimentId = Long.valueOf(String.valueOf(context.get("experimentId")));
            } catch (Exception ignored) {
                // ignore
            }
        }
        DemoChatContext.set(ownerId, route, experimentId);
    }

    private boolean demoToolsAvailable(Map<String, Object> context) {
        if (context == null) {
            return false;
        }
        Object pageType = context.get("pageType");
        if (pageType == null || !"experiment".equalsIgnoreCase(String.valueOf(pageType).trim())) {
            return false;
        }
        return experimentDefinitionRegistry.supports(resolveExperimentRoute(context));
    }

    /** Prefer experimentRoute, then path /experiments/{route}, then title heuristics. */
    static String resolveExperimentRoute(Map<String, Object> context) {
        if (context == null) {
            return null;
        }
        Object route = context.get("experimentRoute");
        if (route != null && StringUtils.hasText(String.valueOf(route))) {
            return String.valueOf(route).trim();
        }
        Object path = context.get("path");
        if (path != null) {
            String p = String.valueOf(path);
            int idx = p.indexOf("/experiments/");
            if (idx >= 0) {
                String rest = p.substring(idx + "/experiments/".length());
                int slash = rest.indexOf('/');
                String seg = slash < 0 ? rest : rest.substring(0, slash);
                if (StringUtils.hasText(seg)) {
                    return seg.trim();
                }
            }
        }
        Object title = context.get("experimentTitle");
        if (title != null) {
            String t = String.valueOf(title).toLowerCase();
            if (t.contains("venturi") || t.contains("文丘里") || t.contains("伯努利")) {
                return "bernoulli-venturi";
            }
        }
        return null;
    }

    private AiChatMessage saveAssistant(AiChatSession session, String answer) {
        AiChatMessage assistantMsg = insertMessage(session.getId(), "assistant", answer, null);
        session.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(session);
        return assistantMsg;
    }

    private AiChatMessage saveThinking(AiChatSession session, String thinking) {
        if (!StringUtils.hasText(thinking)) {
            return null;
        }
        return insertMessage(session.getId(), "thinking", thinking, null);
    }

    private void emitMessage(Consumer<AiChatMessageResponse> onMessage, AiChatMessage msg) {
        if (msg != null && onMessage != null) {
            onMessage.accept(toMessage(msg));
        }
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

    private String generateAnswerSync(PreparedChat prepared) {
        try {
            List<ChatMessage> working = new ArrayList<>(prepared.messages());
            for (int i = 0; i < MAX_TOOL_ROUNDS; i++) {
                ChatResponse response = aiModelFactory
                        .chatModel()
                        .chat(buildChatRequest(working, prepared.enableThinking(), prepared.tools()));
                AiMessage aiMessage = response.aiMessage();
                if (aiMessage == null) {
                    return "（模型未返回内容）";
                }
                if (aiMessage.hasToolExecutionRequests()) {
                    saveThinking(prepared.session(), aiMessage.thinking());
                    working.add(aiMessage);
                    appendToolResults(
                            prepared.session(),
                            working,
                            aiMessage.toolExecutionRequests(),
                            prepared.tools(),
                            null);
                    continue;
                }
                saveThinking(prepared.session(), aiMessage.thinking());
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
            ToolBundle tools,
            Consumer<AiChatMessageResponse> onMessage) {
        for (ToolExecutionRequest request : requests) {
            String label = toolLabel(request.name());
            Map<String, Object> callCtx = new LinkedHashMap<>();
            callCtx.put("name", request.name());
            callCtx.put("arguments", request.arguments());
            callCtx.put("toolCallId", request.id());
            AiChatMessage callMsg =
                    insertMessage(session.getId(), "tool_call", "调用工具：" + label, callCtx);
            emitMessage(onMessage, callMsg);

            ToolExecutor executor = tools.executors().get(request.name());
            String result;
            try {
                result = executor != null
                        ? executor.execute(request, null)
                        : "未知工具：" + request.name();
            } catch (Exception e) {
                result = "工具执行失败：" + e.getMessage();
            }
            Map<String, Object> resultCtx = new LinkedHashMap<>();
            resultCtx.put("toolCallId", request.id());
            resultCtx.put("name", request.name());
            AiChatMessage resultMsg =
                    insertMessage(session.getId(), "tool_result", truncateForStore(result), resultCtx);
            emitMessage(onMessage, resultMsg);
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
            case "createDemo" -> "生成演示计划";
            case "lookupDemo" -> "查询演示剧本";
            default -> name;
        };
    }

    private ChatRequest buildChatRequest(
            List<ChatMessage> messages, boolean enableThinking, ToolBundle tools) {
        return ChatRequest.builder()
                .messages(messages)
                .parameters(OpenAiChatRequestParameters.builder()
                        .toolSpecifications(tools.specifications())
                        .customParameters(Map.of(
                                "thinking",
                                Map.of("type", enableThinking ? "enabled" : "disabled")))
                        .build())
                .build();
    }

    private List<ChatMessage> buildChatMessages(
            AiChatSession session, Map<String, Object> context, boolean demoEnabled) {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(SystemMessage.from(buildSystemPrompt(context, demoEnabled)));
        if (StringUtils.hasText(session.getContextSummary())) {
            messages.add(SystemMessage.from("此前对话摘要：\n" + session.getContextSummary().trim()));
        }
        for (AiChatMessage m : loadDialogueWindow(session)) {
            ChatMessage chat = toChatMessage(m);
            if (chat != null) {
                messages.add(chat);
            }
        }
        return messages;
    }

    /** 落库行 → LangChain4j；thinking 不入模；残缺 tool 行跳过。 */
    private static ChatMessage toChatMessage(AiChatMessage m) {
        return switch (m.getRole()) {
            case "user" -> UserMessage.from(nullToEmpty(m.getContent()));
            case "assistant" -> AiMessage.from(nullToEmpty(m.getContent()));
            case "tool_call" -> {
                ToolExecutionRequest req = toToolRequest(m);
                yield req == null ? null : AiMessage.from(req);
            }
            case "tool_result" -> {
                String id = ctxStr(m.getContextJson(), "toolCallId");
                String name = ctxStr(m.getContextJson(), "name");
                if (!StringUtils.hasText(id) || !StringUtils.hasText(name)) {
                    yield null;
                }
                yield ToolExecutionResultMessage.from(id, name, nullToEmpty(m.getContent()));
            }
            default -> null;
        };
    }

    private static ToolExecutionRequest toToolRequest(AiChatMessage m) {
        String name = ctxStr(m.getContextJson(), "name");
        if (!StringUtils.hasText(name)) {
            return null;
        }
        String id = ctxStr(m.getContextJson(), "toolCallId");
        String args = ctxStr(m.getContextJson(), "arguments");
        return ToolExecutionRequest.builder()
                .id(StringUtils.hasText(id) ? id : "unknown")
                .name(name)
                .arguments(StringUtils.hasText(args) ? args : "{}")
                .build();
    }

    private static String ctxStr(Map<String, Object> ctx, String key) {
        if (ctx == null) {
            return null;
        }
        Object v = ctx.get(key);
        if (v == null) {
            return null;
        }
        return v instanceof String s ? s : String.valueOf(v);
    }

    /** 摘要截止后的对话+工具；不足 historyMin 则从 until 往前补。 */
    private List<AiChatMessage> loadDialogueWindow(AiChatSession session) {
        long until = AiContextSummaryService.untilOf(session);
        int min = Math.max(0, aiProperties.getHistoryMin());
        List<AiChatMessage> after = messageMapper.listDialogueAfterAsc(session.getId(), until);
        List<AiChatMessage> window = new ArrayList<>();
        if (after.size() < min && until > 0) {
            int need = min - after.size();
            if (need > 0) {
                List<AiChatMessage> before = messageMapper.listDialogueBeforeDesc(session.getId(), until, need);
                for (int i = before.size() - 1; i >= 0; i--) {
                    window.add(before.get(i));
                }
            }
        }
        window.addAll(after);
        return window;
    }

    private String buildSystemPrompt(Map<String, Object> context, boolean demoEnabled) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是 PhysLab 3D 交互物理实验平台的实验助手。\n")
                .append("回答语言：跟随用户——用户用中文则中文回复；用户用英文（或其它外语）则用英文回复。不要擅自把用户的外语请求改成中文。\n")
                .append("回答规则：\n")
                .append("1. 涉及本平台有哪些实验、某实验是否存在、实验简介时：")
                .append("必须先调用工具 listPublishedExperiments 查询，再根据工具结果回答；不要凭记忆编造平台实验。\n")
                .append("2. 涉及实验原理、操作说明、平台知识文档时：先调用 listKnowledgePages（可带关键词或留空看全目录），")
                .append("根据返回的 description 判断相关文档，再调用 getKnowledgePageContents 拉取必要正文；")
                .append("不要一次拉取全部正文；知识页有相关内容时必须依据正文回答，并可说明来自知识页。\n")
                .append("3. 一般性问题（如自我介绍、问候、通用物理概念解释等）：可用你自身可靠知识回答，")
                .append("但不要假装来自本平台知识页。\n")
                .append("4. 禁止编造：不要虚构本平台不存在的实验名称/功能；不要捏造未给出的实验参数或文档内容。\n")
                .append("5. 确实不知道或资料不足时，直接说不知道，不要猜测凑答。\n")
                .append("6. 对用户只说人话：禁止在回复里出现程序内部字段、协议名或机器标识，")
                .append("例如 id / demoId / experimentId / sessionId / route / pageType / path、")
                .append("CREATED_DEMO、tool 名、JSON 键名、枚举原值（ready/playing 等）、驼峰参数名（v1、areaRatio）等。")
                .append("用标题、实验名、可读参数名（入口流速/inlet velocity、面积比/area ratio）等用户能看懂的说法。")
                .append("工具入参/出参里的内部字段仅供你自己使用，不要原样抄进对用户的文字。\n");

        if (demoEnabled) {
            sb.append("7. 当前页支持实验演示：当用户明确要求演示、教程、带练、逐步讲解当前实验时，")
                    .append("调用 createDemo(goal) 生成计划；工具只生成并保存计划，不会自动播放，")
                    .append("用户需稍后自行点击开始。")
                    .append("goal 必须保持用户原话的语言与意图（用户英文提问则 goal 用英文，禁止先译成中文再传入）。\n")
                    .append("8. 用户询问某次演示的内容、步骤、随堂题或答案时，调用 lookupDemo：")
                    .append("有引用/已知内部 id 时传 demoId；否则用标题关键词 query。")
                    .append("工具会返回完整剧本（含题目与标准答案），据此作答，勿声称平台没有题目；")
                    .append("向用户复述只用演示标题与题目内容。\n");
        }

        if (context != null && !context.isEmpty()) {
            sb.append("\n【用户当前页面】\n");
            Object path = context.get("path");
            Object pageType = context.get("pageType");
            Object experimentId = context.get("experimentId");
            Object experimentTitle = context.get("experimentTitle");
            Object experimentRoute = context.get("experimentRoute");
            if (path != null) sb.append("- path: ").append(path).append('\n');
            if (pageType != null) sb.append("- pageType: ").append(pageType).append('\n');
            if (experimentTitle != null) sb.append("- 实验: ").append(experimentTitle).append('\n');
            String resolved = resolveExperimentRoute(context);
            if (experimentRoute != null) {
                sb.append("- experimentRoute: ").append(experimentRoute).append('\n');
            } else if (resolved != null) {
                sb.append("- experimentRoute: ").append(resolved).append('\n');
            }
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
            Object refs = context.get("referencedDemoIds");
            if (refs instanceof List<?> list && !list.isEmpty()) {
                sb.append("- 用户本条消息引用的演示（内部 id，仅供工具，勿写入对用户回复）: ")
                        .append(list)
                        .append('\n');
                sb.append("  （相关问题优先 lookupDemo；对用户只用演示标题）\n");
            } else if (refs != null && StringUtils.hasText(String.valueOf(refs))) {
                sb.append("- 用户本条消息引用的演示 id: ").append(refs).append('\n');
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

    /** 用户消息只存页面身份与引用演示，不存 snapshot 等易过期字段。 */
    private static Map<String, Object> slimPageContext(Map<String, Object> context) {
        if (context == null || context.isEmpty()) {
            return null;
        }
        Map<String, Object> slim = new LinkedHashMap<>();
        for (String key : List.of(
                "path",
                "pageType",
                "experimentId",
                "experimentTitle",
                "experimentRoute",
                "referencedDemoIds")) {
            if (context.get(key) != null) {
                slim.put(key, context.get(key));
            }
        }
        return slim.isEmpty() ? null : slim;
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

    private record ToolBundle(
            List<ToolSpecification> specifications, Map<String, ToolExecutor> executors) {}

    private record PreparedChat(
            AiChatSession session,
            AiChatMessage userMsg,
            List<ChatMessage> messages,
            boolean busy,
            boolean enableThinking,
            Map<String, Object> context,
            boolean demoEnabled,
            ToolBundle tools) {}
}
