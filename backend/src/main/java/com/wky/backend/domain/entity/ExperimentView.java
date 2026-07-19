package com.wky.backend.domain.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("experiment_views")
public class ExperimentView {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long experimentId;

    /** 登录用户；游客为 null */
    private Long userId;

    private LocalDateTime viewedAt;
}
