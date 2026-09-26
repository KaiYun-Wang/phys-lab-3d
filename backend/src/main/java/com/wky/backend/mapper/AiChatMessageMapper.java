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
}
