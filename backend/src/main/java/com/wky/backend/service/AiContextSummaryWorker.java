package com.wky.backend.service;

import com.wky.backend.config.AiModelFactory;
import com.wky.backend.domain.entity.AiChatMessage;
import com.wky.backend.domain.entity.AiChatSession;
import com.wky.backend.mapper.AiChatMessageMapper;
import com.wky.backend.mapper.AiChatSessionMapper;
import dev.langchain4j.data.message.UserMessage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * ZSet 消费者：独立线程轮询，按首次入队时间取 session，再查库算右边界并生成滚动摘要。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiContextSummaryWorker {

    private static final long IDLE_SLEEP_MS = 5_000L;

    private final StringRedisTemplate redis;
    private final AiChatSessionMapper sessionMapper;
    private final AiChatMessageMapper messageMapper;
    private final AiModelFactory aiModelFactory;
    private final AiContextSummaryService summaryService;

    @PostConstruct
    void start() {
        Thread t = new Thread(this::loop, "ai-summary-worker");
        t.setDaemon(true);
        t.start();
    }

    private void loop() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                ZSetOperations.TypedTuple<String> item =
                        redis.opsForZSet().popMin(AiContextSummaryService.QUEUE_KEY);
                if (item == null || item.getValue() == null) {
                    Thread.sleep(IDLE_SLEEP_MS);
                    continue;
                }
                long sessionId = Long.parseLong(item.getValue());
                try {
                    process(sessionId);
                } catch (Exception e) {
                    log.warn("summary job failed sessionId={}: {}", sessionId, e.getMessage());
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.debug("summary poll: {}", e.getMessage());
                try {
                    Thread.sleep(IDLE_SLEEP_MS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private void process(long sessionId) {
        AiChatSession session = sessionMapper.selectById(sessionId);
        if (session == null) {
            return;
        }
        long until = AiContextSummaryService.untilOf(session);
        Long rightMsgId = summaryService.resolveRightMsgId(sessionId, until);
        if (rightMsgId == null || rightMsgId <= until) {
            return;
        }
        List<AiChatMessage> chunk = messageMapper.listDialogueBetween(sessionId, until, rightMsgId);
        if (chunk.isEmpty()) {
            return;
        }
        String prompt = buildSummarizePrompt(session.getContextSummary(), chunk);
        String newSummary;
        try {
            var response = aiModelFactory.chatModel().chat(UserMessage.from(prompt));
            newSummary = response.aiMessage() != null ? response.aiMessage().text() : null;
        } catch (Exception e) {
            log.warn("summary model call failed sessionId={}: {}", sessionId, e.getMessage());
            return;
        }
        if (!StringUtils.hasText(newSummary)) {
            return;
        }
        int n = sessionMapper.advanceSummary(sessionId, newSummary.trim(), rightMsgId);
        log.info("summary advanced sessionId={} rightMsgId={} updated={}", sessionId, rightMsgId, n);
    }

    private static String buildSummarizePrompt(String oldSummary, List<AiChatMessage> chunk) {
        StringBuilder sb = new StringBuilder();
        sb.append("请将以下对话压缩成一段简洁的中文摘要，保留关键事实、实验名、结论与未解决问题。")
                .append("只输出摘要正文，不要开场白。\n\n");
        if (StringUtils.hasText(oldSummary)) {
            sb.append("【已有摘要】\n").append(oldSummary.trim()).append("\n\n");
        }
        sb.append("【新增对话】\n");
        for (AiChatMessage m : chunk) {
            sb.append("user".equals(m.getRole()) ? "用户: " : "助手: ")
                    .append(m.getContent() == null ? "" : m.getContent())
                    .append('\n');
        }
        return sb.toString();
    }
}
