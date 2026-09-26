package com.wky.backend.service;

import com.wky.backend.config.AiProperties;
import com.wky.backend.domain.entity.AiChatMessage;
import com.wky.backend.domain.entity.AiChatSession;
import com.wky.backend.mapper.AiChatMessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 摘要触发：上下文条数（user/assistant/tool_*）软/硬阈值 + Redis ZSet 投递。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiContextSummaryService {

    public static final String QUEUE_KEY = "ai:summary:queue";
    public static final String BUSY_MSG = "系统繁忙，请稍后重试";

    private final AiProperties aiProperties;
    private final AiChatMessageMapper messageMapper;
    private final StringRedisTemplate redis;

    public static long untilOf(AiChatSession session) {
        return session.getSummaryUntilMsgId() == null ? 0L : session.getSummaryUntilMsgId();
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
            tryEnqueue(session.getId());
        }
        return overHard;
    }

    private void tryEnqueue(long sessionId) {
        try {
            // NX：已有 member 则不动 score（保留首次入队时间）
            redis.opsForZSet().addIfAbsent(
                    QUEUE_KEY, String.valueOf(sessionId), System.currentTimeMillis());
        } catch (Exception e) {
            log.warn("enqueue summary failed sessionId={}: {}", sessionId, e.getMessage());
        }
    }

    /** 保留最近 historyMin 条上下文不进本次摘要；不足则无可摘要。 */
    public Long resolveRightMsgId(long sessionId, long until) {
        List<AiChatMessage> after = messageMapper.listDialogueAfterAsc(sessionId, until);
        int keep = Math.max(1, aiProperties.getHistoryMin());
        if (after.size() <= keep) {
            return null;
        }
        return after.get(after.size() - keep - 1).getId();
    }
}
