package com.wky.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "phys-lab.ai")
public class AiProperties {

    private Chat chat = new Chat();
    /**
     * 入模至少保留的对话条数（user/assistant）；摘要后若 until 之后不足则从 until 往前补。
     * 摘要任务也会留下最近这么多条不进本次压缩。
     */
    private int historyMin = 10;
    /** 未摘要对话条数 ≥ 此值 → 尝试异步生成摘要 */
    private int summarySoftLimit = 30;
    /** 未摘要对话条数 > 此值 → 系统繁忙，请稍后重试 */
    private int summaryHardLimit = 50;
    /** 摘要互斥锁 TTL（秒） */
    private int summaryLockTtlSeconds = 120;
    /** Streams 积压条数上限，达到则视为投递失败 → 繁忙 */
    private int summaryQueueMax = 100;

    @Data
    public static class Chat {
        private String apiKey = "";
        private String baseUrl = "https://api.deepseek.com";
        private String model = "deepseek-chat";
    }
}
