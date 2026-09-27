package com.wky.backend.demo;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wky.backend.config.AiModelFactory;
import com.wky.backend.domain.entity.DemoSession;
import com.wky.backend.domain.entity.DemoStepEvent;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.DemoSessionMapper;
import com.wky.backend.mapper.DemoStepEventMapper;
import com.wky.backend.service.IExperimentService;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DemoPlanService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final Set<String> STATUSES = Set.of("ready", "playing", "done", "aborted");

    private final AiModelFactory aiModelFactory;
    private final ExperimentDefinitionRegistry registry;
    private final IExperimentService experimentService;
    private final DemoSessionMapper sessionMapper;
    private final DemoStepEventMapper eventMapper;

    /** Generate + validate + save. Returns tool-facing string with demoId. */
    @Transactional
    public String createDemo(Long userId, Long experimentId, String goal, Map<String, Object> snapshot) {
        if (experimentId == null) {
            return "缺少 experimentId。";
        }
        Experiment exp = experimentService.getById(experimentId);
        if (exp == null) {
            return "实验不存在：" + experimentId;
        }
        String route = exp.getRoute();
        ExperimentDefinition def = registry.find(route);
        if (def == null) {
            return "当前实验不支持演示：" + route;
        }
        if (!StringUtils.hasText(goal)) {
            return "请提供演示目标 goal。";
        }
        String g = goal.trim();
        Map<String, Object> plan;
        try {
            plan = generatePlan(def, g, snapshot, null);
            String err = validatePlan(def, plan);
            if (err != null) {
                plan = generatePlan(def, g, snapshot, err);
                err = validatePlan(def, plan);
                if (err != null) {
                    return "演示计划校验失败（已重试）：" + err;
                }
            }
        } catch (Exception e) {
            return "生成演示计划失败：" + e.getMessage();
        }

        DemoSession session = new DemoSession();
        session.setUserId(userId);
        session.setExperimentId(experimentId);
        session.setGoal(g);
        session.setTitle(str(plan.get("title"), "演示"));
        session.setStatus("ready");
        session.setPlanJson(plan);
        session.setCurrentStep(0);
        sessionMapper.insert(session);

        int steps = listOf(plan.get("steps")).size();
        return "CREATED_DEMO id=" + session.getId()
                + " title=" + session.getTitle()
                + " steps=" + steps
                + " overview=" + str(plan.get("overview"), "");
    }

    public String lookupDemo(Long userId, Long demoId, Long experimentId) {
        if (demoId != null && demoId > 0) {
            return formatDetail(requireOwned(userId, demoId));
        }
        LambdaQueryWrapper<DemoSession> q = new LambdaQueryWrapper<DemoSession>()
                .eq(DemoSession::getUserId, userId)
                .orderByDesc(DemoSession::getUpdateTime)
                .last("LIMIT 10");
        if (experimentId != null) {
            q.eq(DemoSession::getExperimentId, experimentId);
        }
        List<DemoSession> list = sessionMapper.selectList(q);
        if (list.isEmpty()) {
            return "暂无演示记录。";
        }
        StringBuilder sb = new StringBuilder("最近演示：\n");
        for (DemoSession s : list) {
            sb.append("- id=").append(s.getId())
                    .append(", title=").append(s.getTitle())
                    .append(", experimentId=").append(s.getExperimentId())
                    .append(", status=").append(s.getStatus())
                    .append(", steps=").append(listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps")).size())
                    .append('\n');
        }
        return sb.toString().trim();
    }

    public List<Map<String, Object>> listForUser(Long userId, Long experimentId) {
        LambdaQueryWrapper<DemoSession> q = new LambdaQueryWrapper<DemoSession>()
                .eq(DemoSession::getUserId, userId)
                .orderByDesc(DemoSession::getUpdateTime);
        if (experimentId != null) {
            q.eq(DemoSession::getExperimentId, experimentId);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (DemoSession s : sessionMapper.selectList(q)) {
            out.add(toSummary(s));
        }
        return out;
    }

    /** Client plan: quiz 答案不下发；若已答过则附 quizResult。 */
    public Map<String, Object> getForClient(Long userId, Long id) {
        DemoSession s = requireOwned(userId, id);
        Map<String, Object> body = toSummary(s);
        body.put("plan", stripQuizAnswers(s.getPlanJson()));
        if (s.getQuizAnswerIndex() != null) {
            Map<String, Object> quiz = quizOf(s.getPlanJson());
            Map<String, Object> quizResult = new LinkedHashMap<>();
            quizResult.put("chosenIndex", s.getQuizAnswerIndex());
            quizResult.put("correct", s.getQuizCorrect());
            if (quiz != null) {
                quizResult.put("answerIndex", quiz.get("answerIndex"));
                quizResult.put("explanation", quiz.get("explanation"));
            }
            body.put("quizResult", quizResult);
        }
        return body;
    }

    @Transactional
    public Map<String, Object> verifyStep(
            Long userId, Long id, int stepIndex, Map<String, Object> params, Map<String, Object> readings) {
        DemoSession s = requireOwned(userId, id);
        ExperimentDefinition def = definitionOf(s);
        List<?> steps = listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps"));
        if (stepIndex < 0 || stepIndex >= steps.size()) {
            throw new ApiException(400, "stepIndex 越界");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> step = (Map<String, Object>) steps.get(stepIndex);
        @SuppressWarnings("unchecked")
        Map<String, Object> planParams = step.get("params") instanceof Map<?, ?> m
                ? (Map<String, Object>) m
                : Map.of();
        if (!paramsMatch(planParams, params)) {
            throw new ApiException(400, "参数与计划不一致");
        }
        String paramErr = def.validateParams(params);
        if (paramErr != null) {
            throw new ApiException(400, paramErr);
        }
        Map<String, Double> ideal = def.idealReadings(params);
        if (!readingsMatch(ideal, readings)) {
            throw new ApiException(400, "读数与理想模型不一致");
        }

        DemoStepEvent existing = eventMapper.selectOne(new LambdaQueryWrapper<DemoStepEvent>()
                .eq(DemoStepEvent::getSessionId, s.getId())
                .eq(DemoStepEvent::getStepIndex, stepIndex));
        if (existing == null) {
            DemoStepEvent ev = new DemoStepEvent();
            ev.setSessionId(s.getId());
            ev.setStepIndex(stepIndex);
            ev.setParamsJson(params);
            ev.setReadingsJson(readings);
            eventMapper.insert(ev);
        }
        s.setCurrentStep(Math.max(s.getCurrentStep() == null ? 0 : s.getCurrentStep(), stepIndex + 1));
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);

        Map<String, Object> ok = new LinkedHashMap<>();
        ok.put("ok", true);
        ok.put("stepIndex", stepIndex);
        ok.put("ideal", ideal);
        return ok;
    }

    @Transactional
    public Map<String, Object> submitQuiz(Long userId, Long id, int answerIndex) {
        DemoSession s = requireOwned(userId, id);
        Map<String, Object> quiz = quizOf(s.getPlanJson());
        if (quiz == null) {
            throw new ApiException(400, "该演示无随堂题");
        }
        int correctIdx = ((Number) quiz.get("answerIndex")).intValue();
        boolean correct = answerIndex == correctIdx;
        s.setQuizAnswerIndex(answerIndex);
        s.setQuizCorrect(correct);
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("correct", correct);
        out.put("answerIndex", correctIdx);
        out.put("chosenIndex", answerIndex);
        out.put("explanation", quiz.get("explanation"));
        return out;
    }

    /** 清除大步骤进度与答题，保留剧本；可重新完整观看。 */
    @Transactional
    public Map<String, Object> clearProgress(Long userId, Long id) {
        DemoSession s = requireOwned(userId, id);
        eventMapper.delete(new LambdaQueryWrapper<DemoStepEvent>()
                .eq(DemoStepEvent::getSessionId, s.getId()));
        LocalDateTime now = LocalDateTime.now();
        // updateById 默认忽略 null，须显式 set null
        sessionMapper.update(null, new LambdaUpdateWrapper<DemoSession>()
                .eq(DemoSession::getId, s.getId())
                .set(DemoSession::getCurrentStep, 0)
                .set(DemoSession::getStatus, "ready")
                .set(DemoSession::getQuizAnswerIndex, null)
                .set(DemoSession::getQuizCorrect, null)
                .set(DemoSession::getUpdateTime, now));
        s.setCurrentStep(0);
        s.setStatus("ready");
        s.setQuizAnswerIndex(null);
        s.setQuizCorrect(null);
        s.setUpdateTime(now);
        return toSummary(s);
    }

    @Transactional
    public Map<String, Object> updateStatus(Long userId, Long id, String status) {
        if (!StringUtils.hasText(status) || !STATUSES.contains(status.trim())) {
            throw new ApiException(400, "status 须为 ready|playing|done|aborted");
        }
        DemoSession s = requireOwned(userId, id);
        s.setStatus(status.trim());
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);
        return Map.of("id", s.getId(), "status", s.getStatus());
    }

    // ---- plan generation ----

    private Map<String, Object> generatePlan(
            ExperimentDefinition def, String goal, Map<String, Object> snapshot, String retryError)
            throws Exception {
        StringBuilder sys = new StringBuilder();
        sys.append("你是物理实验演示的「老师剧本」生成器。只输出一个 JSON 对象，不要 markdown，不要解释。\n")
                .append(def.capabilityPrompt()).append('\n')
                .append("计划 JSON 结构示例：\n").append(def.samplePlanJson()).append('\n')
                .append("严格遵守参数范围与步长；steps 数量 ")
                .append(def.minSteps()).append('～').append(def.maxSteps()).append("。\n")
                .append("讲稿必须像老师当面讲解：口语、有引导、有原理，禁止一句话参数指令。\n");
        StringBuilder user = new StringBuilder();
        user.append("用户演示目标：").append(goal).append('\n');
        if (snapshot != null && !snapshot.isEmpty()) {
            user.append("当前参数快照：").append(MAPPER.writeValueAsString(snapshot)).append('\n');
        }
        if (StringUtils.hasText(retryError)) {
            user.append("上次输出校验失败：").append(retryError).append("。请修正后重新输出完整 JSON。\n");
        }
        ChatResponse resp = aiModelFactory.chatModel().chat(
                SystemMessage.from(sys.toString()),
                UserMessage.from(user.toString()));
        String text = resp.aiMessage() != null ? resp.aiMessage().text() : null;
        if (!StringUtils.hasText(text)) {
            throw new ApiException(502, "模型未返回计划");
        }
        return MAPPER.readValue(stripFences(text), MAP_TYPE);
    }

    String validatePlan(ExperimentDefinition def, Map<String, Object> plan) {
        if (plan == null) {
            return "计划为空";
        }
        if (!StringUtils.hasText(str(plan.get("title"), null))) {
            return "缺少 title";
        }
        List<?> steps = listOf(plan.get("steps"));
        if (steps.size() < def.minSteps() || steps.size() > def.maxSteps()) {
            return "steps 数量须在 " + def.minSteps() + "～" + def.maxSteps();
        }
        for (int i = 0; i < steps.size(); i++) {
            if (!(steps.get(i) instanceof Map<?, ?> raw)) {
                return "step[" + i + "] 不是对象";
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> step = (Map<String, Object>) raw;
            if (!StringUtils.hasText(str(step.get("title"), null))) {
                return "step[" + i + "] 缺少 title";
            }
            if (!StringUtils.hasText(str(step.get("actionNarration"), null))) {
                return "step[" + i + "] 缺少 actionNarration";
            }
            if (!StringUtils.hasText(str(step.get("resultNarration"), null))) {
                return "step[" + i + "] 缺少 resultNarration";
            }
            String action = str(step.get("actionNarration"), "");
            String result = str(step.get("resultNarration"), "");
            if (action.length() < 40) {
                return "step[" + i + "] actionNarration 过短（需教学口播，至少约 40 字）";
            }
            if (result.length() < 40) {
                return "step[" + i + "] resultNarration 过短（需教学口播，至少约 40 字）";
            }
            String focus = str(step.get("focus"), null);
            if (focus == null || !def.allowedFocuses().contains(focus)) {
                return "step[" + i + "] focus 非法";
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> params = step.get("params") instanceof Map<?, ?> m
                    ? (Map<String, Object>) m
                    : null;
            String pe = def.validateParams(params);
            if (pe != null) {
                return "step[" + i + "] " + pe;
            }
        }
        if (!StringUtils.hasText(str(plan.get("summary"), null))) {
            return "缺少 summary";
        }
        Map<String, Object> quiz = quizOf(plan);
        if (quiz == null) {
            return "缺少 quiz";
        }
        if (!StringUtils.hasText(str(quiz.get("question"), null))) {
            return "quiz.question 缺失";
        }
        List<?> options = listOf(quiz.get("options"));
        if (options.size() != 4) {
            return "quiz.options 须为 4 项";
        }
        Object ai = quiz.get("answerIndex");
        if (!(ai instanceof Number n) || n.intValue() < 0 || n.intValue() > 3) {
            return "quiz.answerIndex 须为 0～3";
        }
        if (!StringUtils.hasText(str(quiz.get("explanation"), null))) {
            return "quiz.explanation 缺失";
        }
        return null;
    }

    // ---- helpers ----

    private ExperimentDefinition definitionOf(DemoSession s) {
        Experiment exp = experimentService.getById(s.getExperimentId());
        if (exp == null) {
            throw new ApiException(400, "关联实验已不存在");
        }
        ExperimentDefinition def = registry.find(exp.getRoute());
        if (def == null) {
            throw new ApiException(400, "未知实验：" + exp.getRoute());
        }
        return def;
    }

    private Map<String, Object> toSummary(DemoSession s) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", s.getId());
        row.put("experimentId", s.getExperimentId());
        row.put("goal", s.getGoal());
        row.put("title", s.getTitle());
        row.put("status", s.getStatus());
        int cur = s.getCurrentStep() == null ? 0 : s.getCurrentStep();
        row.put("currentStep", cur);
        int total = listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps")).size();
        row.put("totalSteps", total);
        row.put("quizAnswerIndex", s.getQuizAnswerIndex());
        row.put("quizCorrect", s.getQuizCorrect());
        row.put("createTime", s.getCreateTime());
        row.put("updateTime", s.getUpdateTime());
        return row;
    }

    private DemoSession requireOwned(Long userId, Long id) {
        DemoSession s = sessionMapper.selectById(id);
        if (s == null) {
            throw new ApiException(404, "演示不存在");
        }
        if (!userId.equals(s.getUserId())) {
            throw new ApiException(403, "无权访问该演示");
        }
        return s;
    }

    private static Map<String, Object> stripQuizAnswers(Map<String, Object> plan) {
        if (plan == null) {
            return null;
        }
        Map<String, Object> copy = new LinkedHashMap<>(plan);
        Map<String, Object> quiz = quizOf(copy);
        if (quiz != null) {
            Map<String, Object> q = new LinkedHashMap<>(quiz);
            q.remove("answerIndex");
            q.remove("explanation");
            copy.put("quiz", q);
        }
        return copy;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> quizOf(Map<String, Object> plan) {
        if (plan == null || !(plan.get("quiz") instanceof Map<?, ?> m)) {
            return null;
        }
        return (Map<String, Object>) m;
    }

    private static boolean paramsMatch(Map<String, Object> expected, Map<String, Object> actual) {
        if (actual == null) {
            return false;
        }
        Double ev1 = VenturiExperimentDefinition.asDouble(expected.get("v1"));
        Double av1 = VenturiExperimentDefinition.asDouble(actual.get("v1"));
        Double er = VenturiExperimentDefinition.asDouble(expected.get("areaRatio"));
        Double ar = VenturiExperimentDefinition.asDouble(actual.get("areaRatio"));
        String ef = str(expected.get("fluid"), "");
        String af = str(actual.get("fluid"), "");
        return close(ev1, av1) && close(er, ar) && ef.equals(af);
    }

    private static boolean readingsMatch(Map<String, Double> ideal, Map<String, Object> readings) {
        if (readings == null) {
            return false;
        }
        for (Map.Entry<String, Double> e : ideal.entrySet()) {
            Double got = VenturiExperimentDefinition.asDouble(readings.get(e.getKey()));
            if (got == null || !close(e.getValue(), got)) {
                return false;
            }
        }
        return true;
    }

    static boolean close(Double a, Double b) {
        if (a == null || b == null) {
            return false;
        }
        double abs = Math.abs(a - b);
        double rel = abs / Math.max(Math.abs(a), 1e-12);
        return abs <= 1e-6 || rel <= 1e-6;
    }

    static String stripFences(String text) {
        String t = text.trim();
        if (t.startsWith("```")) {
            int nl = t.indexOf('\n');
            if (nl > 0) {
                t = t.substring(nl + 1);
            }
            int end = t.lastIndexOf("```");
            if (end >= 0) {
                t = t.substring(0, end);
            }
        }
        return t.trim();
    }

    private static List<?> listOf(Object o) {
        return o instanceof List<?> l ? l : List.of();
    }

    private static String str(Object o, String fallback) {
        if (o == null) {
            return fallback;
        }
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? fallback : s;
    }

    private static String formatDetail(DemoSession s) {
        Map<String, Object> plan = s.getPlanJson();
        return "DEMO id=" + s.getId()
                + " title=" + s.getTitle()
                + " experimentId=" + s.getExperimentId()
                + " status=" + s.getStatus()
                + " steps=" + listOf(plan == null ? null : plan.get("steps")).size()
                + " overview=" + str(plan == null ? null : plan.get("overview"), "")
                + " summary=" + str(plan == null ? null : plan.get("summary"), "");
    }
}
