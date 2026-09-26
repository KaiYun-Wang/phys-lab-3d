package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.AiChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

@Mapper
public interface AiChatSessionMapper extends BaseMapper<AiChatSession> {

    @Select("""
            SELECT COUNT(*) FROM ai_chat_sessions WHERE create_time >= #{from}
            """)
    long countSince(@Param("from") LocalDateTime from);

    /** ponytail: until 只能变大，避免过期任务把进度打回去 */
    @Update("""
            UPDATE ai_chat_sessions
            SET context_summary = #{summary},
                summary_until_msg_id = #{rightMsgId},
                update_time = CURRENT_TIMESTAMP
            WHERE id = #{sessionId}
              AND (summary_until_msg_id IS NULL OR summary_until_msg_id < #{rightMsgId})
            """)
    int advanceSummary(
            @Param("sessionId") Long sessionId,
            @Param("summary") String summary,
            @Param("rightMsgId") long rightMsgId);
}
