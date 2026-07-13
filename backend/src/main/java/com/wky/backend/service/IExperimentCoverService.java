package com.wky.backend.service;

import com.wky.backend.domain.dto.CoverUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface IExperimentCoverService {

    CoverUploadResponse upload(MultipartFile file);
}
