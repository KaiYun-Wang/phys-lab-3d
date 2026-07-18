package com.wky.backend.config;

import com.wky.backend.exception.ApiException;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;

/** 按需创建模型；chat / embedding 可走不同厂商。 */
@Component
@RequiredArgsConstructor
public class AiModelFactory {

    private final AiProperties aiProperties;

    private volatile ChatModel chatModel;
    private volatile StreamingChatModel streamingChatModel;
    private volatile EmbeddingModel embeddingModel;

    public ChatModel chatModel() {
        ChatModel local = chatModel;
        if (local == null) {
            synchronized (this) {
                local = chatModel;
                if (local == null) {
                    AiProperties.Chat cfg = aiProperties.getChat();
                    requireApiKey(cfg.getApiKey(), "phys-lab.ai.chat.api-key");
                    chatModel = local = OpenAiChatModel.builder()
                            .apiKey(cfg.getApiKey())
                            .baseUrl(normalizeBaseUrl(cfg.getBaseUrl(), "https://api.deepseek.com"))
                            .modelName(cfg.getModel())
                            .timeout(Duration.ofSeconds(120))
                            .build();
                }
            }
        }
        return local;
    }

    public StreamingChatModel streamingChatModel() {
        StreamingChatModel local = streamingChatModel;
        if (local == null) {
            synchronized (this) {
                local = streamingChatModel;
                if (local == null) {
                    AiProperties.Chat cfg = aiProperties.getChat();
                    requireApiKey(cfg.getApiKey(), "phys-lab.ai.chat.api-key");
                    streamingChatModel = local = OpenAiStreamingChatModel.builder()
                            .apiKey(cfg.getApiKey())
                            .baseUrl(normalizeBaseUrl(cfg.getBaseUrl(), "https://api.deepseek.com"))
                            .modelName(cfg.getModel())
                            .timeout(Duration.ofSeconds(180))
                            .build();
                }
            }
        }
        return local;
    }

    public EmbeddingModel embeddingModel() {
        EmbeddingModel local = embeddingModel;
        if (local == null) {
            synchronized (this) {
                local = embeddingModel;
                if (local == null) {
                    AiProperties.Embedding cfg = aiProperties.getEmbedding();
                    requireApiKey(cfg.getApiKey(), "phys-lab.ai.embedding.api-key");
                    embeddingModel = local = OpenAiEmbeddingModel.builder()
                            .apiKey(cfg.getApiKey())
                            .baseUrl(normalizeBaseUrl(cfg.getBaseUrl(), "https://api.openai.com/v1"))
                            .modelName(cfg.getModel())
                            .dimensions(cfg.getDimensions())
                            .timeout(Duration.ofSeconds(120))
                            .build();
                }
            }
        }
        return local;
    }

    private static void requireApiKey(String apiKey, String configPath) {
        if (!StringUtils.hasText(apiKey)) {
            throw new ApiException(500, "未配置 AI API Key（" + configPath + "）");
        }
    }

    private static String normalizeBaseUrl(String baseUrl, String fallback) {
        if (!StringUtils.hasText(baseUrl)) {
            return fallback;
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
