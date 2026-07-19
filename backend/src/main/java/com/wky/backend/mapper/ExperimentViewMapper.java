package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.ExperimentView;
import com.wky.backend.domain.dto.DayCountRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface ExperimentViewMapper extends BaseMapper<ExperimentView> {

    @Select("""
            SELECT CAST(viewed_at AS date) AS day, COUNT(*)::bigint AS cnt
            FROM experiment_views
            WHERE viewed_at >= #{from}
            GROUP BY CAST(viewed_at AS date)
            ORDER BY day
            """)
    List<DayCountRow> countByDay(@Param("from") LocalDateTime from);

    @Select("""
            SELECT COUNT(*) FROM experiment_views
            WHERE viewed_at >= #{from} AND viewed_at < #{to}
            """)
    long countBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
