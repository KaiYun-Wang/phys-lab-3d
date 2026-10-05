package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.ExampleQuestion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ExampleQuestionMapper extends BaseMapper<ExampleQuestion> {

    /** 示例问题排序批量覆盖：按传入 id 顺序重编号 0..n-1（单条语句，原子） */
    @Update("""
            UPDATE example_questions SET sort_order = (u.ord - 1)::int
            FROM unnest(string_to_array(#{idsCsv}, ',')::bigint[]) WITH ORDINALITY AS u(id, ord)
            WHERE example_questions.id = u.id
            """)
    int updateSortOrder(@Param("idsCsv") String idsCsv);
}
