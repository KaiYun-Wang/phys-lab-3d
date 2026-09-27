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
            + "goal 为用户想看的演示目标一句话。")
    public String createDemo(
            @P("演示目标，例如：展示收缩管如何增大流速并降低压强") String goal) {
        DemoChatContext.Holder ctx = DemoChatContext.get();
        if (ctx == null || ctx.userId() == null || ctx.experimentId() == null) {
            return "缺少演示上下文（需在支持的实验页调用，且带 experimentId）。";
        }
        if (!StringUtils.hasText(goal)) {
            return "请提供演示目标 goal。";
        }
        return demoPlanService.createDemo(
                ctx.userId(), ctx.experimentId(), goal, ctx.paramSnapshot());
    }

    @Tool("查询当前用户的演示记录（只读）。"
            + "可传 demoId 查看详情；不传则返回最近演示列表。")
    public String lookupDemo(
            @P(value = "演示 id；留空则列出最近演示", required = false) Long demoId) {
        DemoChatContext.Holder ctx = DemoChatContext.get();
        if (ctx == null || ctx.userId() == null) {
            return "缺少用户上下文。";
        }
        return demoPlanService.lookupDemo(ctx.userId(), demoId, ctx.experimentId());
    }
}
