package com.wky.backend.controller.user;

import com.wky.backend.demo.DemoPlanService;
import com.wky.backend.exception.ApiException;
import com.wky.backend.security.AuthPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users/me/demos")
@RequiredArgsConstructor
public class UserDemoController {

    private final DemoPlanService demoPlanService;

    @GetMapping
    public List<Map<String, Object>> list(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) Long experimentId) {
        return demoPlanService.listForUser(requireUser(principal), experimentId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id) {
        return demoPlanService.getForClient(requireUser(principal), id);
    }

    /** Ensure cloud TTS audio exists for this demo (idempotent). */
    @PostMapping("/{id}/audio/ensure")
    public Map<String, Object> ensureAudio(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id) {
        return demoPlanService.ensureAudio(requireUser(principal), id);
    }

    /** 标记某步已播完（更新 current_step） */
    @PostMapping("/{id}/steps/{stepIndex}/complete")
    public Map<String, Object> completeStep(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id,
            @PathVariable int stepIndex) {
        return demoPlanService.completeStep(requireUser(principal), id, stepIndex);
    }

    @PostMapping("/{id}/quiz/submit")
    public Map<String, Object> submitQuiz(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Object qi = body.get("questionIndex");
        Object ai = body.get("answerIndex");
        if (!(qi instanceof Number qn)) {
            throw new ApiException(400, "缺少 questionIndex");
        }
        if (!(ai instanceof Number an)) {
            throw new ApiException(400, "缺少 answerIndex");
        }
        return demoPlanService.submitQuiz(requireUser(principal), id, qn.intValue(), an.intValue());
    }

    @PostMapping("/{id}/status")
    public Map<String, Object> updateStatus(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return demoPlanService.updateStatus(
                requireUser(principal), id, body.get("status") == null ? null : String.valueOf(body.get("status")));
    }

    /** 清除步骤进度与答题（保留剧本） */
    @PostMapping("/{id}/clear-progress")
    public Map<String, Object> clearProgress(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id) {
        return demoPlanService.clearProgress(requireUser(principal), id);
    }

    /** 硬删除演示 */
    @DeleteMapping("/{id}")
    public Map<String, Object> delete(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long id) {
        demoPlanService.delete(requireUser(principal), id);
        return Map.of("ok", true, "id", id);
    }

    private static Long requireUser(AuthPrincipal principal) {
        if (principal == null || !principal.isUser()) {
            throw new ApiException(401, "请先登录");
        }
        return principal.id();
    }
}
