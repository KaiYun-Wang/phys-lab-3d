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
@TableName("ai_chat_sessions")
public class AiChatSession {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long ownerId;

    private CommentOwnerType ownerType;

    private String title;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
