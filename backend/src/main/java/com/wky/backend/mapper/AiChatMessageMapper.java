package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.dto.DayCountRow;
import com.wky.backend.domain.entity.AiChatMessage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface AiChatMessageMapper extends BaseMapper<AiChatMessage> {

    @Select("""
            SELECT CAST(create_time AS date) AS day, COUNT(*)::bigint AS cnt
            FROM ai_chat_messages
            WHERE role = 'user' AND create_time >= #{from}
            GROUP BY CAST(create_time AS date)
            ORDER BY day
            """)
    List<DayCountRow> countUserQuestionsByDay(@Param("from") LocalDateTime from);

    @Select("""
            SELECT COUNT(*) FROM ai_chat_messages
            WHERE role = 'user' AND create_time >= #{from}
            """)
    long countUserQuestionsSince(@Param("from") LocalDateTime from);

    @Select("""
            SELECT COUNT(*) FROM ai_chat_messages WHERE role = 'user'
            """)
    long countAllUserQuestions();

    /** 入模 / 阈值 / 摘要：user、assistant、tool_*（不含 thinking） */
    @Select("""
            SELECT COUNT(*) FROM ai_chat_messages
            WHERE session_id = #{sessionId}
              AND id > #{afterId}
              AND role IN ('user', 'assistant', 'tool_call', 'tool_result')
            """)
    long countDialogueAfter(@Param("sessionId") Long sessionId, @Param("afterId") long afterId);

    @Select("""
            SELECT * FROM ai_chat_messages
            WHERE session_id = #{sessionId}
              AND id > #{afterId}
              AND role IN ('user', 'assistant', 'tool_call', 'tool_result')
            ORDER BY id ASC
            """)
    List<AiChatMessage> listDialogueAfterAsc(
            @Param("sessionId") Long sessionId, @Param("afterId") long afterId);

    @Select("""
            SELECT * FROM ai_chat_messages
            WHERE session_id = #{sessionId}
              AND id > #{afterId}
              AND id <= #{rightMsgId}
              AND role IN ('user', 'assistant', 'tool_call', 'tool_result')
            ORDER BY id ASC
            """)
    List<AiChatMessage> listDialogueBetween(
            @Param("sessionId") Long sessionId,
            @Param("afterId") long afterId,
            @Param("rightMsgId") long rightMsgId);

    @Select("""
            SELECT * FROM ai_chat_messages
            WHERE session_id = #{sessionId}
              AND id <= #{untilId}
              AND role IN ('user', 'assistant', 'tool_call', 'tool_result')
            ORDER BY id DESC
            LIMIT #{limit}
            """)
    List<AiChatMessage> listDialogueBeforeDesc(
            @Param("sessionId") Long sessionId,
            @Param("untilId") long untilId,
            @Param("limit") int limit);
}
