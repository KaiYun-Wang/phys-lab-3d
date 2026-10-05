package com.wky.backend.demo;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

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
                + "界面：左侧控制栏自上而下为「量子参数」组（缝间距 d 滑块、缝宽 a 滑块、发射速率滑块）"
                + "与「观测模式」组（波动模式 / 观测坍缩 两个按钮）、原理说明。"
                + "口播指引控件时说「控制栏从上到下…」，禁止说「从左到右依次是」。\n"
                + "注意：发射速率滑块仅在「观测坍缩」模式下显示，波动模式下隐藏；"
                + "旧的「显示粒子」开关已移除，一律不要再提。\n"
                + "可调参数（仅这些）：\n"
                + "- slitSeparation：缝间距 d，单位 mm，范围 [0.5, 1.0]，步长 0.05\n"
                + "- slitWidth：缝宽 a，单位 mm，范围 [0.1, 0.2]，步长 0.01\n"
                + "- particleRate：粒子发射速率，单位个每秒，范围 [100, 1000]，步长 5；仅观测坍缩模式下可见\n"
                + "- observerMode：观测模式，布尔值；false=波动模式（关闭观测，粒子同时经过双缝、与自己干涉，"
                + "屏上按固定节奏淡入明暗相间的条纹），true=观测坍缩（打开观测，粒子坍缩，只累积两条亮带）\n"
                + "波长固定 500 nm，不可调。\n"
                + "理想模型：条纹间距（mm）≈ 500 / 缝间距；缝间距越小，条纹越宽越疏。"
                + "波动模式下条纹淡入节奏与发射速率无关；发射速率只影响亮带/条纹的累积快慢，不改变图样位置。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus（slitSeparation|slitWidth|particleRate|observerMode），"
                + "前端会拧参动画并高亮控件；params 必须给出全部四个键。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "slitSeparation→缝间距/slit separation，slitWidth→缝宽/slit width，"
                + "particleRate→发射速率/emission rate，"
                + "observerMode→观测模式/observer（说「波动模式」「观测坍缩」「打开观测」「关闭观测」）。\n"
                + "narration：2～4 句教学口语；引导学生看屏幕上的条纹/亮带积累与左上角读数（缝间距、条纹间距、粒子数）。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"观测如何抹掉干涉条纹\","
                + "\"overview\":\"先切到波动模式看粒子累积出干涉条纹，再缩小缝间距对比条纹变宽，最后打开观测让条纹消失、只剩两条亮带\","
                + "\"steps\":["
                + "{\"title\":\"切波动模式，建立条纹基线\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":0.8,\"slitWidth\":0.15,\"particleRate\":300,\"observerMode\":false},"
                + "\"focus\":\"observerMode\","
                + "\"narration\":\"我们要做量子力学里最著名的实验。先把观测模式切到波动模式，也就是关闭观测，"
                + "让每个粒子同时经过两条缝、与自己发生干涉。屏幕上的亮纹会一条条按固定节奏淡入，这就是干涉条纹。"
                + "请盯住控制栏里的观测模式按钮，我会把它切到波动模式。\"},"
                + "{\"title\":\"读干涉条纹的基线\","
                + "\"animate\":false,"
                + "\"narration\":\"看屏幕和左上角读数：缝间距是 0.8 毫米，条纹间距约 625 毫米，粒子数在持续累积。"
                + "亮纹代表粒子出现概率高的位置，暗纹几乎不出现。"
                + "波长固定 500 纳米不可调，记住这组基线，下一步我们改变缝间距。\"},"
                + "{\"title\":\"缩小缝间距\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":0.5,\"slitWidth\":0.15,\"particleRate\":300,\"observerMode\":false},"
                + "\"focus\":\"slitSeparation\","
                + "\"narration\":\"接下来把缝间距从 0.8 调到 0.5 毫米。"
                + "请盯住缝间距滑块，同时观察屏幕：条纹间距与缝间距成反比，缝间距变小，条纹会变宽、变疏。"
                + "旧条纹会清空，新条纹重新积累。\"},"
                + "{\"title\":\"对比条纹间距变化\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数：条纹间距从约 625 毫米扩大到约 1000 毫米，正好是 1.6 倍。"
                + "条纹明显变宽变疏，这条反比关系是波动行为的标志性特征。"
                + "记住这个规律，下一步我们用它来检验观测的影响。\"},"
                + "{\"title\":\"打开观测\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":0.5,\"slitWidth\":0.15,\"particleRate\":600,\"observerMode\":true},"
                + "\"focus\":\"observerMode\","
                + "\"narration\":\"现在做最关键的一步：打开观测，去测量粒子到底走了哪条缝。"
                + "请注意屏幕：干涉条纹消失，粒子变成一颗颗打在屏上，只累积出两条亮带，就像普通的弹珠一样。"
                + "观测行为本身改变了实验结果，控制栏里也会多出发射速率这一项。\"},"
                + "{\"title\":\"提高发射速率\","
                + "\"animate\":true,"
                + "\"params\":{\"slitSeparation\":0.5,\"slitWidth\":0.15,\"particleRate\":1000,\"observerMode\":true},"
                + "\"focus\":\"particleRate\","
                + "\"narration\":\"最后把发射速率从每秒 300 提到 1000。"
                + "请盯住发射速率滑块：两条亮带会明显加速增厚，但亮带的位置和宽度不变。"
                + "这说明发射速率只决定累积快慢，不改变物理图样。\"}"
                + "],"
                + "\"summary\":\"回顾：波动模式下，粒子逐个累积出明暗相间的干涉条纹，条纹间距与缝间距成反比"
                + "（缝间距 0.8 变 0.5 毫米，条纹间距约从 625 扩到 1000 毫米）；"
                + "打开观测后，干涉消失，粒子坍缩为普通粒子行为，只剩两条亮带。"
                + "发射速率只影响累积快慢，不改变图样。核心结论：微观粒子既是粒子又是波，测量会破坏叠加态。\","
                + "\"quizzes\":["
                + "{\"question\":\"双缝实验中处于波动模式（关闭观测）时，粒子在屏幕上累积出什么图样？\","
                + "\"options\":[\"A. 两条亮带\",\"B. 明暗相间的干涉条纹\",\"C. 均匀一片\",\"D. 随机噪点\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"关闭观测时粒子处于两缝叠加态、与自身干涉，落点累积成明暗相间的条纹。\"},"
                + "{\"question\":\"其它条件不变，把缝间距从 0.8 毫米减到 0.5 毫米，条纹间距如何变化？\","
                + "\"options\":[\"A. 变窄约一半\",\"B. 不变\",\"C. 变宽约 1.6 倍\",\"D. 变成原值的四倍\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"条纹间距与缝间距成反比：0.8 除以 0.5 等于 1.6，条纹间距扩大到约 1.6 倍。\"},"
                + "{\"question\":\"保持观测坍缩模式，提高发射速率会使什么发生变化？\","
                + "\"options\":[\"A. 两条亮带的位置\",\"B. 条纹间距\",\"C. 只加快亮带累积速度\",\"D. 亮带变成干涉条纹\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"发射速率只决定单位时间打到屏上的粒子数，加快图样积累，不改变亮带位置与间距。\"}"
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
        if (!onStep(slitSeparation, 0.5, 1.0, 0.05)) {
            return "slitSeparation 须在 [0.5,1.0] 且步长 0.05";
        }
        if (!onStep(slitWidth, 0.1, 0.2, 0.01)) {
            return "slitWidth 须在 [0.1,0.2] 且步长 0.01";
        }
        if (!onStep(particleRate, 100, 1000, 5)) {
            return "particleRate 须在 [100,1000] 且步长 5";
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
