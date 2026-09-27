package com.wky.backend.demo;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Demo tools — only registered when chat context is a supported experiment page. */
@Component
@RequiredArgsConstructor
public class DemoAiTools {

    private final DemoPlanService demoPlanService;

    @Tool("为当前实验生成演示计划（仅生成并保存，不会自动播放）。"
            + "当用户在实验页请求演示、教程、带练、逐步讲解时调用。"
            + "goal 为用户想看的演示目标一句话，必须保持用户原话语言（英文请求用英文 goal，勿译成中文）。")
    public String createDemo(
            @P("演示目标（与用户同语言），例如：Show how denser fluid increases pressure difference")
            String goal) {
        DemoChatContext.Holder ctx = DemoChatContext.get();
        if (ctx == null || ctx.userId() == null || ctx.experimentId() == null) {
            return "缺少演示上下文（需在支持的实验页调用，且带 experimentId）。";
        }
        if (!StringUtils.hasText(goal)) {
            return "请提供演示目标 goal。";
        }
        return demoPlanService.createDemo(ctx.userId(), ctx.experimentId(), goal, null);
    }

    @Tool("查询用户演示剧本（单次调用内完成：模糊定位 → 拉取详情）。"
            + "用户问某次演示的内容、步骤、随堂题或答案时必须调用。"
            + "若已知 demoId（含用户消息里引用的演示）传 demoId；"
            + "否则传 query（标题/目标关键词），唯一命中会直接返回完整剧本（含题目与标准答案）；"
            + "多条命中则返回候选列表，再用 demoId 查一次。"
            + "query 与 demoId 都空时返回最近列表。")
    public String lookupDemo(
            @P(value = "演示 id；用户已引用或已知时优先传", required = false) Long demoId,
            @P(value = "标题/目标关键词；无 id 时用于模糊搜索", required = false) String query) {
        DemoChatContext.Holder ctx = DemoChatContext.get();
        if (ctx == null || ctx.userId() == null) {
            return "缺少用户上下文。";
        }
        return demoPlanService.lookupDemo(ctx.userId(), demoId, query, ctx.experimentId());
    }
}
