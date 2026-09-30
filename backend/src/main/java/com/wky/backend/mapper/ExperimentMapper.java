package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.dto.SubjectTypeCountRow;
import com.wky.backend.domain.entity.Experiment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ExperimentMapper extends BaseMapper<Experiment> {

    @Select("""
            SELECT subject_type_id, COUNT(*)::bigint AS cnt
            FROM experiments
            GROUP BY subject_type_id
            """)
    List<SubjectTypeCountRow> countBySubjectTypeId();
}
