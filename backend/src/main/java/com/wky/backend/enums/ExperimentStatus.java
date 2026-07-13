package com.wky.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ExperimentStatus {
    PUBLISHED,
    DRAFT;

    @JsonCreator
    public static ExperimentStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return valueOf(value.trim().toUpperCase());
    }

    /** JSON responses use uppercase enum names to match DB storage. */
    @JsonValue
    public String toValue() {
        return name();
    }
}
