package com.wky.backend.security;

public record AuthPrincipal(Long id, String principalType) {

    public static final String TYPE_USER = "user";
    public static final String TYPE_ADMIN = "admin";

    public boolean isUser() {
        return TYPE_USER.equals(principalType);
    }

    public boolean isAdmin() {
        return TYPE_ADMIN.equals(principalType);
    }
}
