package com.wky.backend.controller;

import com.wky.backend.domain.dto.ExampleQuestionResponse;
import com.wky.backend.service.IExampleQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ai/example-questions")
@RequiredArgsConstructor
public class ExampleQuestionController {

    private final IExampleQuestionService exampleQuestionService;

    @GetMapping
    public List<ExampleQuestionResponse> list() {
        return exampleQuestionService.listAll();
    }
}
