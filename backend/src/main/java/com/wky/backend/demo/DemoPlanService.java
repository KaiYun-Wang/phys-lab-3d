package com.wky.backend.demo;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wky.backend.config.AiModelFactory;
import com.wky.backend.domain.entity.DemoSession;
import com.wky.backend.domain.entity.Experiment;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.DemoSessionMapper;
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
    private static final Set<String> STATUSES = Set.of("ready", "playing", "aborted");

    private final AiModelFactory aiModelFactory;
    private final ExperimentDefinitionRegistry registry;
    private final IExperimentService experimentService;
    private final DemoSessionMapper sessionMapper;
    private final DemoTtsService demoTtsService;

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
        // Sync TTS: every clip synth+upload OK → write URLs; else plan stays silent of audio (full browser fallback)
        try {
            demoTtsService.ensureAudio(session.getId());
        } catch (Exception ignored) {
            /* browser fallback for whole demo */
        }

        int steps = listOf(plan.get("steps")).size();
        return "CREATED_DEMO id=" + session.getId()
                + " title=" + session.getTitle()
                + " steps=" + steps
                + " overview=" + str(plan.get("overview"), "");
    }

    /** Lazy/idempotent TTS fill; returns { ok, ready, made }. */
    public Map<String, Object> ensureAudio(Long userId, Long id) {
        requireOwned(userId, id);
        return demoTtsService.ensureAudio(id);
    }

    /**
     * 查演示（单工具内链式）：有 demoId 直接详查；否则按 query 模糊搜标题/目标，
     * 唯一命中则直接返回完整剧本（含步骤与随堂题标准答案）；多条则列候选供再传 id。
     */
    public String lookupDemo(Long userId, Long demoId, String query, Long experimentId) {
        if (demoId != null && demoId > 0) {
            return formatDetail(requireOwned(userId, demoId));
        }
        String q = StringUtils.hasText(query) ? query.trim() : "";
        if (q.matches("\\d+")) {
            try {
                return formatDetail(requireOwned(userId, Long.parseLong(q)));
            } catch (ApiException e) {
                return e.getMessage() != null ? e.getMessage() : "演示不存在。";
            }
        }
        if (!StringUtils.hasText(q)) {
            return formatRecentList(userId, experimentId);
        }
        List<DemoSession> hits = searchByQuery(userId, experimentId, q);
        if (hits.isEmpty()) {
            return "未找到与「" + q + "」相关的演示。可换关键词，或先 createDemo 生成。";
        }
        if (hits.size() == 1) {
            return formatDetail(hits.get(0));
        }
        DemoSession exact = null;
        for (DemoSession s : hits) {
            String title = s.getTitle() == null ? "" : s.getTitle().trim();
            if (title.equalsIgnoreCase(q) || title.contains(q)) {
                if (exact != null) {
                    exact = null;
                    break;
                }
                exact = s;
            }
        }
        if (exact != null) {
            return formatDetail(exact);
        }
        StringBuilder sb = new StringBuilder("找到多条演示，请用 lookupDemo(demoId=…) 指定其一：\n");
        for (DemoSession s : hits) {
            int n = listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps")).size();
            sb.append("- id=").append(s.getId())
                    .append(", title=").append(s.getTitle())
                    .append(", steps=").append(n)
                    .append(", status=").append(s.getStatus())
                    .append('\n');
        }
        return sb.toString().trim();
    }

    private List<DemoSession> searchByQuery(Long userId, Long experimentId, String q) {
        LambdaQueryWrapper<DemoSession> w = new LambdaQueryWrapper<DemoSession>()
                .eq(DemoSession::getUserId, userId)
                .and(x -> x.like(DemoSession::getTitle, q).or().like(DemoSession::getGoal, q))
                .orderByDesc(DemoSession::getUpdateTime)
                .last("LIMIT 8");
        if (experimentId != null) {
            w.eq(DemoSession::getExperimentId, experimentId);
        }
        return sessionMapper.selectList(w);
    }

    private String formatRecentList(Long userId, Long experimentId) {
        LambdaQueryWrapper<DemoSession> w = new LambdaQueryWrapper<DemoSession>()
                .eq(DemoSession::getUserId, userId)
                .orderByDesc(DemoSession::getUpdateTime)
                .last("LIMIT 10");
        if (experimentId != null) {
            w.eq(DemoSession::getExperimentId, experimentId);
        }
        List<DemoSession> list = sessionMapper.selectList(w);
        if (list.isEmpty()) {
            return "暂无演示记录。";
        }
        StringBuilder sb = new StringBuilder("最近演示（传 demoId 或标题关键词可查详情）：\n");
        for (DemoSession s : list) {
            int n = listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps")).size();
            sb.append("- id=").append(s.getId())
                    .append(", title=").append(s.getTitle())
                    .append(", steps=").append(n)
                    .append(", status=").append(s.getStatus())
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

    /** Client plan: quizzes 答案不下发；已答过的题附结果（对错现场算）。 */
    public Map<String, Object> getForClient(Long userId, Long id) {
        DemoSession s = requireOwned(userId, id);
        Map<String, Object> body = toSummary(s);
        body.put("plan", stripQuizAnswers(s.getPlanJson()));
        List<Map<String, Object>> quizzes = quizzesOf(s.getPlanJson());
        List<Integer> answers = s.getQuizAnswers();
        if (answers != null && !answers.isEmpty() && !quizzes.isEmpty()) {
            List<Map<String, Object>> results = new ArrayList<>();
            for (int i = 0; i < quizzes.size(); i++) {
                Integer chosen = i < answers.size() ? answers.get(i) : null;
                if (chosen == null) {
                    continue;
                }
                Map<String, Object> quiz = quizzes.get(i);
                Map<String, Object> one = new LinkedHashMap<>();
                one.put("questionIndex", i);
                one.put("chosenIndex", chosen);
                if (quiz.get("answerIndex") instanceof Number n) {
                    int correctIdx = n.intValue();
                    one.put("correct", chosen == correctIdx);
                    one.put("answerIndex", correctIdx);
                    one.put("explanation", quiz.get("explanation"));
                }
                results.add(one);
            }
            if (!results.isEmpty()) {
                body.put("quizResults", results);
            }
        }
        return body;
    }

    /** 标记步骤已播完，推进 current_step。 */
    @Transactional
    public Map<String, Object> completeStep(Long userId, Long id, int stepIndex) {
        DemoSession s = requireOwned(userId, id);
        List<?> steps = listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps"));
        if (stepIndex < 0 || stepIndex >= steps.size()) {
            throw new ApiException(400, "stepIndex 越界");
        }
        int next = stepIndex + 1;
        s.setCurrentStep(Math.max(s.getCurrentStep() == null ? 0 : s.getCurrentStep(), next));
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);
        return Map.of("ok", true, "stepIndex", stepIndex, "currentStep", s.getCurrentStep());
    }

    /**
     * 答一题。须已播完全部步骤（current_step &gt;= steps.length）。
     * 只存选项；对错与解析返回时现场算。
     */
    @Transactional
    public Map<String, Object> submitQuiz(Long userId, Long id, int questionIndex, int answerIndex) {
        DemoSession s = requireOwned(userId, id);
        if (!stepsFinished(s)) {
            throw new ApiException(400, "请先看完全部演示步骤再答题");
        }
        List<Map<String, Object>> quizzes = quizzesOf(s.getPlanJson());
        if (quizzes.isEmpty()) {
            throw new ApiException(400, "该演示无随堂题");
        }
        if (questionIndex < 0 || questionIndex >= quizzes.size()) {
            throw new ApiException(400, "questionIndex 越界");
        }
        if (answerIndex < 0 || answerIndex > 3) {
            throw new ApiException(400, "answerIndex 须为 0～3");
        }
        Map<String, Object> quiz = quizzes.get(questionIndex);
        int correctIdx = ((Number) quiz.get("answerIndex")).intValue();
        boolean correct = answerIndex == correctIdx;

        List<Integer> answers = new ArrayList<>();
        if (s.getQuizAnswers() != null) {
            answers.addAll(s.getQuizAnswers());
        }
        while (answers.size() < quizzes.size()) {
            answers.add(null);
        }
        answers.set(questionIndex, answerIndex);
        s.setQuizAnswers(answers);
        s.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(s);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("questionIndex", questionIndex);
        out.put("correct", correct);
        out.put("answerIndex", correctIdx);
        out.put("chosenIndex", answerIndex);
        out.put("explanation", quiz.get("explanation"));
        return out;
    }

    /** 清除步骤进度与答题，保留剧本；可重新完整观看。 */
    @Transactional
    public Map<String, Object> clearProgress(Long userId, Long id) {
        DemoSession s = requireOwned(userId, id);
        LocalDateTime now = LocalDateTime.now();
        sessionMapper.update(null, new LambdaUpdateWrapper<DemoSession>()
                .eq(DemoSession::getId, s.getId())
                .set(DemoSession::getCurrentStep, 0)
                .set(DemoSession::getStatus, "ready")
                .set(DemoSession::getQuizAnswers, null)
                .set(DemoSession::getUpdateTime, now));
        s.setCurrentStep(0);
        s.setStatus("ready");
        s.setQuizAnswers(null);
        s.setUpdateTime(now);
        return toSummary(s);
    }

    /** 硬删除演示会话（不软删）。 */
    @Transactional
    public void delete(Long userId, Long id) {
        DemoSession s = requireOwned(userId, id);
        sessionMapper.deleteById(s.getId());
        // ponytail: orphan MinIO clips OK; add cleanup when storage accrues cost
    }

    @Transactional
    public Map<String, Object> updateStatus(Long userId, Long id, String status) {
        if (!StringUtils.hasText(status) || !STATUSES.contains(status.trim())) {
            throw new ApiException(400, "status 须为 ready|playing|aborted");
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
        boolean english = isEnglishSpeechGoal(goal);
        StringBuilder sys = new StringBuilder();
        sys.append("你是物理实验演示的「老师剧本」生成器。只输出一个 JSON 对象，不要 markdown，不要解释。\n");
        if (english) {
            sys.append("【强制语言=English】用户目标为外语：title、overview、steps[].title、")
                    .append("steps[].narration、summary、quizzes 的 question/options/explanation 必须全部是英文。")
                    .append("下方示例与实验说明里的中文只作结构/物理参考，禁止照抄中文句子。\n");
        } else {
            sys.append("【强制语言=中文】title、overview、narration、summary、quizzes 全部用中文。\n");
        }
        sys.append(def.capabilityPrompt()).append('\n')
                .append("计划 JSON 结构示例（语言以强制语言为准，勿被示例中文带偏）：\n")
                .append(def.samplePlanJson()).append('\n')
                .append("严格遵守参数范围与步长；steps 数量 ")
                .append(def.minSteps()).append('～').append(def.maxSteps()).append("。\n")
                .append("讲稿必须像老师当面讲解：口语、有引导、有原理，禁止一句话参数指令。\n")
                .append("【口播可念——全实验通用】overview / narration / summary / quizzes 题干选项会进 TTS 或展示。\n")
                .append("每步只有一层：title + narration + animate；不要再拆 action/result。\n")
                .append("随堂题：字段 quizzes 为数组，1～5 道四选一；由你按知识点选合适题量，勿凑数。\n")
                .append("只允许中文或英文二选一（已在上方强制），禁止其它语言，禁止中英混写口播正文。\n")
                .append("数值一律用阿拉伯数字（如 2.0、0.5、6000）；中文口播禁止中文数词")
                .append("（禁止「二点零」「零点五」「六千」等）。单位：中文口播用中文（米每秒、帕）；")
                .append("英文口播用英文单位口语（meters per second、pascals）。\n")
                .append("禁止程序标识、驼峰/枚举名、界面缩写进口播（如 v1、areaRatio、deltaP）；")
                .append("改用可读名称（中文：入口流速/面积比/水；英文：inlet velocity/area ratio/water）。")
                .append("参数键名、枚举英文只允许出现在 params、focus 等结构化字段。\n")
                .append("禁止数学符号与公式串：希腊字母、上下标、LaTeX、运算符粘贴；")
                .append("关系用口语讲，勿粘贴理想模型公式。\n");
        StringBuilder user = new StringBuilder();
        user.append("用户演示目标：").append(goal).append('\n');
        user.append("口播语言选择：").append(speechLanguageHint(goal)).append('\n');
        if (english) {
            user.append("再次确认：本计划全部用户可见文本必须是 English。\n");
        }
        if (snapshot != null && !snapshot.isEmpty()) {
            user.append("当前参数/读数快照（键名含义见上方实验说明）：")
                    .append(MAPPER.writeValueAsString(snapshot)).append('\n');
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
            if (!StringUtils.hasText(str(step.get("narration"), null))) {
                return "step[" + i + "] 缺少 narration";
            }
            String narration = str(step.get("narration"), "");
            if (narration.length() < 40) {
                return "step[" + i + "] narration 过短（需教学口播，至少约 40 字）";
            }
            Boolean animate = asBoolean(step.get("animate"));
            if (animate == null) {
                return "step[" + i + "] 缺少 animate（true/false）";
            }
            if (animate) {
                String focus = str(step.get("focus"), null);
                if (focus == null || !def.allowedFocuses().contains(focus)) {
                    return "step[" + i + "] animate=true 时 focus 非法";
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
        }
        if (!StringUtils.hasText(str(plan.get("summary"), null))) {
            return "缺少 summary";
        }
        List<?> quizzes = listOf(plan.get("quizzes"));
        if (quizzes.isEmpty() && plan.get("quiz") instanceof Map<?, ?>) {
            quizzes = List.of(plan.get("quiz"));
        }
        if (quizzes.size() < 1 || quizzes.size() > 5) {
            return "quizzes 数量须在 1～5";
        }
        for (int qi = 0; qi < quizzes.size(); qi++) {
            if (!(quizzes.get(qi) instanceof Map<?, ?> rawQ)) {
                return "quizzes[" + qi + "] 不是对象";
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> quiz = (Map<String, Object>) rawQ;
            if (!StringUtils.hasText(str(quiz.get("question"), null))) {
                return "quizzes[" + qi + "].question 缺失";
            }
            List<?> options = listOf(quiz.get("options"));
            if (options.size() != 4) {
                return "quizzes[" + qi + "].options 须为 4 项";
            }
            Object ai = quiz.get("answerIndex");
            if (!(ai instanceof Number n) || n.intValue() < 0 || n.intValue() > 3) {
                return "quizzes[" + qi + "].answerIndex 须为 0～3";
            }
            if (!StringUtils.hasText(str(quiz.get("explanation"), null))) {
                return "quizzes[" + qi + "].explanation 缺失";
            }
        }
        plan.put("quizzes", quizzes);
        plan.remove("quiz");
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
        row.put("quizAnswers", s.getQuizAnswers());
        row.put("stepsFinished", cur >= total && total > 0);
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

    private static boolean stepsFinished(DemoSession s) {
        int n = listOf(s.getPlanJson() == null ? null : s.getPlanJson().get("steps")).size();
        int cur = s.getCurrentStep() == null ? 0 : s.getCurrentStep();
        return n > 0 && cur >= n;
    }

    private static Map<String, Object> stripQuizAnswers(Map<String, Object> plan) {
        if (plan == null) {
            return null;
        }
        Map<String, Object> copy = new LinkedHashMap<>(plan);
        List<Map<String, Object>> quizzes = quizzesOf(copy);
        if (!quizzes.isEmpty()) {
            List<Map<String, Object>> stripped = new ArrayList<>();
            for (Map<String, Object> quiz : quizzes) {
                Map<String, Object> q = new LinkedHashMap<>(quiz);
                q.remove("answerIndex");
                q.remove("explanation");
                stripped.add(q);
            }
            copy.put("quizzes", stripped);
        }
        copy.remove("quiz");
        return copy;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> quizzesOf(Map<String, Object> plan) {
        if (plan == null) {
            return List.of();
        }
        List<?> raw = listOf(plan.get("quizzes"));
        if (raw.isEmpty() && plan.get("quiz") instanceof Map<?, ?>) {
            raw = List.of(plan.get("quiz"));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object o : raw) {
            if (o instanceof Map<?, ?> m) {
                out.add((Map<String, Object>) m);
            }
        }
        return out;
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

    /**
     * 中文为主 → 中文口播；否则统一英文（外语/混杂以外语为主）。
     * 启发式：汉字占比 ≥ 拉丁字母占比则中文。
     */
    static boolean isEnglishSpeechGoal(String goal) {
        if (!StringUtils.hasText(goal)) {
            return false;
        }
        int han = 0;
        int latin = 0;
        for (int i = 0; i < goal.length(); ) {
            int cp = goal.codePointAt(i);
            i += Character.charCount(cp);
            if (Character.UnicodeScript.of(cp) == Character.UnicodeScript.HAN) {
                han++;
            } else if ((cp >= 'A' && cp <= 'Z') || (cp >= 'a' && cp <= 'z')) {
                latin++;
            }
        }
        return latin > han;
    }

    static String speechLanguageHint(String goal) {
        if (!StringUtils.hasText(goal)) {
            return "zh（目标为空，默认中文）";
        }
        if (!isEnglishSpeechGoal(goal)) {
            return "zh（汉字为主：overview/narration/summary/quizzes 用中文）";
        }
        return "en（外语为主：overview/narration/summary/quizzes 统一英文）";
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

    /** true/false or "true"/"false"; null if missing/invalid. */
    private static Boolean asBoolean(Object o) {
        if (o instanceof Boolean b) {
            return b;
        }
        if (o == null) {
            return null;
        }
        String s = String.valueOf(o).trim();
        if ("true".equalsIgnoreCase(s)) {
            return true;
        }
        if ("false".equalsIgnoreCase(s)) {
            return false;
        }
        return null;
    }

    /** 给模型看的完整剧本（含随堂题标准答案）；客户端接口仍走 stripQuizAnswers。 */
    private static String formatDetail(DemoSession s) {
        Map<String, Object> plan = s.getPlanJson();
        StringBuilder sb = new StringBuilder();
        sb.append("DEMO id=").append(s.getId()).append('\n');
        sb.append("title=").append(nullToEmpty(s.getTitle())).append('\n');
        sb.append("goal=").append(nullToEmpty(s.getGoal())).append('\n');
        sb.append("experimentId=").append(s.getExperimentId()).append('\n');
        sb.append("status=").append(s.getStatus()).append('\n');
        int cur = s.getCurrentStep() == null ? 0 : s.getCurrentStep();
        List<?> steps = listOf(plan == null ? null : plan.get("steps"));
        sb.append("progress=").append(cur).append('/').append(steps.size()).append('\n');
        if (plan != null) {
            sb.append("overview=").append(str(plan.get("overview"), "")).append('\n');
            sb.append("summary=").append(str(plan.get("summary"), "")).append('\n');
            sb.append("steps:\n");
            for (int i = 0; i < steps.size(); i++) {
                if (!(steps.get(i) instanceof Map<?, ?> raw)) {
                    continue;
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> step = (Map<String, Object>) raw;
                sb.append("  [").append(i + 1).append("] ")
                        .append(str(step.get("title"), "")).append('\n');
                String narr = str(step.get("narration"), "");
                if (StringUtils.hasText(narr)) {
                    sb.append("      narration: ").append(narr).append('\n');
                }
                if (Boolean.TRUE.equals(asBoolean(step.get("animate")))) {
                    sb.append("      animate: true");
                    if (step.get("params") != null) {
                        sb.append(" params=").append(step.get("params"));
                    }
                    if (step.get("focus") != null) {
                        sb.append(" focus=").append(step.get("focus"));
                    }
                    sb.append('\n');
                }
            }
            List<Map<String, Object>> quizzes = quizzesOf(plan);
            if (!quizzes.isEmpty()) {
                sb.append("quizzes:\n");
                for (int qi = 0; qi < quizzes.size(); qi++) {
                    Map<String, Object> quiz = quizzes.get(qi);
                    sb.append("  Q").append(qi + 1).append(". ")
                            .append(str(quiz.get("question"), "")).append('\n');
                    List<?> options = listOf(quiz.get("options"));
                    for (int oi = 0; oi < options.size(); oi++) {
                        sb.append("      ").append((char) ('A' + oi)).append(") ")
                                .append(options.get(oi)).append('\n');
                    }
                    Object ai = quiz.get("answerIndex");
                    if (ai instanceof Number n) {
                        int idx = n.intValue();
                        sb.append("      correct=").append((char) ('A' + idx))
                                .append(" (answerIndex=").append(idx).append(")\n");
                    }
                    String expl = str(quiz.get("explanation"), "");
                    if (StringUtils.hasText(expl)) {
                        sb.append("      explanation: ").append(expl).append('\n');
                    }
                }
            }
        }
        List<Integer> answers = s.getQuizAnswers();
        if (answers != null && !answers.isEmpty()) {
            sb.append("userQuizAnswers=").append(answers).append('\n');
        }
        return sb.toString().trim();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
