package com.wky.backend.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.dromara.x.file.storage.core.FileInfo;
import org.dromara.x.file.storage.core.FileStorageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/avatars")
@RequiredArgsConstructor
public class AvatarController {

    private static final String PLATFORM = "minio-1";
    private static final String BASE_PATH = "avatars/";

    private final FileStorageService fileStorageService;

    @GetMapping("/{filename}")
    public void serve(@PathVariable String filename, HttpServletResponse response) throws IOException {
        FileInfo fileInfo = avatarFileInfo(filename);
        if (!fileStorageService.exists(fileInfo)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        response.setContentType(contentType(filename));
        fileStorageService.download(fileInfo).outputStream(response.getOutputStream());
    }

    static FileInfo avatarFileInfo(String filename) {
        return new FileInfo()
                .setPlatform(PLATFORM)
                .setBasePath(BASE_PATH)
                .setFilename(filename);
    }

    private static String contentType(String filename) {
        if (filename.endsWith(".png")) {
            return "image/png";
        }
        if (filename.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }
}
