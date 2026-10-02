package com.wky.backend.demo;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Schwarzschild black hole / general relativity demo adapter. */
@Component
public class GeneralRelativityExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES = Set.of(
            "blackHoleMass", "particleLaunchRadius", "particleTangentialVelocity",
            "particleRadialVelocity", "photonImpactParam");

    private static final Set<String> ACTIONS = Set.of("launchParticle", "launchPhoton");

    @Override
    public String route() {
        return "general-relativity";
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
        return "实验：广义相对论 · 史瓦西黑洞（route=general-relativity）\n"
                + "界面：左侧控制栏自上而下依次为黑洞质量、粒子发射距离/切向速度/径向速度与「发射粒子」、"
                + "光子碰撞参数与「发射光子」、显示图层。口播勿说从左到右。\n"
                + "可调参数（仅这些）：\n"
                + "- blackHoleMass：黑洞质量 M，范围 [2, 12]，步长 0.5\n"
                + "- particleLaunchRadius：粒子发射距离 r，范围 [ceil(1.08*2M), 80]，步长 1；下限随质量变化\n"
                + "- particleTangentialVelocity：粒子切向速度（以光速为单位），范围 [0.05, 1.0]，步长 0.01\n"
                + "- particleRadialVelocity：粒子径向速度，负值向内，范围 [-0.3, 0.3]，步长 0.01\n"
                + "- photonImpactParam：光子碰撞参数 b，范围 [8, 50]，步长 1\n"
                + "一次性动作（写在 segments[].action，勿只口播让用户手点）：\n"
                + "- launchParticle：发射测试粒子\n"
                + "- launchPhoton：发射光子\n"
                + "理想模型（G=c=1）：视界半径 rs = 2 * blackHoleMass；ISCO = 3 * rs；光子球 = 1.5 * rs；"
                + "圆轨道速度 = sqrt(rs / (2*(r - 2*rs)))；切向逃逸速度 = sqrt(rs / (r - rs))；"
                + "轨道能量 E = sqrt((1 - rs/r)*(1 + vt^2) + vr^2)；"
                + "轨道分类：vt 接近圆轨道速度且 vr 接近 0 → 圆轨道；E < 1 且 r < 3rs → 坠入视界；"
                + "E < 1 → 束缚轨道；否则逃逸轨道；"
                + "引力红移 z = 1/sqrt(1 - rs/r) - 1；光子偏折角（弧度）≈ 2*rs / b。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一）。\n"
                + "每步：title、animate；口播用 segments[]（有 segments 时不要再写步骤级 narration）。\n"
                + "segments 每项含 narration；可选 action（launchParticle|launchPhoton）。"
                + "前端字幕整步展示；音频与 action 按段顺序执行。"
                + "有 action 时先触发再口播该段；纯口播段禁止连续（请合并）；动作+口播可以连续。\n"
                + "animate=true：须给 params 与 focus"
                + "（blackHoleMass|particleLaunchRadius|particleTangentialVelocity|particleRadialVelocity|photonImpactParam），"
                + "params 必须给出全部五个键；可先拧参，再在同一步 segments 里发射。\n"
                + "animate=false：不要 params/focus。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "blackHoleMass→黑洞质量/black hole mass，particleLaunchRadius→发射距离/launch radius，"
                + "particleTangentialVelocity→切向速度/tangential velocity，"
                + "particleRadialVelocity→径向速度/radial velocity，"
                + "photonImpactParam→碰撞参数/impact parameter。\n"
                + "引导学生看轨道类型、能量、红移与偏折角读数。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"坠入、逃逸与引力透镜\","
                + "\"overview\":\"从质量基线出发，把发射距离移入 ISCO 后自动发射粒子看坠落，提高切向速度再发射看逃逸，最后减小碰撞参数并发射光子看偏折\","
                + "\"steps\":["
                + "{\"title\":\"建立质量基线\","
                + "\"animate\":true,"
                + "\"params\":{\"blackHoleMass\":5,\"particleLaunchRadius\":40,"
                + "\"particleTangentialVelocity\":0.5,\"particleRadialVelocity\":0,\"photonImpactParam\":25},"
                + "\"focus\":\"blackHoleMass\","
                + "\"segments\":["
                + "{\"narration\":\"这是史瓦西黑洞的时空模型：蓝色网格是弯曲的时空，中心黑球是事件视界。"
                + "黑洞质量决定几何尺度——质量 5 时，视界半径是 10，最内稳定圆轨道在 30，光子球在 15。"
                + "请盯住控制栏里的质量滑块，先建立这个参考配置。\"}"
                + "]},"
                + "{\"title\":\"移入最内稳定圆轨道以内并发射\","
                + "\"animate\":true,"
                + "\"params\":{\"blackHoleMass\":5,\"particleLaunchRadius\":25,"
                + "\"particleTangentialVelocity\":0.5,\"particleRadialVelocity\":0,\"photonImpactParam\":25},"
                + "\"focus\":\"particleLaunchRadius\","
                + "\"segments\":["
                + "{\"narration\":\"现在把发射距离从 40 拉近到 25。25 已经小于最内稳定圆轨道 30，这里的轨道不再稳定。"
                + "请盯住控制栏里的距离滑块，同时观察左上角的轨道类型读数。\"},"
                + "{\"action\":\"launchParticle\","
                + "\"narration\":\"读数显示坠入视界，能量约 0.87。我这就自动发射一颗测试粒子，请盯住屏幕上的坠落轨迹。\"}"
                + "]},"
                + "{\"title\":\"提高切向速度再发射\","
                + "\"animate\":true,"
                + "\"params\":{\"blackHoleMass\":5,\"particleLaunchRadius\":40,"
                + "\"particleTangentialVelocity\":0.7,\"particleRadialVelocity\":0,\"photonImpactParam\":25},"
                + "\"focus\":\"particleTangentialVelocity\","
                + "\"segments\":["
                + "{\"narration\":\"先把发射距离放回 40，再把切向速度从 0.5 提高到 0.7。"
                + "请盯住控制栏里的切向速度滑块，看轨道类型如何变化。\"},"
                + "{\"action\":\"launchParticle\","
                + "\"narration\":\"能量升到约 1.06，超过逃逸阈值。再自动发射一颗粒子，对比刚才的坠落轨迹：这次会一去不返。\"}"
                + "]},"
                + "{\"title\":\"减小碰撞参数看引力透镜\","
                + "\"animate\":true,"
                + "\"params\":{\"blackHoleMass\":5,\"particleLaunchRadius\":40,"
                + "\"particleTangentialVelocity\":0.7,\"particleRadialVelocity\":0,\"photonImpactParam\":15},"
                + "\"focus\":\"photonImpactParam\","
                + "\"segments\":["
                + "{\"narration\":\"最后看光子：把碰撞参数从 25 减小到 15，让光线更贴近黑洞掠过。"
                + "请盯住碰撞参数滑块，并留意偏折角读数。\"},"
                + "{\"action\":\"launchPhoton\","
                + "\"narration\":\"参数到位，自动发射光子。偏折角会明显变大：光贴得越近，拐弯越厉害，这就是引力透镜。\"}"
                + "]},"
                + "{\"title\":\"收束全场\","
                + "\"animate\":false,"
                + "\"segments\":["
                + "{\"narration\":\"回顾全场：质量决定视界与轨道的尺度；切向速度决定粒子被束缚还是逃逸；"
                + "光线即使没有质量，也会被弯曲的时空偏折。\"}"
                + "]}"
                + "],"
                + "\"summary\":\"回顾：黑洞的几何尺度由质量唯一决定——视界半径是 2 倍质量，最内稳定圆轨道在 3 倍视界半径处。"
                + "粒子的切向速度决定命运：在 ISCO 之内且速度不足会坠入视界；超过逃逸速度则一去不返。"
                + "光子没有质量，但在弯曲时空中同样被偏折，碰撞参数越小偏折越大，这就是引力透镜。\","
                + "\"quizzes\":["
                + "{\"question\":\"质量 5 的黑洞、ISCO 半径为 30，在距离 25 处有质量的粒子能维持稳定圆轨道吗？\","
                + "\"options\":[\"A. 能，只要速度合适\",\"B. 不能，会螺旋坠入视界\","
                + "\"C. 只能维持一圈\",\"D. 取决于粒子质量\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"ISCO 之内不存在稳定的圆轨道，有质量粒子的轨道会不稳定并坠入视界。\"},"
                + "{\"question\":\"在距离 40 处把切向速度从圆轨道速度 0.5 提高到 0.7，轨道如何变化？\","
                + "\"options\":[\"A. 变成坠入轨道\",\"B. 变成逃逸轨道\",\"C. 仍为圆轨道\",\"D. 轨道不变\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"切向速度超过逃逸速度后轨道能量大于 1，轨道从束缚变为逃逸。\"},"
                + "{\"question\":\"减小光子的碰撞参数，让光更贴近黑洞时，偏折角如何变化？\","
                + "\"options\":[\"A. 变小\",\"B. 不变\",\"C. 变大\",\"D. 先变大后变小\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"碰撞参数越小光越靠近黑洞，时空弯曲造成的偏折越大，这就是引力透镜效应。\"}"
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double blackHoleMass = asDouble(params.get("blackHoleMass"));
        Double particleLaunchRadius = asDouble(params.get("particleLaunchRadius"));
        Double particleTangentialVelocity = asDouble(params.get("particleTangentialVelocity"));
        Double particleRadialVelocity = asDouble(params.get("particleRadialVelocity"));
        Double photonImpactParam = asDouble(params.get("photonImpactParam"));
        if (blackHoleMass == null) {
            return "缺少 blackHoleMass";
        }
        if (particleLaunchRadius == null) {
            return "缺少 particleLaunchRadius";
        }
        if (particleTangentialVelocity == null) {
            return "缺少 particleTangentialVelocity";
        }
        if (particleRadialVelocity == null) {
            return "缺少 particleRadialVelocity";
        }
        if (photonImpactParam == null) {
            return "缺少 photonImpactParam";
        }
        if (!onStep(blackHoleMass, 2, 12, 0.5)) {
            return "blackHoleMass 须在 [2,12] 且步长 0.5";
        }
        double minR = Math.ceil(2 * blackHoleMass * 1.08);
        if (!onStep(particleLaunchRadius, minR, 80, 1)) {
            return "particleLaunchRadius 须在 [" + (long) minR + ",80] 且步长 1";
        }
        if (!onStep(particleTangentialVelocity, 0.05, 1.0, 0.01)) {
            return "particleTangentialVelocity 须在 [0.05,1.0] 且步长 0.01";
        }
        if (!onStep(particleRadialVelocity, -0.3, 0.3, 0.01)) {
            return "particleRadialVelocity 须在 [-0.3,0.3] 且步长 0.01";
        }
        if (!onStep(photonImpactParam, 8, 50, 1)) {
            return "photonImpactParam 须在 [8,50] 且步长 1";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double blackHoleMass = asDouble(params.get("blackHoleMass"));
        double r = asDouble(params.get("particleLaunchRadius"));
        double vt = asDouble(params.get("particleTangentialVelocity"));
        double vr = asDouble(params.get("particleRadialVelocity"));
        double b = asDouble(params.get("photonImpactParam"));
        double rs = 2 * blackHoleMass;
        double f = 1 - rs / r;
        double energy = Math.sqrt(Math.max(0, f * (1 + vt * vt) + vr * vr));
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("rs", rs);
        out.put("rOverRs", r / rs);
        out.put("energy", energy);
        out.put("isco", 3 * rs);
        out.put("photonSphere", 1.5 * rs);
        out.put("redshift", 1 / Math.sqrt(1 - rs / r) - 1);
        out.put("deflectionAngle", b <= rs ? Math.PI : 2 * rs / b);
        if (r > 2 * rs) {
            out.put("circularVelocity", Math.sqrt(rs / (2 * (r - 2 * rs))));
        }
        out.put("escapeVelocity", Math.sqrt(rs / (r - rs)));
        return out;
    }

    @Override
    public Set<String> allowedFocuses() {
        return FOCUSES;
    }

    @Override
    public Set<String> allowedActions() {
        return ACTIONS;
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
