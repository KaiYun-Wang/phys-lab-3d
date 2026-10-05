package com.wky.backend.demo;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

/** Doppler effect demo adapter. */
@Component
public class DopplerExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES = Set.of(
            "sourceFrequency", "sourceVelocity", "waveSpeed", "observerPosition");

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
                + "界面：左侧控制栏自上而下为「波参数」组（源频率、源速度、波速三个滑块）、"
                + "「观察者」组（观察者位置滑块）、原理说明。口播勿说从左到右。\n"
                + "声源工作方式：声源沿中轴自动往复振荡（像警报器来回移动）。"
                + "旧的「手动/自动模式」开关与「声源方向」滑块已移除，禁止再提。\n"
                + "可调参数（仅这些）：\n"
                + "- sourceFrequency：声源频率 f0，单位 Hz，范围 [0.5, 5]，步长 0.1\n"
                + "- sourceVelocity：声源速度，即往复振荡的峰值速度，单位 m/s，范围 [0, 15]，步长 0.1\n"
                + "- waveSpeed：声波波速，单位 m/s，范围 [5, 20]，步长 0.1\n"
                + "- observerPosition：观察者位置，单位 m，范围 [-20, 20]，步长 0.1\n"
                + "理想模型：朝观察者运动时 f_obs = f0 * v / (v - vs)；远离时 f_obs = f0 * v / (v + vs)；"
                + "马赫数 = vs / v。\n"
                + "读数特征：观测频率随声源往复运动在蓝移峰值与红移谷值之间来回摆动，"
                + "口播请用「峰值/谷值」或「在蓝移与红移之间摆动」描述，不要断言某一瞬间的固定读数。\n"
                + "演示建议：sourceVelocity 保持小于 waveSpeed（马赫数小于 1），避免超音速附近的读数奇点；"
                + "观察者位置尽量放在声源振荡范围之外的一侧，让「靠近=蓝移、远离=红移」的对应更清晰。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus"
                + "（sourceFrequency|sourceVelocity|waveSpeed|observerPosition），"
                + "前端会拧参动画并高亮控件；params 必须给出全部四个键。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "sourceFrequency→源频率/source frequency，sourceVelocity→源速度/source speed，"
                + "waveSpeed→波速/wave speed，observerPosition→观察者位置/observer position；"
                + "读数 observedFrequency→观测频率，dopplerShiftRatio→多普勒比，machNumber→马赫数。\n"
                + "narration：2～4 句教学口语；引导学生看声源前后波前的疏密与左上角读数。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"声源往复运动：蓝移与红移的峰值对比\","
                + "\"overview\":\"先建立静止基线，再让声源以 5 米每秒往复运动看蓝移峰值与红移谷值，最后提速到 8 米每秒对比频移幅度\","
                + "\"steps\":["
                + "{\"title\":\"建立静止基线\","
                + "\"animate\":true,"
                + "\"params\":{\"sourceFrequency\":2,\"sourceVelocity\":0,\"waveSpeed\":10,\"observerPosition\":15},"
                + "\"focus\":\"sourceVelocity\","
                + "\"narration\":\"多普勒效应研究的是声源与观察者相对运动时听到的频率变化。"
                + "先把源速度设为 0，让声源静止，观察者站在右侧 15 米处。"
                + "此刻观测频率应该和源频率完全一样，请盯住控制栏里的源速度滑块，我先把它归零。\"},"
                + "{\"title\":\"读静止读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看左上角读数：观测频率等于源频率 2 赫兹，多普勒比 1.00，马赫数为 0。"
                + "没有相对运动就没有频移，这就是我们的对照基准。"
                + "接下来让声源动起来，看读数会怎么变。\"},"
                + "{\"title\":\"声源缓缓往复\","
                + "\"animate\":true,"
                + "\"params\":{\"sourceFrequency\":2,\"sourceVelocity\":5,\"waveSpeed\":10,\"observerPosition\":15},"
                + "\"focus\":\"sourceVelocity\","
                + "\"narration\":\"把源速度提到 5 米每秒，声源开始沿中轴往复运动，峰值速度和滑块一致。"
                + "请注意看场景：声源前进方向上的波前被压密，后方被拉疏。"
                + "因为声源来回走，观测频率会在蓝移峰值和红移谷值之间持续摆动。\"},"
                + "{\"title\":\"读蓝移红移峰值\","
                + "\"animate\":false,"
                + "\"narration\":\"观察读数的摆动：声源靠近时观测频率冲到峰值约 4 赫兹，是源频率的两倍，这就是蓝移；"
                + "远离时降到谷值约 1.33 赫兹，只有源频率的三分之二，这就是红移。"
                + "峰值马赫数 0.5，还没有到超音速。\"},"
                + "{\"title\":\"提高源速度\","
                + "\"animate\":true,"
                + "\"params\":{\"sourceFrequency\":2,\"sourceVelocity\":8,\"waveSpeed\":10,\"observerPosition\":-20},"
                + "\"focus\":\"sourceVelocity\","
                + "\"narration\":\"现在把源速度从 5 提到 8 米每秒，同时把观察者移到左侧 20 米处，"
                + "让它待在声源振荡范围之外，靠近与远离的对应关系更干净。"
                + "请盯住源速度滑块，看频移幅度如何随速度增大而变得更剧烈。\"},"
                + "{\"title\":\"对比频移幅度\","
                + "\"animate\":false,"
                + "\"narration\":\"对比刚才：速度从 5 升到 8 米每秒，蓝移峰值从约 4 赫兹升到约 10 赫兹，"
                + "红移谷值从 1.33 赫兹降到约 1.11 赫兹，峰值马赫数从 0.5 升到 0.8。"
                + "速度越接近波速，蓝移峰值升高得越极端——快到波速时读数会趋于无穷，这就是音障附近的特征。\"}"
                + "],"
                + "\"summary\":\"回顾：声源静止时观测频率与源频率相同；声源往复运动时，"
                + "靠近观察者的一侧波前压缩、观测频率升高（蓝移峰值），远离的一侧波前拉疏、频率降低（红移谷值）。"
                + "频移幅度由源速度与波速的比值决定：速度从 5 提到 8 米每秒（波速 10），"
                + "蓝移峰值从约 4 赫兹升到约 10 赫兹，红移谷值从约 1.33 赫兹降到约 1.11 赫兹。"
                + "马赫数等于源速度除以波速，越接近 1，频率变化越极端。\","
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
                + "\"options\":[\"A. 观测频率与源频率之比\",\"B. 源速度与波速之比\","
                + "\"C. 波长与波速之比\",\"D. 观察者距离与波速之比\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"马赫数是源速度与波速的比值，达到 1 意味着声源追上自己发出的波。\"}"
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
        Double observerPosition = asDouble(params.get("observerPosition"));
        if (sourceFrequency == null) {
            return "缺少 sourceFrequency";
        }
        if (sourceVelocity == null) {
            return "缺少 sourceVelocity";
        }
        if (waveSpeed == null) {
            return "缺少 waveSpeed";
        }
        if (observerPosition == null) {
            return "缺少 observerPosition";
        }
        if (!onStep(sourceFrequency, 0.5, 5, 0.1)) {
            return "sourceFrequency 须在 [0.5,5] 且步长 0.1";
        }
        if (!onStep(sourceVelocity, 0, 15, 0.1)) {
            return "sourceVelocity 须在 [0,15] 且步长 0.1";
        }
        if (!onStep(waveSpeed, 5, 20, 0.1)) {
            return "waveSpeed 须在 [5,20] 且步长 0.1";
        }
        if (!onStep(observerPosition, -20, 20, 0.1)) {
            return "observerPosition 须在 [-20,20] 且步长 0.1";
        }
        if (sourceVelocity >= waveSpeed) {
            return "sourceVelocity 须小于 waveSpeed（避免超音速读数奇点）";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double sourceFrequency = asDouble(params.get("sourceFrequency"));
        double sourceVelocity = asDouble(params.get("sourceVelocity"));
        double waveSpeed = asDouble(params.get("waveSpeed"));
        Map<String, Double> out = new LinkedHashMap<>();
        double towardSafe = Math.min(sourceVelocity, waveSpeed * 0.999);
        double bluePeak = sourceFrequency * waveSpeed / (waveSpeed - towardSafe);
        double redTrough = sourceFrequency * waveSpeed / (waveSpeed + sourceVelocity);
        out.put("sourceFrequency", sourceFrequency);
        out.put("observedFrequencyPeak", bluePeak);
        out.put("observedFrequencyTrough", redTrough);
        out.put("dopplerShiftRatioPeak", bluePeak / sourceFrequency);
        out.put("machNumber", sourceVelocity / waveSpeed);
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

    static boolean onStep(double v, double min, double max, double step) {
        if (v < min - 1e-9 || v > max + 1e-9) {
            return false;
        }
        double n = Math.round((v - min) / step);
        return Math.abs(v - (min + n * step)) <= 1e-6;
    }
}
