package com.wky.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum UserStatus {
    ENABLED,
    DISABLED;

    @JsonCreator
    public static UserStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    public String toValue() {
        return name();
    }

    public boolean isEnabled() {
        return this == ENABLED;
    }
}
