package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.dto.DayCountRow;
import com.wky.backend.domain.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("""
            SELECT CAST(create_time AS date) AS day, COUNT(*)::bigint AS cnt
            FROM users
            WHERE create_time >= #{from}
            GROUP BY CAST(create_time AS date)
            ORDER BY day
            """)
    List<DayCountRow> countRegistrationsByDay(@Param("from") LocalDateTime from);
}
