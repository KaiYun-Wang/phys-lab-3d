package com.wky.backend.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("experiment_favorites")
public class ExperimentFavorite {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long experimentId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
