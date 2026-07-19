package com.wky.backend.service;

import com.wky.backend.domain.dto.KbChunkResponse;
import com.wky.backend.domain.dto.KbDocumentResponse;
import com.wky.backend.domain.dto.PageResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IKnowledgeService {

    PageResponse<KbDocumentResponse> listDocuments(long page, long pageSize);

    KbDocumentResponse upload(String title, MultipartFile file, Integer chunkSize, Integer chunkOverlap, boolean noChunk);

    void delete(Long documentId);

    List<KbChunkResponse> listChunks(Long documentId);

    KbChunkResponse updateChunk(Long chunkId, String content);

    void deleteChunk(Long chunkId);

    KbDocumentResponse reindex(Long documentId);

    List<String> retrieve(String query, int topK);
}
