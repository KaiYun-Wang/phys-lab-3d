package com.wky.backend.service;

import com.wky.backend.domain.dto.KbDocumentResponse;
import com.wky.backend.domain.dto.PageResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IKnowledgeService {

    PageResponse<KbDocumentResponse> listDocuments(long page, long pageSize);

    KbDocumentResponse upload(String title, MultipartFile file);

    void delete(Long documentId);

    KbDocumentResponse reindex(Long documentId);

    List<String> retrieve(String query, int topK);
}
