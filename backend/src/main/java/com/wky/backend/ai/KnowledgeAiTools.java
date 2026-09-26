package com.wky.backend.ai;

import com.wky.backend.domain.dto.KnowledgePageResponse;
import com.wky.backend.service.IKnowledgePageService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/** AI 知识页工具：先查目录（id+标题+描述），再按需拉正文。 */
@Component
@RequiredArgsConstructor
public class KnowledgeAiTools {

    private final IKnowledgePageService knowledgePageService;

    @Tool("查询知识页目录（只返回 id、标题、描述，不含正文）。"
            + "当用户问题涉及实验原理、操作说明、平台文档时先调用；"
            + "keyword 可按标题/描述模糊过滤，留空返回全部目录。"
            + "看完描述后再调用 getKnowledgePageContents 拉取需要的正文。")
    public String listKnowledgePages(
            @P(value = "可选关键词，按标题或描述模糊筛选；留空返回全部知识页目录", required = false)
            String keyword) {
        String q = StringUtils.hasText(keyword) ? keyword.trim() : null;
        List<KnowledgePageResponse> list = knowledgePageService.searchSummaries(q);
        if (list.isEmpty()) {
            return q == null ? "当前无知识页。" : "未找到与「" + q + "」相关的知识页。";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("共 ").append(list.size()).append(" 篇知识页：\n");
        for (KnowledgePageResponse p : list) {
            sb.append("- id=").append(p.getId())
                    .append(", title=").append(nullToEmpty(p.getTitle()));
            if (StringUtils.hasText(p.getDescription())) {
                sb.append(", description=").append(p.getDescription().trim());
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    @Tool("按知识页 id 拉取正文。须先 listKnowledgePages，根据描述选出相关 id 后再调用；"
            + "不要一次拉取全部正文。ids 为逗号分隔，例如 \"1,3\"。")
    public String getKnowledgePageContents(
            @P("知识页 id，逗号分隔，例如 1,3") String ids) {
        List<Long> idList = parseIds(ids);
        if (idList.isEmpty()) {
            return "未提供有效的知识页 id。";
        }
        List<KnowledgePageResponse> pages = knowledgePageService.getContentsByIds(idList);
        if (pages.isEmpty()) {
            return "未找到对应知识页。";
        }
        StringBuilder sb = new StringBuilder();
        for (KnowledgePageResponse p : pages) {
            sb.append("===== id=").append(p.getId())
                    .append(" | ").append(nullToEmpty(p.getTitle()))
                    .append(" =====\n");
            if (StringUtils.hasText(p.getDescription())) {
                sb.append("描述：").append(p.getDescription().trim()).append('\n');
            }
            sb.append(nullToEmpty(p.getContent()).trim()).append("\n\n");
        }
        return sb.toString().trim();
    }

    private static List<Long> parseIds(String raw) {
        List<Long> out = new ArrayList<>();
        if (!StringUtils.hasText(raw)) {
            return out;
        }
        for (String part : raw.split("[,，\\s]+")) {
            if (!StringUtils.hasText(part)) {
                continue;
            }
            try {
                out.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException ignored) {
                // skip bad token
            }
        }
        return out;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
