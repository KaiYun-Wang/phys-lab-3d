package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.AiChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;

@Mapper
public interface AiChatSessionMapper extends BaseMapper<AiChatSession> {

    @Select("""
            SELECT COUNT(*) FROM ai_chat_sessions WHERE create_time >= #{from}
            """)
    long countSince(@Param("from") LocalDateTime from);
}
