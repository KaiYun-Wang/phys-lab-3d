package com.wky.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wky.backend.domain.dto.ExampleQuestionRequest;
import com.wky.backend.domain.dto.ExampleQuestionResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.ExampleQuestion;

import java.util.List;

public interface IExampleQuestionService extends IService<ExampleQuestion> {

    List<ExampleQuestionResponse> listAll();

    PageResponse<ExampleQuestionResponse> adminPage(String q, long page, long size);

    ExampleQuestionResponse getByIdOrThrow(Long id);

    ExampleQuestionResponse create(ExampleQuestionRequest request);

    ExampleQuestionResponse update(Long id, ExampleQuestionRequest request);

    void delete(Long id);
}
