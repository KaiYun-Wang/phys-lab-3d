package com.wky.backend.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wky.backend.config.JsonbTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@TableName(value = "demo_sessions", autoResultMap = true)
public class DemoSession {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** FK → experiments.id */
    private Long experimentId;

    private String goal;

    private String title;

    /** ready | playing | done | aborted */
    private String status;

    @TableField(typeHandler = JsonbTypeHandler.class)
    private Map<String, Object> planJson;

    private Integer currentStep;

    /** 用户答题选项；未答 null */
    private Integer quizAnswerIndex;

    /** 是否答对；未答 null */
    private Boolean quizCorrect;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
