package com.wky.backend.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wky.backend.config.JsonbTypeHandler;
import com.wky.backend.enums.ExperimentStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "experiments", autoResultMap = true)
public class Experiment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String route;

    private String title;

    private Long subjectTypeId;

    @TableField("subject_type")
    private String subjectType;

    private String description;

    private String coverUrl;

    @TableField(typeHandler = JsonbTypeHandler.class)
    private List<String> topics;

    private ExperimentStatus status;

    private Long visitorCount;

    private Long favoriteCount;

    private Long viewCount;

    private Long commentCount;

    @TableField(fill = FieldFill.INSERT, updateStrategy = FieldStrategy.NEVER)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
