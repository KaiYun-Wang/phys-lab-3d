package com.wky.backend.service;

import com.wky.backend.config.AiModelFactory;
import com.wky.backend.domain.entity.AiChatMessage;
import com.wky.backend.domain.entity.AiChatSession;
import com.wky.backend.mapper.AiChatMessageMapper;
import com.wky.backend.mapper.AiChatSessionMapper;
import dev.langchain4j.data.message.UserMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Redis Streams 消费者：生成滚动摘要，until 单调推进。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiContextSummaryWorker {

    private static final String CONSUMER_NAME = "backend-1";

    private final StringRedisTemplate redis;
    private final AiChatSessionMapper sessionMapper;
    private final AiChatMessageMapper messageMapper;
    private final AiModelFactory aiModelFactory;
    private final AiContextSummaryService summaryService;

    @Scheduled(fixedDelay = 2000)
    public void poll() {
        try {
            @SuppressWarnings("unchecked")
            List<MapRecord<String, Object, Object>> records =
                    (List<MapRecord<String, Object, Object>>) (List<?>) redis.opsForStream().read(
                    Consumer.from(AiContextSummaryService.GROUP, CONSUMER_NAME),
                    StreamReadOptions.empty().count(1).block(Duration.ofMillis(200)),
                    StreamOffset.create(AiContextSummaryService.QUEUE_KEY, ReadOffset.lastConsumed()));
            if (records == null || records.isEmpty()) {
                return;
            }
            for (MapRecord<String, Object, Object> record : records) {
                long sessionId = 0;
                try {
                    Map<Object, Object> v = record.getValue();
                    sessionId = Long.parseLong(String.valueOf(v.get("sessionId")));
                    long rightMsgId = Long.parseLong(String.valueOf(v.get("rightMsgId")));
                    process(sessionId, rightMsgId);
                } catch (Exception e) {
                    log.warn("summary job failed: {}", e.getMessage());
                } finally {
                    if (sessionId > 0) {
                        summaryService.unlock(sessionId);
                    }
                    try {
                        redis.opsForStream().acknowledge(
                                AiContextSummaryService.QUEUE_KEY,
                                AiContextSummaryService.GROUP,
                                record.getId());
                    } catch (Exception ignored) {
                        // ignore
                    }
                }
            }
        } catch (Exception e) {
            // 无 group / 无 stream 时下次投递后会 createGroup
            log.debug("summary poll: {}", e.getMessage());
            summaryService.ensureConsumerGroup();
        }
    }

    private void process(long sessionId, long rightMsgId) {
        AiChatSession session = sessionMapper.selectById(sessionId);
        if (session == null) {
            return;
        }
        long until = AiContextSummaryService.untilOf(session);
        if (rightMsgId <= until) {
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
