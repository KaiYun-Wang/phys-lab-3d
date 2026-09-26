package com.wky.backend.service;

import com.wky.backend.domain.dto.KnowledgePageRequest;
import com.wky.backend.domain.dto.KnowledgePageResponse;
import com.wky.backend.domain.dto.PageResponse;

import java.util.List;

public interface IKnowledgePageService {

    PageResponse<KnowledgePageResponse> list(long page, long pageSize, String q);

    KnowledgePageResponse get(Long id);

    KnowledgePageResponse create(KnowledgePageRequest request);

    KnowledgePageResponse update(Long id, KnowledgePageRequest request);

    void delete(Long id);

    /** AI 工具：按标题/描述模糊查目录（keyword 空=全部）。 */
    List<KnowledgePageResponse> searchSummaries(String keyword);

    /** AI 工具：按 id 取正文。 */
    List<KnowledgePageResponse> getContentsByIds(List<Long> ids);
}
