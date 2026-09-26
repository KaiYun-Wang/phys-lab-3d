package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wky.backend.domain.dto.KnowledgePageRequest;
import com.wky.backend.domain.dto.KnowledgePageResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.KnowledgePage;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.KnowledgePageMapper;
import com.wky.backend.service.IKnowledgePageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class KnowledgePageServiceImpl implements IKnowledgePageService {

    private final KnowledgePageMapper pageMapper;

    @Override
    public PageResponse<KnowledgePageResponse> list(long page, long pageSize, String q) {
        LambdaQueryWrapper<KnowledgePage> query = new LambdaQueryWrapper<KnowledgePage>()
                .select(
                        KnowledgePage::getId,
                        KnowledgePage::getTitle,
                        KnowledgePage::getDescription,
                        KnowledgePage::getCreateTime,
                        KnowledgePage::getUpdateTime)
                .orderByDesc(KnowledgePage::getUpdateTime)
                .orderByDesc(KnowledgePage::getId);
        if (StringUtils.hasText(q)) {
            query.like(KnowledgePage::getTitle, q.trim());
        }
        Page<KnowledgePage> p = pageMapper.selectPage(new Page<>(page, pageSize), query);
        List<KnowledgePageResponse> records = p.getRecords().stream().map(this::toSummary).toList();
        return new PageResponse<>(records, p.getTotal(), page, pageSize);
    }

    @Override
    public KnowledgePageResponse get(Long id) {
        return toFull(require(id));
    }

    @Override
    @Transactional
    public KnowledgePageResponse create(KnowledgePageRequest request) {
        KnowledgePage page = new KnowledgePage();
        apply(page, request);
        pageMapper.insert(page);
        return toFull(page);
    }

    @Override
    @Transactional
    public KnowledgePageResponse update(Long id, KnowledgePageRequest request) {
        KnowledgePage page = require(id);
        apply(page, request);
        pageMapper.updateById(page);
        return toFull(page);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (pageMapper.deleteById(id) == 0) {
            throw new ApiException(404, "知识页不存在");
        }
    }

    @Override
    public List<KnowledgePageResponse> searchSummaries(String keyword) {
        LambdaQueryWrapper<KnowledgePage> q = new LambdaQueryWrapper<KnowledgePage>()
                .select(
                        KnowledgePage::getId,
                        KnowledgePage::getTitle,
                        KnowledgePage::getDescription,
                        KnowledgePage::getUpdateTime)
                .orderByDesc(KnowledgePage::getUpdateTime)
                .orderByDesc(KnowledgePage::getId);
        if (StringUtils.hasText(keyword)) {
            String like = "%" + keyword.trim() + "%";
            q.and(w -> w.like(KnowledgePage::getTitle, like).or().like(KnowledgePage::getDescription, like));
        }
        return pageMapper.selectList(q).stream().map(this::toSummary).toList();
    }

    @Override
    public List<KnowledgePageResponse> getContentsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Long> unique = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (unique.isEmpty()) {
            return List.of();
        }
        List<KnowledgePage> rows = pageMapper.selectList(
                new LambdaQueryWrapper<KnowledgePage>().in(KnowledgePage::getId, unique));
        rows.sort(Comparator
                .comparing(KnowledgePage::getUpdateTime, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(KnowledgePage::getId, Comparator.reverseOrder()));
        List<KnowledgePageResponse> out = new ArrayList<>(rows.size());
        for (KnowledgePage row : rows) {
            out.add(toFull(row));
        }
        return out;
    }

    private KnowledgePage require(Long id) {
        KnowledgePage page = pageMapper.selectById(id);
        if (page == null) {
            throw new ApiException(404, "知识页不存在");
        }
        return page;
    }

    private static void apply(KnowledgePage page, KnowledgePageRequest request) {
        page.setTitle(request.getTitle().trim());
        page.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : "");
        page.setContent(request.getContent().trim());
        if (page.getSortOrder() == null) {
            page.setSortOrder(0);
        }
    }

    private KnowledgePageResponse toSummary(KnowledgePage page) {
        return KnowledgePageResponse.builder()
                .id(page.getId())
                .title(page.getTitle())
                .description(page.getDescription())
                .createTime(page.getCreateTime())
                .updateTime(page.getUpdateTime())
                .build();
    }

    private KnowledgePageResponse toFull(KnowledgePage page) {
        return KnowledgePageResponse.builder()
                .id(page.getId())
                .title(page.getTitle())
                .description(page.getDescription())
                .content(page.getContent())
                .createTime(page.getCreateTime())
                .updateTime(page.getUpdateTime())
                .build();
    }
}
