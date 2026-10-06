package com.wky.backend.security;

import java.io.IOException;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wky.backend.config.ReadOnlyMode;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 演示（只读体验）模式护栏：除 GET/HEAD/OPTIONS 与白名单外，所有请求一律拒绝，
 * 返回 403 + {"message":"体验环境仅支持查询操作"}，数据不变更。
 *
 * 白名单均已在业务层做「不落库」处理：
 *  - 登录：/api/auth/login、/api/admin/auth/login（不登录就没法体验）
 *  - AI 对话：新建会话（返回虚拟会话）、发消息（固定文案回复，不调用模型）
 *  - 实验演示：进度上报 / 随堂题（现场计算不入库）/ 音频检查（不合成新音频）
 */
public class ReadOnlyModeFilter extends OncePerRequestFilter {

    private static final Pattern AI_SESSION_CREATE =
            Pattern.compile("^/api/(users/me|admin)/ai/sessions$");
    private static final Pattern AI_CHAT_POST =
            Pattern.compile("^/api/(users/me|admin)/ai/sessions/-?\\d+/messages(/stream)?$");
    private static final Pattern DEMO_PLAY_POST =
            Pattern.compile("^/api/users/me/demos/\\d+/(status|steps/\\d+/complete|quiz/submit|audio/ensure)$");

    private final ReadOnlyMode readOnlyMode;
    private final ObjectMapper objectMapper;

    public ReadOnlyModeFilter(ReadOnlyMode readOnlyMode, ObjectMapper objectMapper) {
        this.readOnlyMode = readOnlyMode;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!readOnlyMode.enabled()
                || isRead(request.getMethod())
                || isAllowedWrite(request.getMethod(), request.getRequestURI())) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of("message", readOnlyMode.message())));
    }

    private static boolean isRead(String method) {
        return HttpMethod.GET.matches(method)
                || HttpMethod.HEAD.matches(method)
                || HttpMethod.OPTIONS.matches(method);
    }

    private static boolean isAllowedWrite(String method, String path) {
        if (!HttpMethod.POST.matches(method)) {
            return false;
        }
        return "/api/auth/login".equals(path)
                || "/api/admin/auth/login".equals(path)
                || AI_SESSION_CREATE.matcher(path).matches()
                || AI_CHAT_POST.matcher(path).matches()
                || DEMO_PLAY_POST.matcher(path).matches();
    }
}
