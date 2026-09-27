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
@RequestMapping("/api/demos")
@RequiredArgsConstructor
public class DemoAudioController {

    private static final String PLATFORM = "minio-demos";
    private static final String BASE_PATH = "demos/";

    private final FileStorageService fileStorageService;

    @GetMapping("/{filename}")
    public void serve(@PathVariable String filename, HttpServletResponse response) throws IOException {
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        FileInfo fileInfo = new FileInfo()
                .setPlatform(PLATFORM)
                .setBasePath(BASE_PATH)
                .setFilename(filename);
        if (!fileStorageService.exists(fileInfo)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        response.setContentType("audio/mpeg");
        fileStorageService.download(fileInfo).outputStream(response.getOutputStream());
    }
}
