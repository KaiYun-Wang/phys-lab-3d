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

    /** 滚动会话摘要 */
    private String contextSummary;

    /** 摘要已覆盖到的消息 id（含） */
    private Long summaryUntilMsgId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
