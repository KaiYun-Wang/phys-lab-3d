package com.wky.backend.demo;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Special relativity demo adapter. */
@Component
public class SpecialRelativityExperimentDefinition implements ExperimentDefinition {

    private static final Set<String> FOCUSES = Set.of("velocity");

    @Override
    public String route() {
        return "special-relativity";
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
        return "实验：狭义相对论实验室（route=special-relativity）\n"
                + "界面：左侧控制栏主要是飞船速度滑块（自上而下）。口播勿说从左到右。\n"
                + "可调参数（仅一个）：\n"
                + "- velocity：飞船速度，单位为光速 c（v/c），范围 [0, 0.995]，步长 0.001；0.9 表示 0.9 倍光速\n"
                + "理想模型（光速归一为 1）：gamma=1/sqrt(1-velocity^2)；"
                + "lengthPercent=100/gamma（收缩后剩余长度百分比）；"
                + "relativisticMass=gamma（相对论质量是静质量的 gamma 倍）；"
                + "clockPeriod=2*gamma（飞船钟走一格对应的地球时间）\n"
                + "计划 steps 数必须在 4～8；附 summary 与 quizzes（1～5 道四选一，按知识点自定题量）。\n"
                + "每步字段：title、narration、animate（布尔）。\n"
                + "animate=true：须给 params 与 focus（仅 velocity），前端会拧参动画并高亮飞船速度滑块。\n"
                + "animate=false：只口播，不要 params/focus（或可省略）。\n"
                + "参数可读名（口播对照，勿把键名直接念出）：velocity→飞船速度/ship speed（按倍率念，如 0.9 倍光速）；"
                + "读数 gamma→洛伦兹因子/Lorentz factor，lengthPercent→剩余长度百分比，"
                + "relativisticMass→相对论质量倍数，clockPeriod→飞船时钟周期。\n"
                + "narration：2～4 句教学口语；引导学生看飞船长度收缩、船上时钟快慢与读数面板。\n";
    }

