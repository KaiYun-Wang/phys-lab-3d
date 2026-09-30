package com.wky.backend.demo;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Doppler effect demo adapter. */
@Component
public class DopplerExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES = Set.of(
            "sourceFrequency", "sourceVelocity", "waveSpeed",
            "sourceDirection", "observerPosition", "autoOscillate");

    @Override
    public String route() {
        return "doppler";
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
        return "实验：多普勒效应（route=doppler）\n"
                + "可调参数（仅这些）：\n"
                + "- sourceFrequency：声源频率 f0，单位 Hz，范围 [0.5, 5]，步长 0.1\n"
                + "- sourceVelocity：声源运动速度，单位 m/s，范围 [0, 15]，步长 0.5；仅手动模式下生效\n"
                + "- waveSpeed：声波波速，单位 m/s，范围 [5, 20]，步长 1\n"
                + "- sourceDirection：手动模式下声源方向，范围 [-1, 1]，步长 0.1；"
                + "1=向右（朝向右侧观察者），-1=向左（远离），0=静止\n"
                + "- observerPosition：观察者位置，单位 m，范围 [-20, 20]，步长 1\n"
                + "- autoOscillate：自动振荡开关，布尔值；true=声源自动往返，false=手动控制。"
                + "演示建议全程用 false（结果可控）\n"
                + "理想模型（手动模式）：朝向速度 vs = sourceDirection * sourceVelocity；"
                + "接近时 f_obs = f0 * waveSpeed / (waveSpeed - vs)；"
                + "远离时 f_obs = f0 * waveSpeed / (waveSpeed + |vs|)；"
                + "马赫数 = |sourceVelocity| / waveSpeed。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus"
                + "（sourceFrequency|sourceVelocity|waveSpeed|sourceDirection|observerPosition|autoOscillate），"
                + "前端会拧参动画并高亮控件；params 必须给出全部六个键。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "sourceFrequency→声源频率/source frequency，sourceVelocity→声源速度/source speed，"
                + "waveSpeed→波速/wave speed，sourceDirection→运动方向/direction，"
                + "observerPosition→观察者位置/observer position，"
                + "autoOscillate→自动振荡开关/auto mode（说「自动模式」「手动模式」）。\n"
                + "narration：2～4 句教学口语；引导学生看波前疏密与观测频率读数。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"声源奔向与离去：蓝移红移对比\","
                + "\"overview\":\"先建立静止基线，再让声源朝观察者运动听蓝移，最后掉头远离听红移，对比观测频率变化\"," 
                + "\"steps\":["
                + "{\"title\":\"切手动模式，建立静止基线\","
                + "\"animate\":true,"
                + "\"params\":{\"sourceFrequency\":2,\"sourceVelocity\":0,\"waveSpeed\":10,"
                + "\"sourceDirection\":0,\"observerPosition\":20,\"autoOscillate\":false},"
                + "\"focus\":\"autoOscillate\","
                + "\"narration\":\"多普勒效应讲的是：声源与观察者有相对运动时，听到的频率会变化。"
                + "先把声源切到手动模式，并让它保持静止。观察者站在右侧 20 米处，此刻听到的频率应该和声源完全一样。"
                + "请盯住左侧的模式开关，我会把它切到手动。\"}," 
                + "{\"title\":\"读静止读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数面板：观测频率等于声源频率 2.0 赫兹，多普勒比是 1.00，马赫数为 0。"
                + "没有相对运动，就没有频移。"
                + "这个 1.00 就是我们的对照基准，接下来的两次运动都要和它比较。\"}," 
                + "{\"title\":\"声源奔向观察者\","
                + "\"animate\":true,"
                + "\"params\":{\"sourceFrequency\":2,\"sourceVelocity\":5,\"waveSpeed\":10,"
                + "\"sourceDirection\":1,\"observerPosition\":20,\"autoOscillate\":false},"
                + "\"focus\":\"sourceDirection\","
                + "\"narration\":\"现在让声源朝观察者运动，速度设定为 5 米每秒，方向朝右。"
                + "请注意看场景：声源前方的波前被压密，后方的波前被拉疏。"
                + "波前变得越密，到达观察者的频率就越高。\"}," 
                + "{\"title\":\"读蓝移读数\","
                + "\"animate\":false,"
                + "\"narration\":\"读数很明显：观测频率从 2.0 赫兹升到了 4.0 赫兹，正好翻倍；马赫数 0.5，还没到超音速。"
                + "接近观察者时频率升高，这就是蓝移。"
                + "频移的大小取决于声源速度与波速的比值。\"}," 
                + "{\"title\":\"声源掉头远离\","
                + "\"animate\":true,"
                + "\"params\":{\"sourceFrequency\":2,\"sourceVelocity\":5,\"waveSpeed\":10,"
                + "\"sourceDirection\":-1,\"observerPosition\":20,\"autoOscillate\":false},"
                + "\"focus\":\"sourceDirection\","
                + "\"narration\":\"最后让声源掉头，朝远离观察者的方向运动，速度保持 5 米每秒不变。"
                + "请看波前：被拉疏的区域现在出现在声源前方朝向观察者的一侧。"
                + "远离时，到达观察者的波变得稀疏，频率下降。\"}," 
                + "{\"title\":\"读红移读数\","
                + "\"animate\":false,"
                + "\"narration\":\"对比刚才的蓝移：观测频率降到了约 1.33 赫兹，只有源频率的 67%。"
                + "同样的速度，接近时升到 2 倍，远离时降到 0.67 倍，偏离基准的幅度都很明显。"
                + "记住这条规律：接近蓝移、远离红移，速度越大越明显。\"}" 
                + "],"
                + "\"summary\":\"回顾：声源静止时，观测频率与源频率相同；"
                + "朝观察者运动时波前被压缩，观测频率升高，即蓝移；"
                + "远离时波前被拉疏，观测频率降低，即红移。"
                + "频移幅度由声源速度与波速的比值决定，速度越大变化越剧烈；"
                + "当速度接近波速时，接近方向的频率会急剧升高。\"," 
                + "\"quizzes\":["
                + "{\"question\":\"声源朝静止的观察者运动时，观察者听到的频率如何变化？\","
                + "\"options\":[\"A. 升高\",\"B. 降低\",\"C. 不变\",\"D. 先降低后升高\"],"
                + "\"answerIndex\":0,"
                + "\"explanation\":\"声源接近时波前被压缩，单位时间到达观察者的波数增多，频率升高。\"}," 
                + "{\"question\":\"其它条件不变，声源速度越大（仍小于波速），接近时听到的频率变化如何？\","
                + "\"options\":[\"A. 变化越小\",\"B. 变化越大\",\"C. 不变\",\"D. 与速度无关\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"频移幅度随声源速度增大而增大，速度接近波速时观测频率急剧升高。\"}," 
                + "{\"question\":\"马赫数等于下列哪项比值？\","
                + "\"options\":[\"A. 观测频率与源频率之比\",\"B. 声源速度与波速之比\","
                + "\"C. 波长与波速之比\",\"D. 观察者距离与波速之比\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"马赫数是声源速度与波速的比值，达到 1 意味着声源追上自己发出的波。\"}" 
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double sourceFrequency = asDouble(params.get("sourceFrequency"));
        Double sourceVelocity = asDouble(params.get("sourceVelocity"));
        Double waveSpeed = asDouble(params.get("waveSpeed"));
        Double sourceDirection = asDouble(params.get("sourceDirection"));
        Double observerPosition = asDouble(params.get("observerPosition"));
        Boolean autoOscillate = asBoolean(params.get("autoOscillate"));
        if (sourceFrequency == null) {
            return "缺少 sourceFrequency";
        }
        if (sourceVelocity == null) {
            return "缺少 sourceVelocity";
        }
        if (waveSpeed == null) {
            return "缺少 waveSpeed";
        }
        if (sourceDirection == null) {
            return "缺少 sourceDirection";
        }
        if (observerPosition == null) {
            return "缺少 observerPosition";
        }
        if (autoOscillate == null) {
            return "缺少 autoOscillate（布尔）";
        }
        if (!onStep(sourceFrequency, 0.5, 5, 0.1)) {
            return "sourceFrequency 须在 [0.5,5] 且步长 0.1";
        }
        if (!onStep(sourceVelocity, 0, 15, 0.5)) {
            return "sourceVelocity 须在 [0,15] 且步长 0.5";
        }
        if (!onStep(waveSpeed, 5, 20, 1)) {
            return "waveSpeed 须在 [5,20] 且步长 1";
        }
        if (!onStep(sourceDirection, -1, 1, 0.1)) {
            return "sourceDirection 须在 [-1,1] 且步长 0.1";
        }
        if (!onStep(observerPosition, -20, 20, 1)) {
            return "observerPosition 须在 [-20,20] 且步长 1";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double sourceFrequency = asDouble(params.get("sourceFrequency"));
        double sourceVelocity = asDouble(params.get("sourceVelocity"));
        double waveSpeed = asDouble(params.get("waveSpeed"));
        double sourceDirection = asDouble(params.get("sourceDirection"));
        // 声源位于观察者左侧的默认场景：方向乘速度即朝向速度
        double toward = sourceDirection * sourceVelocity;
        double observedFreq;
        if (toward > 0) {
            observedFreq = sourceFrequency * waveSpeed / (waveSpeed - toward);
        } else {
            observedFreq = sourceFrequency * waveSpeed / (waveSpeed + Math.abs(toward));
        }
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("sourceFrequency", sourceFrequency);
        out.put("observedFrequency", Math.max(0.0, observedFreq));
        out.put("dopplerShiftRatio", observedFreq / sourceFrequency);
        out.put("machNumber", Math.abs(sourceVelocity) / waveSpeed);
        out.put("waveSpeed", waveSpeed);
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
