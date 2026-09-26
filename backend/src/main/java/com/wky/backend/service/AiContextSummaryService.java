package com.wky.backend.service;

import com.wky.backend.config.AiProperties;
import com.wky.backend.domain.entity.AiChatMessage;
import com.wky.backend.domain.entity.AiChatSession;
import com.wky.backend.mapper.AiChatMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 摘要触发：对话条数软/硬阈值 + Redis Streams 投递 + 会话锁。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiContextSummaryService {

    public static final String QUEUE_KEY = "ai:summary:queue";
    public static final String GROUP = "workers";
    public static final String BUSY_MSG = "系统繁忙，请稍后重试";

    private final AiProperties aiProperties;
    private final AiChatMessageMapper messageMapper;
    private final StringRedisTemplate redis;

    public static long untilOf(AiChatSession session) {
        return session.getSummaryUntilMsgId() == null ? 0L : session.getSummaryUntilMsgId();
    }

    public static String lockKey(long sessionId) {
        return "ai:summary:lock:" + sessionId;
    }

    /**
     * 达软阈值或超硬阈值都尝试投递摘要（硬阈值也要压 backlog，避免永远繁忙）。
     *
     * @return true → 本轮不调模型，由调用方用 {@link #BUSY_MSG} 作为助手回复
     */
    public boolean checkAndMaybeEnqueue(AiChatSession session) {
        long until = untilOf(session);
        long unsummarized = messageMapper.countDialogueAfter(session.getId(), until);
        boolean overHard = unsummarized > aiProperties.getSummaryHardLimit();
        boolean overSoft = unsummarized >= aiProperties.getSummarySoftLimit();
        if (overSoft || overHard) {
            boolean ok = tryEnqueue(session.getId(), until);
            if (!ok) {
                return true;
            }
        }
        return overHard;
    }

    public void unlock(long sessionId) {
        redis.delete(lockKey(sessionId));
    }

    /** @return false 表示队列满/Redis 失败，应繁忙；true 表示已投递、已有锁或无需摘要 */
    private boolean tryEnqueue(long sessionId, long until) {
        Boolean locked = redis.opsForValue().setIfAbsent(
                lockKey(sessionId),
                "1",
                Duration.ofSeconds(Math.max(30, aiProperties.getSummaryLockTtlSeconds())));
        if (!Boolean.TRUE.equals(locked)) {
            return true;
        }
        try {
            Long len = redis.opsForStream().size(QUEUE_KEY);
            if (len != null && len >= aiProperties.getSummaryQueueMax()) {
                unlock(sessionId);
                return false;
            }
            Long rightMsgId = resolveRightMsgId(sessionId, until);
            if (rightMsgId == null) {
                unlock(sessionId);
                return true;
            }
            Map<String, String> body = new HashMap<>();
            body.put("sessionId", String.valueOf(sessionId));
            body.put("rightMsgId", String.valueOf(rightMsgId));
            MapRecord<String, String, String> record =
                    StreamRecords.mapBacked(body).withStreamKey(QUEUE_KEY);
            redis.opsForStream().add(record);
            ensureConsumerGroup();
            return true;
        } catch (Exception e) {
            log.warn("enqueue summary failed sessionId={}: {}", sessionId, e.getMessage());
            unlock(sessionId);
            return false;
        }
    }

    /** 从 0-0 建组，避免 XADD 早于 GROUP 时漏消费。 */
    public void ensureConsumerGroup() {
        try {
            redis.opsForStream().createGroup(QUEUE_KEY, ReadOffset.from("0-0"), GROUP);
        } catch (Exception e) {
            log.debug("summary stream group: {}", e.getMessage());
        }
    }

    /** 保留最近 historyMin 条对话不进本次摘要；不足则无可摘要。 */
    private Long resolveRightMsgId(long sessionId, long until) {
        List<AiChatMessage> after = messageMapper.listDialogueAfterAsc(sessionId, until);
        int keep = Math.max(1, aiProperties.getHistoryMin());
        if (after.size() <= keep) {
            return null;
        }
        return after.get(after.size() - keep - 1).getId();
    }
}
