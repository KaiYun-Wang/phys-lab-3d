package com.wky.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "phys-lab.ai")
public class AiProperties {

    private Chat chat = new Chat();
    /** 入模滑动窗口：最近 N 条消息行（含 thinking/tool_*） */
    private int historyLimit = 40;

    @Data
    public static class Chat {
        private String apiKey = "";
        private String baseUrl = "https://api.deepseek.com";
        private String model = "deepseek-chat";
    }
}
