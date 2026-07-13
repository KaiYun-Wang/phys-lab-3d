package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.Experiment;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ExperimentMapper extends BaseMapper<Experiment> {
}
