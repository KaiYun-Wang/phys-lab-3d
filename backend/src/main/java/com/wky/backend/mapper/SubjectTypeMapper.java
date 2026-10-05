package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.SubjectType;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface SubjectTypeMapper extends BaseMapper<SubjectType> {

    /** 学科分类排序批量覆盖：按传入 id 顺序重编号 0..n-1（单条语句，原子） */
    @Update("""
            UPDATE subject_types SET sort_order = (u.ord - 1)::int
            FROM unnest(string_to_array(#{idsCsv}, ',')::bigint[]) WITH ORDINALITY AS u(id, ord)
            WHERE subject_types.id = u.id
            """)
    int updateSortOrder(@Param("idsCsv") String idsCsv);
}