    @Override
    public String samplePlanJson() {
        return "{"
                + "\"title\":\"飞船逼近光速：三重相对论效应\","
                + "\"overview\":\"从静止出发，把飞船速度依次调到 0.5 倍光速与 0.9 倍光速，观察长度收缩、时钟变慢与质量增大的联动变化\","
                + "\"steps\":["
                + "{\"title\":\"建立静止基线\","
                + "\"animate\":true,"
                + "\"params\":{\"velocity\":0},"
                + "\"focus\":\"velocity\","
                + "\"narration\":\"我们先让飞船保持静止，把飞船速度设为 0。"
                + "此时洛伦兹因子等于 1，长度、时间与质量都没有任何变化。"
                + "请盯住控制栏里的飞船速度滑块，我会先把它停在 0，建立一个干净的对照基线。\"},"
                + "{\"title\":\"读静止读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数面板：洛伦兹因子是 1，剩余长度是 100%，相对论质量倍数也是 1，"
                + "飞船上的钟和地球上的钟走得一样快。"
                + "这就是之后的对照标准：速度为零时，所有相对论效应都消失。\"},"
                + "{\"title\":\"加速到 0.5 倍光速\","
                + "\"animate\":true,"
                + "\"params\":{\"velocity\":0.5},"
                + "\"focus\":\"velocity\","
                + "\"narration\":\"现在把飞船速度推到光速的一半，也就是 0.5 倍光速。"
                + "请留意滑块缓缓右移，同时观察场景里的飞船和座舱时钟。"
                + "速度不算高时，洛伦兹因子只有大约 1.15，效应已经出现，但还很温和。\"},"
                + "{\"title\":\"读 0.5 倍光速读数\","
                + "\"animate\":false,"
                + "\"narration\":\"看读数：洛伦兹因子约 1.15，剩余长度约 87%，"
                + "飞船沿运动方向缩短了一成多；飞船上的钟比地球钟慢，质量也增大约 15%。"
                + "请记住这几个数字之间的联动关系。\"},"
                + "{\"title\":\"加速到 0.9 倍光速\","
                + "\"animate\":true,"
                + "\"params\":{\"velocity\":0.9},"
                + "\"focus\":\"velocity\","
                + "\"narration\":\"继续加速，把飞船速度推到 0.9 倍光速。"
                + "请继续盯住速度滑块和飞船：长度收缩变得明显，洛伦兹因子会跳到大约 2.29，"
                + "效应开始强烈起来。\"},"
                + "{\"title\":\"对比 0.9 倍光速读数\","
                + "\"animate\":false,"
                + "\"narration\":\"现在洛伦兹因子约 2.29：飞船长度只剩原长的约 44%，"
                + "飞船上的钟走得比地球慢一倍以上，相对论质量增加到两倍多。"
                + "速度越接近光速，同样的速度增量带来的效应越大，这就是相对论最反直觉的地方。\"}"
                + "],"
                + "\"summary\":\"回顾：静止时洛伦兹因子为 1，一切正常；速度升到 0.5 倍光速时效应温和；"
                + "0.9 倍光速时长度收缩到四成多、时钟明显变慢、质量翻倍。"
                + "核心关系是：洛伦兹因子随速度增大而急剧增大，长度按它的倒数收缩，时间按它放大，质量按它倍增；"
                + "速度无限接近光速时这些效应趋于无穷，所以有静质量的物体无法达到光速。\","
                + "\"quizzes\":["
                + "{\"question\":\"飞船速度从 0.5 倍光速提高到 0.9 倍光速时，洛伦兹因子会怎样变化？\","
                + "\"options\":[\"A. 保持不变\",\"B. 变小\",\"C. 变大\",\"D. 先变大后变小\"],"
                + "\"answerIndex\":2,"
                + "\"explanation\":\"洛伦兹因子随速度增大而增大，且越接近光速增长越快。\"},"
                + "{\"question\":\"飞船相对地球高速飞行时，飞船沿运动方向的长度与飞船上的时钟分别如何变化？\","
                + "\"options\":[\"A. 长度伸长，时钟变快\",\"B. 长度收缩，时钟变慢\",\"C. 长度与时钟都不变\",\"D. 长度收缩，时钟变快\"],"
                + "\"answerIndex\":1,"
                + "\"explanation\":\"长度沿运动方向按洛伦兹因子的倒数收缩；飞船上的时钟比地球钟走得慢，即时间膨胀。\"},"
                + "{\"question\":\"当飞船速度无限接近光速时，洛伦兹因子的变化趋势是？\","
                + "\"options\":[\"A. 趋近于 1\",\"B. 趋近于 0\",\"C. 增长但不超过 2\",\"D. 趋于无穷大\"],"
                + "\"answerIndex\":3,"
                + "\"explanation\":\"速度趋近光速时洛伦兹因子趋于无穷大，这正是有静质量的物体无法达到光速的原因。\"}"
                + "]"
                + "}";
    }

    @Override
    public String validateParams(Map<String, Object> params) {
        if (params == null) {
            return "params 缺失";
        }
        Double velocity = asDouble(params.get("velocity"));
        if (velocity == null) {
            return "缺少 velocity";
        }
        if (!onStep(velocity, 0, 0.995, 0.001)) {
            return "velocity 须在 [0,0.995] 且步长 0.001";
        }
        return null;
    }

    @Override
    public Map<String, Double> idealReadings(Map<String, Object> params) {
        double velocity = asDouble(params.get("velocity"));
        double gamma = 1.0 / Math.sqrt(1.0 - velocity * velocity);
        Map<String, Double> out = new LinkedHashMap<>();
        out.put("velocity", velocity);
        out.put("gamma", gamma);
        out.put("lengthPercent", 100.0 / gamma);
        out.put("relativisticMass", gamma);
        out.put("clockPeriod", 2 * gamma);
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
