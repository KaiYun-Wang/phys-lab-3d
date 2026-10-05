package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.dto.SubjectTypeCountRow;
import com.wky.backend.domain.entity.Experiment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface ExperimentMapper extends BaseMapper<Experiment> {

    @Select("""
            SELECT subject_type_id, COUNT(*)::bigint AS cnt
            FROM experiments
            GROUP BY subject_type_id
            """)
    List<SubjectTypeCountRow> countBySubjectTypeId();

    /** 首页排序批量覆盖：按传入 id 顺序重编号 0..n-1（单条语句，原子） */
    @Update("""
            UPDATE experiments SET sort_order = (u.ord - 1)::int
            FROM unnest(string_to_array(#{idsCsv}, ',')::bigint[]) WITH ORDINALITY AS u(id, ord)
            WHERE experiments.id = u.id
            """)
    int updateSortOrder(@Param("idsCsv") String idsCsv);
}
