package com.wky.backend.demo;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Double-slit interference demo adapter. */
@Component
public class DoubleSlitExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES =
            Set.of("slitSeparation", "slitWidth", "particleRate", "observerMode");

    @Override
    public String route() {
        return "double-slit";
    }

    @Override
    public int minSteps() {
        return 4;
    }

    @Override
    public int maxSteps() {
        return 8;
    }

    @Override
    public String capabilityPrompt() {
        return "实验：双缝干涉（route=double-slit）\n"
                + "界面：左侧控制栏自上而下依次为缝间距、缝宽、发射速率，然后是波动模式/观测开关与显示粒子。"
                + "口播指引控件时说「控制栏从上到下…」，禁止说「从左到右依次是」。\n"
                + "可调参数（仅这些）：\n"
                + "- slitSeparation：缝间距 d，单位 mm，范围 [0.5, 5]，步长 0.1\n"
                + "- slitWidth：缝宽 a，单位 mm，范围 [0.1, 1.0]，步长 0.05\n"
                + "- particleRate：粒子发射速率，单位个每秒，范围 [1, 10]，步长 1\n"
                + "- observerMode：观测开关，布尔值；true=开观测（粒子坍缩，只剩两条亮带），"
                + "false=关观测（波动干涉，出现明暗条纹）\n"
                + "波长固定 500 nm，不可调。\n"
                + "理想模型：条纹间距（mm）= 500 / 缝间距；缝间距越小，条纹越宽越疏。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus（slitSeparation|slitWidth|particleRate|observerMode），"
                + "前端会拧参动画并高亮控件；params 必须给出全部四个键。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "slitSeparation→缝间距/slit separation，slitWidth→缝宽/slit width，"
                + "particleRate→发射速率/emission rate，"
                + "observerMode→观测开关/observer（说「打开观测」「关闭观测」）。\n"
                + "narration：2～4 句教学口语；引导学生看屏幕上的条纹积累与读数面板。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"观测如何抹掉干涉条纹\","
                + "\"overview\":\"先关闭观测看粒子累积出干涉条纹，再缩小缝间距对比条纹变化，最后打开观测让条纹消失\"," 
                + "\"steps\":["
                + "{\"title\":\"关闭观测，建立波动基线\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":2,\"slitWidth\":0.3,\"particleRate\":3,\"observerMode\":false},"
                + "\"focus\":\"observerMode\","
                + "\"narration\":\"我们要做量子力学里最著名的实验。先把观测开关关掉，让粒子不受测量干扰地通过双缝。"
                + "屏幕上的亮纹会一条条积累出来，这就是干涉条纹。"
                + "请盯住控制栏里的观测开关，我会把它切到关闭状态。\"}," 
                + "{\"title\":\"读干涉条纹的积累\","
                + "\"animate\":false,"
                + "\"narration\":\"看屏幕和读数面板：粒子一个一个通过狭缝，落点却不是随机的，而是逐渐累积出明暗相间的条纹。"
                + "亮的区域代表粒子出现概率高，暗的区域几乎不出现。"
                + "这说明每个粒子都同时经历了两条缝，与自己发生了干涉。\"}," 
                + "{\"title\":\"缩小缝间距\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":1,\"slitWidth\":0.3,\"particleRate\":5,\"observerMode\":false},"
                + "\"focus\":\"slitSeparation\","
                + "\"narration\":\"接下来把缝间距从 2 毫米减半到 1 毫米，同时把发射速率提高到每秒 5 个，让新条纹更快显形。"
                + "请盯住缝间距滑块。条纹间距和缝间距成反比，缝间距越小，条纹越宽越疏。\"}," 
                + "{\"title\":\"对比条纹间距变化\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数：缝间距减半后，条纹间距从 250 毫米变成 500 毫米，正好翻倍。"
                + "条纹变得更宽更疏，这条反比关系是波动行为的标志性特征。"
                + "记住这个规律，下一步我们用它来检验观测的影响。\"}," 
                + "{\"title\":\"打开观测\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":1,\"slitWidth\":0.3,\"particleRate\":5,\"observerMode\":true},"
                + "\"focus\":\"observerMode\","
                + "\"narration\":\"现在做最关键的一步：打开观测开关，去测量粒子到底走了哪条缝。"
                + "请注意屏幕：干涉条纹消失，粒子变成两条亮带，就像普通的弹珠一样。"
                + "观测行为本身改变了实验结果。\"}," 
                + "{\"title\":\"对比两种模式\","
                + "\"animate\":false,"
                + "\"narration\":\"对比刚才的两种情况：关闭观测时，粒子呈现波动行为，形成干涉条纹；"
                + "一旦打开观测，叠加态被破坏，粒子只走一条缝，条纹消失只剩两条亮带。"
                + "这就是波粒二象性与观测效应最直接的展示。\"}" 
                + "],"
                + "\"summary\":\"回顾：关闭观测时，粒子逐个累积出明暗相间的干涉条纹，且条纹间距与缝间距成反比；"
                + "打开观测后，干涉消失，粒子坍缩为普通粒子行为，只剩两条亮带。"
                + "核心结论：微观粒子既是粒子又是波，测量会破坏叠加态，改变最终的实验结果。\"," 
                + "\"quizzes\":["
                + "{\"question\":\"双缝实验中关闭观测时，粒子的落点在屏幕上呈现什么图样？\","
                + "\"options\":[\"A. 两条亮带\",\"B. 明暗相间的干涉条纹\",\"C. 均匀一片\",\"D. 随机噪点\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"关闭观测时粒子处于两缝叠加态，与自身干涉，落点累积成明暗相间的条纹。\"}," 
                + "{\"question\":\"其它条件不变，把缝间距减半，条纹间距如何变化？\","
                + "\"options\":[\"A. 减半\",\"B. 不变\",\"C. 加倍\",\"D. 变成四倍\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"条纹间距与缝间距成反比，缝间距减半则条纹间距加倍。\"}," 
                + "{\"question\":\"打开观测后干涉条纹消失，主要原因是？\","
                + "\"options\":[\"A. 粒子速度变快\",\"B. 缝宽变大\","
                + "\"C. 观测导致波函数坍缩\",\"D. 波长变短\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"观测使粒子波函数坍缩到确定路径，叠加态被破坏，干涉条纹随之消失。\"}" 
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double slitSeparation = asDouble(params.get("slitSeparation"));
        Double slitWidth = asDouble(params.get("slitWidth"));
        Double particleRate = asDouble(params.get("particleRate"));
        Boolean observerMode = asBoolean(params.get("observerMode"));
        if (slitSeparation == null) {
            return "缺少 slitSeparation";
        }
        if (slitWidth == null) {
            return "缺少 slitWidth";
        }
        if (particleRate == null) {
            return "缺少 particleRate";
        }
        if (observerMode == null) {
            return "缺少 observerMode（布尔）";
        }
        if (!onStep(slitSeparation, 0.5, 5, 0.1)) {
            return "slitSeparation 须在 [0.5,5] 且步长 0.1";
        }
        if (!onStep(slitWidth, 0.1, 1.0, 0.05)) {
            return "slitWidth 须在 [0.1,1.0] 且步长 0.05";
        }
        if (!onStep(particleRate, 1, 10, 1)) {
            return "particleRate 须在 [1,10] 且步长 1";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double slitSeparation = asDouble(params.get("slitSeparation"));
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("wavelength", 500.0);
        out.put("slitSeparation", slitSeparation);
        out.put("slitWidth", asDouble(params.get("slitWidth")));
        out.put("particleRate", asDouble(params.get("particleRate")));
        out.put("fringeSpacing", 500.0 / slitSeparation);
        return out;
    }

    @Override
    public Set<String> allowedFocuses() {
        return FOCUSES;
    }

    static Double asDouble(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static Boolean asBoolean(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v == null) {
            return null;
        }
        String s = String.valueOf(v).trim();
        if ("true".equalsIgnoreCase(s)) {
            return true;
        }
        if ("false".equalsIgnoreCase(s)) {
            return false;
        }
        return null;
    }

    static boolean onStep(double v, double min, double max, double step) {
        if (v < min - 1e-9 || v > max + 1e-9) {
            return false;
        }
        double n = Math.round((v - min) / step);
        return Math.abs(v - (min + n * step)) <= 1e-6;
    }
}
