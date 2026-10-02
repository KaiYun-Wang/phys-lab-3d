package com.wky.backend.demo;

import com.wky.backend.config.AiProperties;
import com.wky.backend.domain.entity.DemoSession;
import com.wky.backend.mapper.DemoSessionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.x.file.storage.core.FileInfo;
import org.dromara.x.file.storage.core.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayInputStream;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sync pre-generate all demo narration MP3s → MinIO → then write URLs into plan_json.
 * All-or-nothing: any synth/upload failure leaves plan without audio (full browser fallback).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemoTtsService {

    private static final String PLATFORM = "minio-demos";

    private final AiProperties aiProperties;
    private final DemoSessionMapper sessionMapper;
    private final FileStorageService fileStorageService;

    @Value("${phys-lab.minio.endpoint}")
    private String minioEndpoint;
    @Value("${phys-lab.minio.access-key}")
    private String minioAccessKey;
    @Value("${phys-lab.minio.secret-key}")
    private String minioSecretKey;
    @Value("${phys-lab.minio.bucket}")
    private String minioBucket;

    public boolean enabled() {
        AiProperties.Tts t = aiProperties.getTts();
        return t != null && t.isEnabled() && StringUtils.hasText(t.getApiKey());
    }

    /**
     * Sync. Only updates plan_json when every segment is synthesized and uploaded.
     * Otherwise returns ready=false and does not write partial audio URLs.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> ensureAudio(Long sessionId) {
        DemoSession s = sessionMapper.selectById(sessionId);
        if (s == null || s.getPlanJson() == null) {
            return Map.of("ok", false, "reason", "not_found");
        }
        if (!enabled()) {
            return Map.of("ok", true, "tts", false, "ready", false);
        }
        if (hasCompleteAudio(s.getPlanJson())) {
            return Map.of("ok", true, "tts", true, "ready", true, "made", 0);
        }
        String audioStatus = str(s.getPlanJson().get("audioStatus"));
        if ("failed".equals(audioStatus) || "unavailable".equals(audioStatus)) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("ok", true);
            out.put("tts", true);
            out.put("ready", false);
            out.put("made", 0);
            out.put("skipped", true);
            String reason = str(s.getPlanJson().get("audioFailReason"));
            if (StringUtils.hasText(reason)) {
                out.put("reason", reason);
            }
            return out;
        }

        Map<String, Object> plan = deepCopyPlan(s.getPlanJson());
        List<Object> steps = new ArrayList<>();
        if (plan.get("steps") instanceof List<?> raw) {
            for (Object o : raw) {
                steps.add(o instanceof Map<?, ?> m ? new LinkedHashMap<>((Map<String, Object>) m) : o);
            }
        }

        // Collect every (objectName, text) first — fail fast before any DB write
        List<PendingClip> clips = new ArrayList<>();
        for (int i = 0; i < steps.size(); i++) {
            if (!(steps.get(i) instanceof Map<?, ?>)) {
                return fail(sessionId, "step " + i + " invalid");
            }
            Map<String, Object> step = (Map<String, Object>) steps.get(i);
            String narration = str(step.get("narration"));
            if (!StringUtils.hasText(narration)) {
                return fail(sessionId, "step " + i + " missing narration");
            }
            clips.add(new PendingClip(i, sessionId + "_" + i + ".mp3", narration));
        }
        String summary = str(plan.get("summary"));
        if (!StringUtils.hasText(summary)) {
            return fail(sessionId, "missing summary");
        }
        clips.add(new PendingClip(-1, sessionId + "_summary.mp3", summary));

        Map<String, String> uploaded = new LinkedHashMap<>();
        for (PendingClip clip : clips) {
            byte[] mp3 = callSpeechApi(clip.text);
            if (mp3 == null || mp3.length == 0) {
                rollbackUploads(uploaded);
                return fail(sessionId, "TTS empty: " + clip.objectName);
            }
            if (!storeMp3(clip.objectName, mp3)) {
                rollbackUploads(uploaded);
                return fail(sessionId, "MinIO upload: " + clip.objectName);
            }
            uploaded.put(clip.objectName, "/api/demos/" + clip.objectName);
        }

        // All clips OK → mutate plan once
        for (PendingClip clip : clips) {
            String url = uploaded.get(clip.objectName);
            if (clip.stepIndex < 0) {
                plan.put("summaryAudioUrl", url);
                continue;
            }
            Map<String, Object> step = (Map<String, Object>) steps.get(clip.stepIndex);
            Map<String, Object> audio = new LinkedHashMap<>();
            audio.put("url", url);
            step.put("audio", audio);
            steps.set(clip.stepIndex, step);
        }
        plan.put("steps", steps);
        plan.put("audioStatus", "ready");
        s.setPlanJson(plan);
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("tts", true);
        out.put("ready", true);
        out.put("made", uploaded.size());
        return out;
    }

    private Map<String, Object> fail(Long sessionId, String reason) {
        log.warn("demo TTS aborted id={} reason={}", sessionId, reason);
        markAudioFailed(sessionId, reason);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("tts", true);
        out.put("ready", false);
        out.put("made", 0);
        out.put("reason", reason);
        return out;
    }

    /** Persist failure so later ensureAudio calls skip cloud TTS (browser fallback only). */
    @SuppressWarnings("unchecked")
    private void markAudioFailed(Long sessionId, String reason) {
        DemoSession s = sessionMapper.selectById(sessionId);
        if (s == null || s.getPlanJson() == null) {
            return;
        }
        Map<String, Object> plan = deepCopyPlan(s.getPlanJson());
        if ("ready".equals(str(plan.get("audioStatus"))) && hasCompleteAudio(plan)) {
            return;
        }
        plan.put("audioStatus", "failed");
        plan.put("audioFailReason", reason);
        s.setPlanJson(plan);
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);
    }

    private boolean storeMp3(String objectName, byte[] mp3) {
        // Prefer x-file-storage with explicit size (MinIO requires size for streams)
        try {
            FileInfo info = fileStorageService
                    .of(mp3, objectName, "audio/mpeg", (long) mp3.length)
                    .setPlatform(PLATFORM)
                    .setSaveFilename(objectName)
                    .upload();
            if (info != null) return true;
        } catch (Exception e) {
            log.warn("x-file-storage upload failed {}: {} — trying MinioClient", objectName, rootMessage(e));
        }
        // Fallback: raw MinIO SDK (same bucket/creds as avatars)
        try {
            io.minio.MinioClient client = io.minio.MinioClient.builder()
                    .endpoint(minioEndpoint)
                    .credentials(minioAccessKey, minioSecretKey)
                    .build();
            client.putObject(
                    io.minio.PutObjectArgs.builder()
                            .bucket(minioBucket)
                            .object("demos/" + objectName)
                            .stream(new ByteArrayInputStream(mp3), mp3.length, -1)
                            .contentType("audio/mpeg")
                            .build());
            return true;
        } catch (Exception e) {
            log.warn("MinioClient upload failed {}: {}", objectName, rootMessage(e));
            return false;
        }
    }

    private void rollbackUploads(Map<String, String> uploaded) {
        for (String objectName : uploaded.keySet()) {
            try {
                FileInfo fi = new FileInfo()
                        .setPlatform(PLATFORM)
                        .setBasePath("demos/")
                        .setFilename(objectName);
                fileStorageService.delete(fi);
            } catch (Exception e) {
                log.debug("rollback delete {}: {}", objectName, e.getMessage());
            }
            try {
                io.minio.MinioClient client = io.minio.MinioClient.builder()
                        .endpoint(minioEndpoint)
                        .credentials(minioAccessKey, minioSecretKey)
                        .build();
                client.removeObject(
                        io.minio.RemoveObjectArgs.builder()
                                .bucket(minioBucket)
                                .object("demos/" + objectName)
                                .build());
            } catch (Exception ignored) {
                /* best-effort */
            }
        }
    }

    private byte[] callSpeechApi(String text) {
        AiProperties.Tts t = aiProperties.getTts();
        // ponytail: base-url is the full speech endpoint
        String url = t.getBaseUrl() == null ? "" : t.getBaseUrl().replaceAll("/+$", "");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", t.getModel());
        body.put("input", text);
        body.put("voice", t.getVoice());
        body.put("response_format", "mp3");
        try {
            JdkClientHttpRequestFactory rf = new JdkClientHttpRequestFactory(
                    HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build());
            rf.setReadTimeout(Duration.ofSeconds(120));
            return RestClient.builder()
                    .requestFactory(rf)
                    .build()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + t.getApiKey())
                    .body(body)
                    .retrieve()
                    .body(byte[].class);
        } catch (Exception e) {
            log.warn("demo TTS API failed: {}", rootMessage(e));
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private static boolean hasCompleteAudio(Map<String, Object> plan) {
        if (!StringUtils.hasText(str(plan.get("summaryAudioUrl")))) return false;
        if (!(plan.get("steps") instanceof List<?> steps) || steps.isEmpty()) return false;
        for (Object o : steps) {
            if (!(o instanceof Map<?, ?> step)) return false;
            if (!(step.get("audio") instanceof Map<?, ?> audio)) return false;
            if (!StringUtils.hasText(str(audio.get("url")))) {
                return false;
            }
        }
        return true;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> deepCopyPlan(Map<String, Object> plan) {
        return new LinkedHashMap<>(plan);
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static String rootMessage(Throwable e) {
        Throwable c = e;
        while (c.getCause() != null && c.getCause() != c) {
            c = c.getCause();
        }
        return c.getClass().getSimpleName() + ": " + c.getMessage();
    }

    private record PendingClip(int stepIndex, String objectName, String text) {}
}
