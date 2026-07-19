package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wky.backend.domain.dto.ExampleQuestionRequest;
import com.wky.backend.domain.dto.ExampleQuestionResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.ExampleQuestion;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.ExampleQuestionMapper;
import com.wky.backend.service.IExampleQuestionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class ExampleQuestionServiceImpl extends ServiceImpl<ExampleQuestionMapper, ExampleQuestion>
        implements IExampleQuestionService {

    @Override
    public List<ExampleQuestionResponse> listAll() {
        return list(new LambdaQueryWrapper<ExampleQuestion>()
                .orderByAsc(ExampleQuestion::getSortOrder)
                .orderByAsc(ExampleQuestion::getId))
                .stream()
                .map(ExampleQuestionResponse::from)
                .toList();
    }

    @Override
    public PageResponse<ExampleQuestionResponse> adminPage(String q, long page, long size) {
        LambdaQueryWrapper<ExampleQuestion> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(q)) {
            String keyword = q.trim();
            wrapper.and(w -> w
                    .like(ExampleQuestion::getTitle, keyword)
                    .or()
                    .like(ExampleQuestion::getDescription, keyword)
                    .or()
                    .like(ExampleQuestion::getQuestion, keyword));
        }
        wrapper.orderByAsc(ExampleQuestion::getSortOrder).orderByDesc(ExampleQuestion::getId);
        Page<ExampleQuestion> result = page(new Page<>(page, size), wrapper);
        return new PageResponse<>(
                result.getRecords().stream().map(ExampleQuestionResponse::from).toList(),
                result.getTotal(),
                result.getCurrent(),
                result.getSize());
    }

    @Override
    public ExampleQuestionResponse getByIdOrThrow(Long id) {
        ExampleQuestion row = getById(id);
        if (row == null) {
            throw new ApiException(404, "示例问题不存在");
        }
        return ExampleQuestionResponse.from(row);
    }

    @Override
    @Transactional
    public ExampleQuestionResponse create(ExampleQuestionRequest request) {
        ExampleQuestion row = new ExampleQuestion();
        apply(row, request);
        save(row);
        return ExampleQuestionResponse.from(row);
    }

    @Override
    @Transactional
    public ExampleQuestionResponse update(Long id, ExampleQuestionRequest request) {
        ExampleQuestion row = getById(id);
        if (row == null) {
            throw new ApiException(404, "示例问题不存在");
        }
        apply(row, request);
        updateById(row);
        return ExampleQuestionResponse.from(row);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!removeById(id)) {
            throw new ApiException(404, "示例问题不存在");
        }
    }

    private static void apply(ExampleQuestion row, ExampleQuestionRequest request) {
        row.setTitle(request.getTitle().trim());
        row.setDescription(blankToNull(request.getDescription()));
        row.setQuestion(request.getQuestion().trim());
        row.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
    }

    private static String blankToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
