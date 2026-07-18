package com.wky.backend.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum CommentOwnerType {
    USER(0),
    ADMIN(1);

    @EnumValue
    private final int code;

    CommentOwnerType(int code) {
        this.code = code;
    }

    @JsonValue
    public int toValue() {
        return code;
    }

    @JsonCreator
    public static CommentOwnerType fromValue(Integer code) {
        if (code == null) {
            return null;
        }
        for (CommentOwnerType t : values()) {
            if (t.code == code) {
                return t;
            }
        }
        throw new IllegalArgumentException("未知 owner_type: " + code);
    }

    public boolean isUser() {
        return this == USER;
    }

    public boolean isAdmin() {
        return this == ADMIN;
    }
}
