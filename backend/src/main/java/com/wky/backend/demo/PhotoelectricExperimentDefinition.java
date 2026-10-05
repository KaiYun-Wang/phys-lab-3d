package com.wky.backend.demo;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

/** Photoelectric effect demo adapter. */
@Component
public class PhotoelectricExperimentDefinition implements ExperimentDefinition {

    /** hν = HC/λ，λ 用 nm，能量直接得 eV */
    private static final double HC = 1239.84;
    /** 饱和光电流系数：光强 100% 时约 9.5 μA（象征值） */
    private static final double ISAT_FULL = 9.5;

    /** 阴极材料逸出功（eV） */
    private static final Map<String, Double> PHI = Map.of(
            "cs", 2.10,
            "k", 2.30,
            "na", 2.40,
            "ca", 2.90,
            "zn", 4.30,
            "cu", 4.70,
            "pt", 5.60);

    private static final Set<String> FOCUSES = Set.of("wavelengthNm", "intensityPct", "voltageV", "material");

    @Override
    public String route() {
        return "photoelectric";
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
        return "实验：光电效应（route=photoelectric）\n"
                + "界面：左侧控制栏自上而下为「光源参数」（波长 λ 滑块、光强滑块）、「光电材料（阴极 K）」七种材料按钮"
                + "（铯/钾/钠/钙/锌/铜/铂）、「极间电压」（电压 U 滑块 + 典型场景预设：红光截止/紫外激发/反向拦截/饱和电流）与原理说明。"
                + "口播勿说从左到右。典型场景按钮会一次性设好三个参数"
                + "（红光截止 660nm/60%/0V、紫外激发 255nm/80%/0V、反向拦截 255nm/80%/−3V、饱和电流 255nm/100%/+2V），"
                + "演示步骤仍用 animate 拧滑块参数，口播可顺带提「预设按钮」但不写进 params。\n"
                + "可调参数（仅这些）：\n"
                + "- wavelengthNm：入射光波长，单位 nm，范围 [200,750]，步长 1；数值越小光子能量越高\n"
                + "- intensityPct：光强，单位 %，范围 [0,100]，步长 1；只影响单位时间光子数（与电子数量、饱和电流相关）\n"
                + "- voltageV：极间电压，单位 V，范围 [-5,5]，步长 0.1；负值为反向阻挡电压\n"
                + "- material：阴极材料，取值 cs=铯(φ=2.10 eV)、k=钾(2.30)、na=钠(2.40)、ca=钙(2.90)、zn=锌(4.30)、cu=铜(4.70)、pt=铂(5.60)\n"
                + "理想模型（λ 用 nm，能量用 eV）：光子能量 E=1239.84/λ；最大初动能 Kmax=E-φ（E<=φ 时为 0）；"
                + "截止电压 Uc=Kmax；极限波长 λ0=1239.84/φ；饱和光电流 Isat=光强(0~1)*9.5 μA（仅当 E>φ）；"
                + "反向电压下光电流 I=Isat*(1+U/Uc) 随反向电压线性减小，在 U=-Uc 处归零（U>=0 时恒为 Isat）。\n"
                + "典型区间：λ>λ0 无逸出（光强再大也没用）；λ<λ0 有逸出；U<0 电流减小；U>=0 饱和。"
                + "钠 φ=2.40 eV → λ0≈516.6 nm，例如 255 nm 紫外可激发（Kmax≈2.46 eV），660 nm 红光无法激发。\n"
                + "禁则：不得声称「增大光强能让低于极限波长的光产生光电流」；"
                + "不得声称光强会改变最大初动能或截止电压；不得把键名直接念出。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params（wavelengthNm、intensityPct、voltageV、material 四参数齐全）与 "
                + "focus（wavelengthNm|intensityPct|voltageV|material），前端会拧参动画并高亮控件。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照）：wavelengthNm→波长，intensityPct→光强，voltageV→极间电压/反向电压，"
                + "material→阴极材料；读数 photonEnergyEv→光子能量，workFunctionEv→逸出功，maxKineticEv→最大初动能，"
                + "stopVoltageV→截止电压，thresholdNm→极限波长，currentUa→光电流。\n"
                + "narration：2～4 句教学口语；引导学生观察阴极处的光颜色与电子流，或左上角读数"
                + "（状态、光子能量、逸出功、最大初动能、截止电压、极限波长、光电流）。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"光电效应：从极限波长到截止电压\","
                + "\"overview\":\"以钠阴极为例，先用紫外光打出光电子建立基准，再用红光证明极限波长，随后用反向电压逼近并越过截止电压，最后观察光强与饱和电流的正比关系\","
                + "\"steps\":["
                + "{\"title\":\"建立紫外激发基线\","
                + "\"animate\":true,"
                + "\"params\":{\"wavelengthNm\":255,\"intensityPct\":80,\"voltageV\":0,\"material\":\"na\"},"
                + "\"focus\":\"wavelengthNm\","
                + "\"narration\":\"我们先给钠阴极配上 255 纳米的紫外光。紫外光子的能量约 4.86 电子伏，高于钠的逸出功 2.40 电子伏，"
                + "所以阴极会持续逸出光电子。请盯住波长滑块，我会把参数推到目标值。\"},"
                + "{\"title\":\"读第一组读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看数据面板：光子能量 4.86 电子伏，减去逸出功 2.40 电子伏，最大初动能是 2.46 电子伏，"
                + "对应截止电压 2.46 伏；光强 80% 时饱和光电流约 7.6 微安。这就是我们要对照的基准。\"},"
                + "{\"title\":\"红光截止\","
                + "\"animate\":true,"
                + "\"params\":{\"wavelengthNm\":660,\"intensityPct\":80,\"voltageV\":0,\"material\":\"na\"},"
                + "\"focus\":\"wavelengthNm\","
                + "\"narration\":\"现在把波长推到 660 纳米的红光。红光光子的能量只有 1.88 电子伏，低于钠的逸出功 2.40 电子伏。"
                + "请盯住波长滑块——阴极的闪光和电子流会一起消失。\"},"
                + "{\"title\":\"极限波长定律\","
                + "\"animate\":false,"
                + "\"narration\":\"注意：无论光强加到多大，红光都打不出光电子，因为单个光子的能量由波长决定，而不是由光强决定。"
                + "钠的极限波长约 517 纳米，红光远远超过它。这正是光电效应最反直觉的实验事实。\"},"
                + "{\"title\":\"反向电压拦截\","
                + "\"animate\":true,"
                + "\"params\":{\"wavelengthNm\":255,\"intensityPct\":80,\"voltageV\":-2,\"material\":\"na\"},"
                + "\"focus\":\"voltageV\","
                + "\"narration\":\"回到紫外光，把极间电压反向推到负 2 伏。反向电场会拦住动能不足的电子，"
                + "光电流从 7.6 微安明显减小到约 1.4 微安，但还没有归零。请盯住电压滑块。\"},"
                + "{\"title\":\"越过截止电压\","
                + "\"animate\":true,"
                + "\"params\":{\"wavelengthNm\":255,\"intensityPct\":80,\"voltageV\":-3,\"material\":\"na\"},"
                + "\"focus\":\"voltageV\","
                + "\"narration\":\"继续推到负 3 伏，越过了 2.46 伏的截止电压。所有光电子都被拦回阴极，"
                + "光电流彻底归零——即使光强保持不变。截止电压是最大初动能的直接体现。\"},"
                + "{\"title\":\"光强与饱和电流\","
                + "\"animate\":true,"
                + "\"params\":{\"wavelengthNm\":255,\"intensityPct\":100,\"voltageV\":2,\"material\":\"na\"},"
                + "\"focus\":\"intensityPct\","
                + "\"narration\":\"最后换成正向电压，把光强拉满到 100%。所有逸出的电子都被阳极收集，"
                + "光电流升到约 9.5 微安，正是光强与饱和电流成正比。记住今天的结论：光强决定电子数量，波长决定单个电子的能量。\"}"
                + "],"
                + "\"summary\":\"回顾：光子能量 E=1239.84/λ 只由波长决定；λ 超过极限波长 λ0 时无论光强多大都无光电子逸出；"
                + "最大初动能 Kmax=E-φ，截止电压 Uc=Kmax 只由频率与材料决定；保持波长不变增大光强，饱和光电流成正比增大，截止电压不变。\","
                + "\"quizzes\":["
                + "{\"question\":\"用波长超过极限波长的红光照射钠阴极，不断增大光强，会出现什么现象？\","
                + "\"options\":[\"A. 光电流逐渐变大\",\"B. 仍然没有光电子逸出\",\"C. 光电子初动能变大\",\"D. 截止电压变小\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"单个光子能量 hν 低于逸出功 φ 时，增大光强只增加光子数量，不能改变单个光子的能量，所以没有光电子逸出。\"},"
                + "{\"question\":\"保持材料与光强不变，减小入射光波长，截止电压如何变化？\","
                + "\"options\":[\"A. 不变\",\"B. 减小\",\"C. 增大\",\"D. 先增大后减小\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"波长减小则频率升高，光子能量 E 增大，最大初动能 Kmax=E-φ 增大，截止电压 Uc=Kmax 随之增大。\"},"
                + "{\"question\":\"保持波长不变，增大光强，下列哪一项会改变？\","
                + "\"options\":[\"A. 最大初动能\",\"B. 饱和光电流\",\"C. 截止电压\",\"D. 极限波长\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"光强决定单位时间到达的光子数，即逸出电子数，所以饱和光电流随光强增大；最大初动能、截止电压、极限波长都只由波长与材料决定。\"}"
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double wave = asDouble(params.get("wavelengthNm"));
        Double intensity = asDouble(params.get("intensityPct"));
        Double voltage = asDouble(params.get("voltageV"));
        if (wave == null) {
            return "缺少 wavelengthNm";
        }
        if (intensity == null) {
            return "缺少 intensityPct";
        }
        if (voltage == null) {
            return "缺少 voltageV";
        }
        if (!onStep(wave, 200, 750, 1)) {
            return "wavelengthNm 须在 [200,750] 且步长 1";
        }
        if (!onStep(intensity, 0, 100, 1)) {
            return "intensityPct 须在 [0,100] 且步长 1";
        }
        if (!onStep(voltage, -5, 5, 0.1)) {
            return "voltageV 须在 [-5,5] 且步长 0.1";
        }
        Object material = params.get("material");
        if (material == null || !PHI.containsKey(String.valueOf(material))) {
            return "material 须为 cs/k/na/ca/zn/cu/pt 之一";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double wave = asDouble(params.get("wavelengthNm"));
        double intensity = asDouble(params.get("intensityPct"));
        double voltage = asDouble(params.get("voltageV"));
        Double phiBoxed = PHI.get(String.valueOf(params.get("material")));
        double phi = phiBoxed == null ? 2.40 : phiBoxed;

        double energy = HC / wave;
        double kMax = Math.max(0, energy - phi);
        double uStop = kMax;
        double lambda0 = HC / phi;
        double isat = energy > phi ? intensity / 100.0 * ISAT_FULL : 0.0;
        double current;
        if (isat <= 0) {
            current = 0;
        } else if (voltage >= 0) {
            current = isat;
        } else {
            double vs = Math.max(uStop, 0.02);
            current = isat * Math.max(0, Math.min(1, 1 + voltage / vs));
        }

        Map<String, Double> out = new LinkedHashMap<>();
        out.put("photonEnergyEv", energy);
        out.put("workFunctionEv", phi);
        out.put("maxKineticEv", kMax);
        out.put("stopVoltageV", uStop);
        out.put("thresholdNm", lambda0);
        out.put("currentUa", current);
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
