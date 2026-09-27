package com.wky.backend.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wky.backend.config.JsonbTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
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

    /** ready | playing | aborted */
    private String status;

    @TableField(typeHandler = JsonbTypeHandler.class)
    private Map<String, Object> planJson;

    /** 已播完步骤数 / 续播下标（0..N）；N=steps 数表示步骤播完 */
    private Integer currentStep;

    /**
     * 用户各题选项下标（与 plan_json.quizzes 对齐）；未答为 null 元素或整列 null。
     * 对错不落库，提交时与 plan 比对。
     */
    @TableField(typeHandler = JsonbTypeHandler.class)
    private List<Integer> quizAnswers;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
