package com.wky.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "phys-lab.ai")
public class AiProperties {

    private Chat chat = new Chat();
    private int historyLimit = 20;

    @Data
    public static class Chat {
        private String apiKey = "";
        private String baseUrl = "https://api.deepseek.com";
        private String model = "deepseek-chat";
    }
}
