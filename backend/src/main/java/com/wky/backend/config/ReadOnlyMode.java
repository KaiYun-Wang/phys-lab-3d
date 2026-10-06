package com.wky.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 只读体验模式（演示版本）开关。
 *
 * 开启后：
 *  - 非 GET 请求统一拒绝（见 security/ReadOnlyModeFilter，白名单除外）；
 *  - 写路径在业务层改为「不落库」：实验浏览计数、AI 对话（固定文案）、
 *    实验演示播放进度 / 随堂题（现场计算）/ 音频检查（不合成）。
 *
 * 部署演示实例：环境变量 PHYS_LAB_READONLY_ENABLED=true。
 */
@Component
public class ReadOnlyMode {

    /** 虚拟会话 id：只读模式下新建会话不落库，聊天侧用它表示「临时会话」 */
    public static final long SYNTHETIC_SESSION_ID = -1L;

    @Value("${phys-lab.readonly.enabled:false}")
    private boolean enabled;

    @Value("${phys-lab.readonly.message:体验环境仅支持查询操作}")
    private String message;

    public boolean enabled() {
        return enabled;
    }

    public String message() {
        return message;
    }

    /** 是否为只读模式下的临时（未落库）会话 */
    public boolean isSyntheticSession(Long sessionId) {
        return enabled && sessionId != null && sessionId < 0;
    }
}
