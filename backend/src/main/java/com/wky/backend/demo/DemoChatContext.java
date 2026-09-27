package com.wky.backend.demo;

import java.util.Map;

/** Per-request chat context for demo tools (ThreadLocal). */
public final class DemoChatContext {

    private static final ThreadLocal<Holder> TL = new ThreadLocal<>();

    private DemoChatContext() {}

    public static void set(
            Long userId,
            String experimentRoute,
            Long experimentId,
            Map<String, Object> paramSnapshot) {
        TL.set(new Holder(userId, experimentRoute, experimentId, paramSnapshot));
    }

    public static Holder get() {
        return TL.get();
    }

    public static void clear() {
        TL.remove();
    }

    public record Holder(
            Long userId,
            String experimentRoute,
            Long experimentId,
            Map<String, Object> paramSnapshot) {}
}
