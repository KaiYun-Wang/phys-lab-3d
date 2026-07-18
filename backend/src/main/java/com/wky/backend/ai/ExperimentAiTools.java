package com.wky.backend.ai;

import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.service.IExperimentService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

/** AI 可调用的实验查询工具（读库，不写死在提示词里）。 */
@Component
@RequiredArgsConstructor
public class ExperimentAiTools {

    private final IExperimentService experimentService;

    @Tool("查询 PhysLab 平台已发布实验的基础信息（id、标题、route、学科、简介、topics）。"
            + "当用户问平台有哪些实验、某实验简介/入口，或需要核对实验是否存在时，必须先调用本工具；"
            + "不要凭记忆编造平台实验列表。")
    public String listPublishedExperiments(
            @P(value = "可选关键词，按标题或简介模糊筛选；留空则返回全部已发布实验", required = false)
            String keyword) {
        String q = StringUtils.hasText(keyword) ? keyword.trim() : null;
        List<ExperimentResponse> list = experimentService.listPublished(q, null);
        if (list.isEmpty()) {
            return q == null ? "当前无已发布实验。" : "未找到与「" + q + "」相关的已发布实验。";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("共 ").append(list.size()).append(" 个已发布实验：\n");
        for (ExperimentResponse e : list) {
            sb.append("- id=").append(e.getId())
                    .append(", title=").append(nullToEmpty(e.getTitle()))
                    .append(", route=").append(nullToEmpty(e.getRoute()));
            if (StringUtils.hasText(e.getSubjectTypeLabel())) {
                sb.append(", subject=").append(e.getSubjectTypeLabel());
            } else if (StringUtils.hasText(e.getSubjectType())) {
                sb.append(", subject=").append(e.getSubjectType());
            }
            if (e.getTopics() != null && !e.getTopics().isEmpty()) {
                sb.append(", topics=").append(String.join("/", e.getTopics()));
            }
            if (StringUtils.hasText(e.getDescription())) {
                sb.append(", description=").append(e.getDescription().trim());
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
