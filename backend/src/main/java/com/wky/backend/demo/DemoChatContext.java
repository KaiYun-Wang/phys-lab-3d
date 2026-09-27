package com.wky.backend.demo;

/** Per-request chat context for demo tools (ThreadLocal). No live param snapshot. */
public final class DemoChatContext {

    private static final ThreadLocal<Holder> TL = new ThreadLocal<>();

    private DemoChatContext() {}

    public static void set(Long userId, String experimentRoute, Long experimentId) {
        TL.set(new Holder(userId, experimentRoute, experimentId));
    }

    public static Holder get() {
        return TL.get();
    }

    public static void clear() {
        TL.remove();
    }

    public record Holder(Long userId, String experimentRoute, Long experimentId) {}
}
