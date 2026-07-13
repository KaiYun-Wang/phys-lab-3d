package com.wky.backend.service.impl;

import com.wky.backend.domain.dto.CoverUploadResponse;
import com.wky.backend.exception.ApiException;
import com.wky.backend.service.IExperimentCoverService;
import lombok.RequiredArgsConstructor;
import org.dromara.x.file.storage.core.FileInfo;
import org.dromara.x.file.storage.core.FileStorageService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExperimentCoverServiceImpl implements IExperimentCoverService {

    private static final String STORAGE_PLATFORM = "minio-covers";

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp");

    private static final long MAX_SIZE = 2 * 1024 * 1024;

    private final FileStorageService fileStorageService;

    @Override
    public CoverUploadResponse upload(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ApiException(400, "请选择图片");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new ApiException(400, "图片不能超过 2MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ApiException(400, "仅支持 JPG / PNG / WebP");
        }

        String ext = switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        String filename = "cover-" + UUID.randomUUID().toString().substring(0, 8) + ext;
        FileInfo fileInfo = fileStorageService.of(file)
                .setPlatform(STORAGE_PLATFORM)
                .setSaveFilename(filename)
                .upload();
        if (fileInfo == null) {
            throw new ApiException(500, "封面上传失败");
        }

        return new CoverUploadResponse("/api/covers/" + filename);
    }
}
