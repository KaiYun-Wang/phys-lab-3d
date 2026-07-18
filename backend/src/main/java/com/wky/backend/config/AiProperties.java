package com.wky.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "phys-lab.ai")
public class AiProperties {

    private Chat chat = new Chat();
    private Embedding embedding = new Embedding();
    private int ragTopK = 4;
    private int historyLimit = 20;

    @Data
    public static class Chat {
        private String apiKey = "";
        private String baseUrl = "https://api.deepseek.com";
        private String model = "deepseek-chat";
    }

    @Data
    public static class Embedding {
        private String apiKey = "";
        private String baseUrl = "https://api.siliconflow.cn/v1";
        private String model = "Qwen/Qwen3-Embedding-0.6B";
        private int dimensions = 1024;
    }
}
