package com.wky.backend.demo;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Bernoulli / Venturi tube demo adapter. */
@Component
public class VenturiExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES = Set.of("v1", "areaRatio", "fluid");

    @Override
    public String route() {
        return "bernoulli-venturi";
    }

    @Override
    public String capabilityPrompt() {
        return "实验：伯努利文丘里管（route=bernoulli-venturi）\n"
                + "可调参数（仅这些）：\n"
                + "- v1：入口流速 m/s，范围 [0, 5]，步长 0.1\n"
                + "- areaRatio：截面积比 A2/A1，范围 [0.2, 2.0]，步长 0.05\n"
                + "- fluid：流体，仅 water 或 glycerol\n"
                + "每步 focus 只能是：v1 | areaRatio | fluid（本步主要改动的控件，前端会高亮该控件）\n"
                + "理想模型：rho_water=1000，rho_glycerol=1260；"
                + "v2=v1/areaRatio；deltaP=0.5*rho*(v2^2-v1^2)\n"
                + "计划 steps 数必须在 3～6；附 summary 与四选一 quiz。\n"
                + "【讲稿要求——非常重要】这是「老师带学生做实验」的口播稿，不是参数日志：\n"
                + "- actionNarration：操作讲解，2～4 句口语中文，告诉学生要调哪个控件、调到多少、为什么先调它；"
                + "不要只写「把 v1 调到 2」。\n"
                + "- resultNarration：结果讲解，2～4 句，结合读数变化讲原理（连续性/伯努利/压差），"
                + "引导学生看测压管或 HUD 读数。\n"
                + "- summary：整段小结 3～5 句，回顾规律。\n"
                + "- overview：一句话点明本节要观察的现象。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"收缩管加速与压降\","
                + "\"overview\":\"通过改变截面积比，观察喉管流速升高和压强下降\","
                + "\"steps\":["
                + "{\"title\":\"建立等径基线\","
                + "\"params\":{\"v1\":2.0,\"areaRatio\":1.0,\"fluid\":\"water\"},"
                + "\"focus\":\"v1\","
                + "\"actionNarration\":\"我们先把入口流速调到 2.0 米每秒，面积比先保持 1，也就是等径管。"
                + "这样可以建立一个干净的对照：等径时出口流速应该接近入口流速，压差几乎为零。"
                + "请盯住左侧入口流速滑块，我会把它缓缓推到目标值。\","
                + "\"resultNarration\":\"看读数：v2 大约等于 v1，压差接近 0。"
                + "这说明在理想不可压缩流体里，截面不变则流速不变，伯努利方程两边动能项抵消，压强差也就消失了。"
                + "记住这个基线，下一步我们要故意制造收缩。\"},"
                + "{\"title\":\"收缩喉管\","
                + "\"params\":{\"v1\":2.0,\"areaRatio\":0.5,\"fluid\":\"water\"},"
                + "\"focus\":\"areaRatio\","
                + "\"actionNarration\":\"接下来只改截面积比，把 A2 比 A1 调到 0.5，相当于喉管变细一半，流速保持 2.0 不变。"
                + "连续方程告诉我们：截面积减半，流速必须加倍，才能让流量守恒。"
                + "请注意面积比滑块，同时观察右侧测压管液面。\","
                + "\"resultNarration\":\"现在 v2 约为 4.0，压差明显为正：喉管处压强降低。"
                + "从伯努利方程看，动能增大后静压下降，所以右管液面低于左管。"
                + "这就是文丘里管测流量、产生吸力的物理基础。\"},"
                + "{\"title\":\"换用更密的流体\","
                + "\"params\":{\"v1\":2.0,\"areaRatio\":0.5,\"fluid\":\"glycerol\"},"
                + "\"focus\":\"fluid\","
                + "\"actionNarration\":\"几何与流速都先不动，只把流体从水换成甘油。甘油密度大约 1260，比水更重。"
                + "压差公式里有密度因子，所以同样的速度差，压差会更大。"
                + "请看流体介质按钮，我们切换到甘油。\","
                + "\"resultNarration\":\"对比刚才的水：同样的 v1 与面积比，甘油的压差更大。"
                + "这说明 ΔP 正比于密度，也正比于速度平方差。"
                + "理想模型里我们忽略黏性，真实甘油更黏稠，但本实验只展示理想关系。\"}"
                + "],"
                + "\"summary\":\"回顾三步：等径时压差近零；收缩后流速升高、压强下降；密度越大，同样速度差带来的压差越大。"
                + "核心公式是连续方程 v2=v1/(A2/A1)，以及 ΔP=½ρ(v2²−v1²)。"
                + "以后看到文丘里喉管，就联想到「细处快、细处压低」。\","
                + "\"quiz\":{"
                + "\"question\":\"A2/A1 减半且其它条件不变时，理想情况下 v2 相对 v1 如何变化？\","
                + "\"options\":[\"A. 减半\",\"B. 加倍\",\"C. 不变\",\"D. 变为四倍\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"连续方程：v2=v1/(A2/A1)。比值减半则 v2 加倍。\""
                + "}"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double v1 = asDouble(params.get("v1"));
        Double areaRatio = asDouble(params.get("areaRatio"));
        String fluid = params.get("fluid") == null ? null : String.valueOf(params.get("fluid"));
        if (v1 == null) {
            return "缺少 v1";
        }
        if (areaRatio == null) {
            return "缺少 areaRatio";
        }
        if (fluid == null || (!fluid.equals("water") && !fluid.equals("glycerol"))) {
            return "fluid 必须是 water 或 glycerol";
        }
        if (!onStep(v1, 0, 5, 0.1)) {
            return "v1 须在 [0,5] 且步长 0.1";
        }
        if (!onStep(areaRatio, 0.2, 2.0, 0.05)) {
            return "areaRatio 须在 [0.2,2.0] 且步长 0.05";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double v1 = asDouble(params.get("v1"));
        double areaRatio = asDouble(params.get("areaRatio"));
        String fluid = String.valueOf(params.get("fluid"));
        double rho = "glycerol".equals(fluid) ? 1260.0 : 1000.0;
        double v2 = v1 / areaRatio;
        double deltaP = 0.5 * rho * (v2 * v2 - v1 * v1);
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("v1", v1);
        out.put("v2", v2);
        out.put("areaRatio", areaRatio);
        out.put("rho", rho);
        out.put("deltaP", deltaP);
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
