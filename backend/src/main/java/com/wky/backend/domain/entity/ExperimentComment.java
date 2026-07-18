package com.wky.backend.domain.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wky.backend.enums.CommentOwnerType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("experiment_comments")
public class ExperimentComment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long experimentId;

    /** 作者 ID：配合 ownerType，对应 users.id 或 admins.id */
    private Long ownerId;

    private CommentOwnerType ownerType;

    /** 所属一级评论；一级自身为 null */
    private Long rootId;

    /** 直接回复的目标评论；一级自身为 null */
    private Long replyToId;

    private String content;

    private Long likeCount;

    private String status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
