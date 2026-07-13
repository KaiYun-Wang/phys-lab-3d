package com.wky.backend.controller.admin;

import com.wky.backend.domain.dto.CoverUploadResponse;
import com.wky.backend.domain.dto.CreateExperimentRequest;
import com.wky.backend.domain.dto.ExperimentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.dto.UpdateExperimentRequest;
import com.wky.backend.service.IExperimentCoverService;
import com.wky.backend.service.IExperimentService;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/experiments")
@RequiredArgsConstructor
public class AdminExperimentController {

    private final IExperimentService experimentService;
    private final IExperimentCoverService experimentCoverService;

    @GetMapping
    public PageResponse<ExperimentResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long pageSize) {
        return experimentService.adminPage(q, status, page, pageSize);
    }

    @GetMapping("/{id}")
    public ExperimentResponse get(@PathVariable Long id) {
        return experimentService.adminGetById(id);
    }

    @PostMapping("/cover")
    public CoverUploadResponse uploadCover(@RequestParam("file") MultipartFile file) {
        return experimentCoverService.upload(file);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExperimentResponse create(@Valid @RequestBody CreateExperimentRequest request) {
        return experimentService.adminCreate(request);
    }

    @PutMapping("/{id}")
    public ExperimentResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateExperimentRequest request) {
        return experimentService.adminUpdate(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        experimentService.adminDelete(id);
    }
}
