package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.CreateSubjectTypeRequest;
import com.wky.backend.domain.dto.SubjectTypeResponse;
import com.wky.backend.domain.dto.UpdateSubjectTypeRequest;
import com.wky.backend.service.ISubjectTypeService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/subject-types")
@RequiredArgsConstructor
public class AdminSubjectTypeController {

    private final ISubjectTypeService subjectTypeService;

    @GetMapping
    public List<SubjectTypeResponse> list() {
        return subjectTypeService.listAll();
    }

    @GetMapping("/{id}")
    public SubjectTypeResponse get(@PathVariable Long id) {
        return subjectTypeService.getByIdOrThrow(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubjectTypeResponse create(@Valid @RequestBody CreateSubjectTypeRequest request) {
        return subjectTypeService.create(request);
    }

    @PutMapping("/{id}")
    public SubjectTypeResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSubjectTypeRequest request) {
        return subjectTypeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        subjectTypeService.delete(id);
    }
}
