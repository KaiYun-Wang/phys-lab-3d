package com.wky.backend.demo;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Transverse / longitudinal wave demo adapter. */
@Component
public class WaveMechanicsExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES =
            Set.of("frequency", "amplitude", "wavelength", "viewMode");

    private static final Set<String> VIEW_MODES =
            Set.of("compare", "transverse", "longitudinal", "overlay");

    @Override
    public String route() {
        return "wave-mechanics";
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
        return "实验：横波与纵波对比（route=wave-mechanics）\n"
                + "界面：左侧控制栏自上而下为频率、振幅、波长与视图模式按钮。口播勿说从左到右。\n"
                + "可调参数（仅这些）：\n"
                + "- frequency：频率 f，单位 Hz，范围 [0.5, 4]，步长 0.1\n"
                + "- amplitude：振幅 A，范围 [0.2, 2]，步长 0.1\n"
                + "- wavelength：波长 λ，单位 m，范围 [2, 8]，步长 0.25\n"
                + "- viewMode：视图模式，仅 compare（左右对比）| transverse（只显示横波）| "
                + "longitudinal（只显示纵波）| overlay（叠加）\n"
                + "理想模型：波速 v = frequency * wavelength；波数 k = 2π / wavelength；"
                + "角频率 ω = 2π * frequency；横波位移极值约 ±振幅。\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus（frequency|amplitude|wavelength|viewMode），"
                + "前端会拧参动画并高亮控件；params 必须给出全部四个键。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）："
                + "frequency→频率/frequency，amplitude→振幅/amplitude，wavelength→波长/wavelength，"
                + "viewMode→视图模式/view mode（说「对比视图」「横波视图」「纵波视图」）。\n"
                + "narration：2～4 句教学口语；引导学生看两侧质点振动方式与读数面板（波速、波数、角频率）。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"横波纵波并排：频率波长如何改变波\","
                + "\"overview\":\"先建立对比基线，再分别提高频率、拉长波长看波速变化，最后切单视图观察两种波的振动方式\"," 
                + "\"steps\":["
                + "{\"title\":\"对比基线\","
                + "\"animate\":true,"
                + "\"params\":{\"frequency\":2,\"amplitude\":1,\"wavelength\":4,\"viewMode\":\"compare\"},"
                + "\"focus\":\"viewMode\","
                + "\"narration\":\"这个实验把横波和纵波并排放在一起对比。左边是横波：质点上下振动，振动方向垂直于波的传播方向；"
                + "右边是纵波：质点沿传播方向来回挤压，形成疏密相间的区域。"
                + "先把视图切回对比模式，两边用同样的参数出发，方便逐项比较。请盯住视图模式按钮。\"}," 
                + "{\"title\":\"提高频率\","
                + "\"animate\":true,"
                + "\"params\":{\"frequency\":3.5,\"amplitude\":1,\"wavelength\":4,\"viewMode\":\"compare\"},"
                + "\"focus\":\"frequency\","
                + "\"narration\":\"先改变频率：把频率从 2 赫兹提到 3.5 赫兹。"
                + "请盯住频率滑块，并观察两侧粒子振动的快慢。频率越高，质点振动越急促，波峰一个接一个地涌来。"
                + "注意波长暂时没变，所以波速会随之变快。\"}," 
                + "{\"title\":\"读频率变化的读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数：频率升到 3.5 赫兹，波速从 8 米每秒涨到了 14 米每秒，"
                + "因为波速等于频率乘波长。横波的位移极值仍是正负 1 米，振幅没有变。"
                + "频率只影响振动的快慢，不影响振动的幅度。\"}," 
                + "{\"title\":\"拉长波长\","
                + "\"animate\":true,"
                + "\"params\":{\"frequency\":3.5,\"amplitude\":1,\"wavelength\":8,\"viewMode\":\"compare\"},"
                + "\"focus\":\"wavelength\","
                + "\"narration\":\"接着改变波长：把波长从 4 米拉长到 8 米，频率保持 3.5 赫兹不变。"
                + "请看两侧场景：相邻波峰之间的距离明显拉开了，波形变得舒展。"
                + "波长和频率一起决定波速，这次波速会继续升高。\"}," 
                + "{\"title\":\"读波长变化的读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数：波长 8 米，波速升到了 28 米每秒，正好是刚才的两倍。"
                + "波长翻倍，波数减半；角频率只跟频率有关，保持不变。"
                + "三个量的关系很清晰：波速等于频率乘波长。\"}," 
                + "{\"title\":\"放大看横波\","
                + "\"animate\":true,"
                + "\"params\":{\"frequency\":3.5,\"amplitude\":1,\"wavelength\":8,\"viewMode\":\"transverse\"},"
                + "\"focus\":\"viewMode\","
                + "\"narration\":\"把视图切到横波单视图，凑近观察细节。"
                + "质点只在原地上下振动，并不随波前进；向前传播的是振动的相位，也就是波形的谷和峰。"
                + "这正是横波的关键特征：振动方向垂直、波形向前跑。\"}," 
                + "{\"title\":\"放大看纵波\","
                + "\"animate\":true,"
                + "\"params\":{\"frequency\":3.5,\"amplitude\":1,\"wavelength\":8,\"viewMode\":\"longitudinal\"},"
                + "\"focus\":\"viewMode\","
                + "\"narration\":\"再切到纵波单视图。纵波的质点沿传播方向振动，原地挤压又疏开，形成密度高低起伏的疏密区。"
                + "没有横向位移，但同样的频率、波长与波速关系依然成立。"
                + "两种波外观差别很大，底层规律却是同一套。\"}" 
                + "],"
                + "\"summary\":\"回顾：横波质点垂直振动、纵波质点沿传播方向振动，但两者都遵守同一套波动规律。"
                + "波速等于频率乘波长：频率升高波峰更密集地涌来，波长拉长波形更舒展，两者都会让波速增大。"
                + "波数只与波长有关，角频率只与频率有关；振幅决定振动幅度，不影响波速。\"," 
                + "\"quizzes\":["
                + "{\"question\":\"横波与纵波的本质区别是什么？\","
                + "\"options\":[\"A. 质点的振动方向与传播方向的关系\",\"B. 传播速度的快慢\","
                + "\"C. 能否携带能量\",\"D. 频率的计量方式\"],"
                + "\"answerIndex\":0,"
                + "\"explanation\":\"横波质点振动方向垂直于传播方向，纵波质点沿传播方向振动，这是两者的本质区别。\"}," 
                + "{\"question\":\"频率从 2 赫兹提高到 3.5 赫兹、波长保持 4 米不变，波速如何变化？\","
                + "\"options\":[\"A. 从 8 米每秒升到 14 米每秒\",\"B. 保持 8 米每秒\","
                + "\"C. 从 8 米每秒降到 4.5 米每秒\",\"D. 变为原来的 4 倍\"],"
                + "\"answerIndex\":0,"
                + "\"explanation\":\"波速等于频率乘波长，波长不变时波速与频率成正比。\"}," 
                + "{\"question\":\"若波速是 28 米每秒、频率是 3.5 赫兹，波长是多少？\","
                + "\"options\":[\"A. 2 米\",\"B. 4 米\",\"C. 8 米\",\"D. 10 米\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"波长等于波速除以频率：28 除以 3.5 等于 8 米。\"}" 
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double frequency = asDouble(params.get("frequency"));
        Double amplitude = asDouble(params.get("amplitude"));
        Double wavelength = asDouble(params.get("wavelength"));
        String viewMode = params.get("viewMode") == null ? null : String.valueOf(params.get("viewMode"));
        if (frequency == null) {
            return "缺少 frequency";
        }
        if (amplitude == null) {
            return "缺少 amplitude";
        }
        if (wavelength == null) {
            return "缺少 wavelength";
        }
        if (viewMode == null || !VIEW_MODES.contains(viewMode)) {
            return "viewMode 必须是 compare|transverse|longitudinal|overlay";
        }
        if (!onStep(frequency, 0.5, 4, 0.1)) {
            return "frequency 须在 [0.5,4] 且步长 0.1";
        }
        if (!onStep(amplitude, 0.2, 2, 0.1)) {
            return "amplitude 须在 [0.2,2] 且步长 0.1";
        }
        if (!onStep(wavelength, 2, 8, 0.25)) {
            return "wavelength 须在 [2,8] 且步长 0.25";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double frequency = asDouble(params.get("frequency"));
        double amplitude = asDouble(params.get("amplitude"));
        double wavelength = asDouble(params.get("wavelength"));
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("frequency", frequency);
        out.put("amplitude", amplitude);
        out.put("wavelength", wavelength);
        out.put("waveSpeed", frequency * wavelength);
        out.put("k", 2 * Math.PI / wavelength);
        out.put("omega", 2 * Math.PI * frequency);
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
