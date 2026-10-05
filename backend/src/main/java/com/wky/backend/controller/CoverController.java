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
@RequestMapping("/api/covers")
@RequiredArgsConstructor
public class CoverController {

    private static final String PLATFORM = "minio-covers";
    private static final String BASE_PATH = "covers/";

    private final FileStorageService fileStorageService;

    @GetMapping("/{filename}")
    public void serve(@PathVariable String filename, HttpServletResponse response) throws IOException {
        FileInfo fileInfo = coverFileInfo(filename);
        if (!fileStorageService.exists(fileInfo)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        String type = contentType(filename);
        response.setContentType(type);
        // 防 MIME 嗅探：声明什么类型就按什么类型渲染
        response.setHeader("X-Content-Type-Options", "nosniff");
        if ("image/svg+xml".equals(type)) {
            // SVG 本质是可执行文档：sandbox 使其以唯一源、禁脚本加载，
            // 即使被直接打开该 URL 也不构成同源 XSS；保留内联 style 供正常渲染
            response.setHeader("Content-Security-Policy",
                    "sandbox; default-src 'none'; style-src 'unsafe-inline'");
        }
        fileStorageService.download(fileInfo).outputStream(response.getOutputStream());
    }

    static FileInfo coverFileInfo(String filename) {
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
        if (filename.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return "image/jpeg";
    }
}
