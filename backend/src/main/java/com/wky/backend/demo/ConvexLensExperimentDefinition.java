package com.wky.backend.demo;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

/** Convex lens imaging demo adapter. */
@Component
public class ConvexLensExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES = Set.of("uCm", "fCm");

    @Override
    public String route() {
        return "convex-lens";
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
        return "实验：凸透镜成像（route=convex-lens）\n"
                + "界面：左侧控制栏自上而下为焦距 f 滑块、物距 u 滑块、成像场景预设（照相机/等大/投影仪/放大镜）、显示光路开关。口播勿说从左到右。\n"
                + "可调参数（仅这些）：\n"
                + "- uCm：物距，单位 cm，范围 [3, 48]，步长 0.1\n"
                + "- fCm：焦距，单位 cm，范围 [6, 16]，步长 0.1\n"
                + "- showRays：显示光路开关，布尔值（可选，不影响成像结果）\n"
                + "理想模型（u、f、v 均以 cm 计）：像距 v=u*f/(u-f)；放大率 m=|v|/u；"
                + "u>f 成倒立实像（与物异侧，v>0）；u<f 成正立虚像（与物同侧，v<0）。\n"
                + "典型区间：u>2f 照相机（倒立缩小实像，f<v<2f）；u=2f 等大倒立实像（v=2f）；"
                + "f<u<2f 投影仪（倒立放大实像，v>2f）；u<f 放大镜（正立放大虚像）。"
                + "禁止把 uCm 与 fCm 设为相等（物体在焦点上不成像）。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus（uCm|fCm），前端会拧参动画并高亮控件；params 必须同时给出 uCm 与 fCm。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "uCm→物距/object distance，fCm→焦距/focal length；"
                + "读数 vCm→像距/image distance，magnification→放大率/magnification；"
                + "像的性质说「倒立缩小的实像」「正立放大的虚像」等。\n"
                + "narration：2～4 句教学口语；引导学生看光路（平行光线与过光心光线）或数据面板读数。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"凸透镜成像规律：从照相机到放大镜\","
                + "\"overview\":\"固定焦距为 10 厘米，让物体从二倍焦距外向透镜靠近，依次观察倒立缩小、等大、倒立放大的实像，最后进入一倍焦距以内看正立放大的虚像\","
                + "\"steps\":["
                + "{\"title\":\"建立照相机基线\","
                + "\"animate\":true,"
                + "\"params\":{\"uCm\":30,\"fCm\":10},"
                + "\"focus\":\"fCm\","
                + "\"narration\":\"我们先设定场景：焦距调到 10 厘米，物距调到 30 厘米，也就是焦距的 3 倍。"
                + "物体位于二倍焦距以外，这正是照相机的成像情形。"
                + "请盯住控制栏里的焦距滑块，我会把参数缓缓推到目标值。\"},"
                + "{\"title\":\"读照相机情形的像\","
                + "\"animate\":false,"
                + "\"narration\":\"看数据面板：像距是 15 厘米，落在一倍焦距与二倍焦距之间；放大率是 0.5，"
                + "所以像是倒立、缩小的实像，而且与物体分别在透镜两侧。"
                + "远处景物在相机底片上就是这样成小像的。\"},"
                + "{\"title\":\"移到二倍焦距处\","
                + "\"animate\":true,"
                + "\"params\":{\"uCm\":20,\"fCm\":10},"
                + "\"focus\":\"uCm\","
                + "\"narration\":\"接下来把物距减到 20 厘米，正好等于二倍焦距。请盯住物距滑块。"
                + "二倍焦距是放大与缩小的分界点：这一步的像应该刚好与物体等大，但仍然倒立、仍然是实像。\"},"
                + "{\"title\":\"进入投影仪区间\","
                + "\"animate\":true,"
                + "\"params\":{\"uCm\":15,\"fCm\":10},"
                + "\"focus\":\"uCm\","
                + "\"narration\":\"继续把物距推到 15 厘米，进入一倍到二倍焦距之间。投影仪用的就是这个区间："
                + "像不仅倒立，还会比物体更大，像距也超过了二倍焦距。请继续盯住物距滑块。\"},"
                + "{\"title\":\"对比物近像远像变大\","
                + "\"animate\":false,"
                + "\"narration\":\"对比这三次读数：物距从 30 厘米减到 20 再到 15 厘米，"
                + "像距依次是 15、20、30 厘米，放大率从 0.5 升到 1 再到 2。"
                + "规律很清楚：物体越靠近透镜，像就离得越远，也变得越大。\"},"
                + "{\"title\":\"进入一倍焦距以内\","
                + "\"animate\":true,"
                + "\"params\":{\"uCm\":7,\"fCm\":10},"
                + "\"focus\":\"uCm\","
                + "\"narration\":\"最后把物距减到 7 厘米，让物体进入一倍焦距以内。"
                + "注意光路里新出现的紫色虚线，那是出射光线的反向延长线。"
                + "此时的像与刚才完全不同：它是正立的、放大的，而且与物体在透镜的同一侧。\"},"
                + "{\"title\":\"认识虚像\","
                + "\"animate\":false,"
                + "\"narration\":\"看数据面板：像距是负值，说明像与物同侧，这就是虚像——"
                + "它不能被光屏承接，只能透过透镜用眼睛看到，放大镜就是这样把近处小字放大的。"
                + "最后记住口诀：一倍焦距分虚实，二倍焦距分大小，物近像远像变大。\"}"
                + "],"
                + "\"summary\":\"回顾：物距大于二倍焦距成倒立缩小的实像（照相机）；等于二倍焦距成倒立等大的实像；"
                + "一倍到二倍焦距之间成倒立放大的实像（投影仪）；小于一倍焦距成正立放大的虚像（放大镜，与物同侧、光屏接不到）。"
                + "口诀：一倍焦距分虚实，二倍焦距分大小，物近像远像变大。\","
                + "\"quizzes\":["
                + "{\"question\":\"物体位于凸透镜二倍焦距以外时，所成的像是哪种？\","
                + "\"options\":[\"A. 正立、缩小的虚像\",\"B. 倒立、缩小的实像\",\"C. 倒立、放大的实像\",\"D. 正立、等大的实像\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"u>2f 时成倒立、缩小的实像，像距在一倍与二倍焦距之间，这是照相机的原理。\"},"
                + "{\"question\":\"成实像时保持焦距不变，把物体向透镜靠近，像距和像的大小如何变化？\","
                + "\"options\":[\"A. 像距变小、像变小\",\"B. 像距变小、像变大\",\"C. 像距变大、像变大\",\"D. 像距变大、像变小\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"成实像时遵循「物近像远像变大」：物体靠近透镜，像距增大、像也变大。\"},"
                + "{\"question\":\"物距小于一倍焦距时，凸透镜成的像是？\","
                + "\"options\":[\"A. 倒立、放大的实像\",\"B. 正立、放大的虚像\",\"C. 倒立、缩小的实像\",\"D. 不成像\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"u<f 时成正立、放大的虚像，像与物同侧，不能用光屏承接，这是放大镜的原理。\"}"
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double uCm = asDouble(params.get("uCm"));
        Double fCm = asDouble(params.get("fCm"));
        if (uCm == null) {
            return "缺少 uCm";
        }
        if (fCm == null) {
            return "缺少 fCm";
        }
        if (!onStep(uCm, 3, 48, 0.1)) {
            return "uCm 须在 [3,48] 且步长 0.1";
        }
        if (!onStep(fCm, 6, 16, 0.1)) {
            return "fCm 须在 [6,16] 且步长 0.1";
        }
        if (Math.abs(uCm - fCm) < 1e-9) {
            return "uCm 不能等于 fCm（物体在焦点上不成像）";
        }
        if (params.get("showRays") != null && asBoolean(params.get("showRays")) == null) {
            return "showRays 须为布尔值";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double u = asDouble(params.get("uCm"));
        double f = asDouble(params.get("fCm"));
        double v = u * f / (u - f);
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("uCm", u);
        out.put("fCm", f);
        out.put("vCm", v);
        out.put("magnification", Math.abs(v) / u);
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
