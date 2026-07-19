package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.ExampleQuestionRequest;
import com.wky.backend.domain.dto.ExampleQuestionResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.service.IExampleQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/example-questions")
@RequiredArgsConstructor
public class AdminExampleQuestionController {

    private final IExampleQuestionService exampleQuestionService;

    @GetMapping
    public PageResponse<ExampleQuestionResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return exampleQuestionService.adminPage(q, page, size);
    }

    @GetMapping("/{id}")
    public ExampleQuestionResponse get(@PathVariable Long id) {
        return exampleQuestionService.getByIdOrThrow(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExampleQuestionResponse create(@Valid @RequestBody ExampleQuestionRequest request) {
        return exampleQuestionService.create(request);
    }

    @PutMapping("/{id}")
    public ExampleQuestionResponse update(
            @PathVariable Long id,
            @Valid @RequestBody ExampleQuestionRequest request) {
        return exampleQuestionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        exampleQuestionService.delete(id);
    }
}
