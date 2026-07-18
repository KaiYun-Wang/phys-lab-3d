package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wky.backend.config.AiModelFactory;
import com.wky.backend.config.AiProperties;
import com.wky.backend.domain.dto.KbDocumentResponse;
import com.wky.backend.domain.dto.PageResponse;
import com.wky.backend.domain.entity.KbChunk;
import com.wky.backend.domain.entity.KbDocument;
import com.wky.backend.exception.ApiException;
import com.wky.backend.mapper.KbChunkMapper;
import com.wky.backend.mapper.KbDocumentMapper;
import com.wky.backend.service.IKnowledgeService;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class KnowledgeServiceImpl implements IKnowledgeService {

    private static final int CHUNK_SIZE = 500;
    private static final int CHUNK_OVERLAP = 80;

    private final KbDocumentMapper documentMapper;
    private final KbChunkMapper chunkMapper;
    private final AiModelFactory aiModelFactory;
    private final AiProperties aiProperties;

    @Override
    public PageResponse<KbDocumentResponse> listDocuments(long page, long pageSize) {
        Page<KbDocument> p = documentMapper.selectPage(
                new Page<>(page, pageSize),
                new LambdaQueryWrapper<KbDocument>().orderByDesc(KbDocument::getUpdateTime));
        List<KbDocumentResponse> records = p.getRecords().stream().map(this::toResponse).toList();
        return new PageResponse<>(records, p.getTotal(), page, pageSize);
    }

    @Override
    @Transactional
    public KbDocumentResponse upload(String title, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(400, "请上传文件");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.txt";
        String lower = filename.toLowerCase(Locale.ROOT);
        if (!(lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown"))) {
            throw new ApiException(400, "仅支持 .txt / .md 文本文件");
        }

        String text = readText(file);
        if (!StringUtils.hasText(text)) {
            throw new ApiException(400, "文件内容为空");
        }

        KbDocument doc = new KbDocument();
        doc.setTitle(StringUtils.hasText(title) ? title.trim() : stripExt(filename));
        doc.setFilename(filename);
        doc.setContentType(file.getContentType());
        doc.setStatus("PROCESSING");
        doc.setChunkCount(0);
        documentMapper.insert(doc);

        try {
            int chunks = indexDocument(doc.getId(), text);
            doc.setChunkCount(chunks);
            doc.setStatus("READY");
            documentMapper.updateById(doc);
            return toResponse(doc);
        } catch (ApiException e) {
            // 整单回滚，避免「事务已中止还去 UPDATE」；把根因抛给前端
            throw e;
        } catch (Exception e) {
            throw new ApiException(502, "文档向量化失败：" + rootMessage(e));
        }
    }

    @Override
    @Transactional
    public void delete(Long documentId) {
        KbDocument doc = documentMapper.selectById(documentId);
        if (doc == null) {
            throw new ApiException(404, "文档不存在");
        }
        chunkMapper.deleteByDocumentId(documentId);
        documentMapper.deleteById(documentId);
    }

    @Override
    @Transactional
    public KbDocumentResponse reindex(Long documentId) {
        throw new ApiException(400, "当前版本上传时已完成索引；如需重建请重新上传文件");
    }

    @Override
    public List<String> retrieve(String query, int topK) {
        if (!StringUtils.hasText(query) || topK <= 0) {
            return List.of();
        }
        Long count = chunkMapper.selectCount(null);
        if (count == null || count == 0) {
            return List.of();
        }
        try {
            Embedding embedding = aiModelFactory.embeddingModel().embed(query).content();
            ensureDimension(embedding.vector().length);
            String literal = toVectorLiteral(embedding.vector());
            List<KbChunk> hits = chunkMapper.searchByEmbedding(literal, topK);
            List<String> out = new ArrayList<>(hits.size());
            for (KbChunk c : hits) {
                if (StringUtils.hasText(c.getContent())) {
                    out.add(c.getContent().trim());
                }
            }
            return out;
        } catch (ApiException e) {
            if (e.getStatus() == 500 && e.getMessage() != null && e.getMessage().contains("API Key")) {
                return List.of();
            }
            throw e;
        } catch (Exception e) {
            return List.of();
        }
    }

    private int indexDocument(Long documentId, String text) {
        chunkMapper.deleteByDocumentId(documentId);
        List<String> pieces = splitText(text);
        if (pieces.isEmpty()) {
            return 0;
        }
        List<TextSegment> segments = pieces.stream().map(TextSegment::from).toList();
        List<Embedding> embeddings = aiModelFactory.embeddingModel().embedAll(segments).content();
        if (embeddings.size() != pieces.size()) {
            throw new ApiException(502, "向量数量与切片不一致");
        }
        ensureDimension(embeddings.get(0).vector().length);
        for (int i = 0; i < pieces.size(); i++) {
            float[] vec = embeddings.get(i).vector();
            ensureDimension(vec.length);
            KbChunk chunk = new KbChunk();
            chunk.setDocumentId(documentId);
            chunk.setChunkIndex(i);
            chunk.setContent(pieces.get(i));
            chunk.setEmbeddingLiteral(toVectorLiteral(vec));
            chunkMapper.insertWithEmbedding(chunk);
        }
        return pieces.size();
    }

    private void ensureDimension(int actual) {
        int expected = aiProperties.getEmbedding().getDimensions();
        if (actual != expected) {
            throw new ApiException(502,
                    "向量维度不匹配：模型返回 " + actual + " 维，配置 phys-lab.ai.embedding.dimensions="
                            + expected + "。请同步修改 kb_chunks.embedding 列类型为 vector(" + actual + ")");
        }
    }

    static List<String> splitText(String text) {
        String normalized = text.replace("\r\n", "\n").trim();
        if (normalized.isEmpty()) {
            return List.of();
        }
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < normalized.length()) {
            int end = Math.min(start + CHUNK_SIZE, normalized.length());
            String piece = normalized.substring(start, end).trim();
            if (!piece.isEmpty()) {
                chunks.add(piece);
            }
            if (end >= normalized.length()) {
                break;
            }
            start = Math.max(end - CHUNK_OVERLAP, start + 1);
        }
        return chunks;
    }

    static String toVectorLiteral(float[] vector) {
        StringBuilder sb = new StringBuilder(vector.length * 8);
        sb.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(vector[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    private static String rootMessage(Throwable e) {
        Throwable cur = e;
        while (cur.getCause() != null && cur.getCause() != cur) {
            cur = cur.getCause();
        }
        String msg = cur.getMessage();
        return msg != null ? msg : e.getMessage();
    }

    private static String readText(MultipartFile file) {
        try {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ApiException(400, "读取文件失败");
        }
    }

    private static String stripExt(String filename) {
        int i = filename.lastIndexOf('.');
        return i > 0 ? filename.substring(0, i) : filename;
    }

    private KbDocumentResponse toResponse(KbDocument d) {
        return KbDocumentResponse.builder()
                .id(d.getId())
                .title(d.getTitle())
                .filename(d.getFilename())
                .contentType(d.getContentType())
                .status(d.getStatus())
                .chunkCount(d.getChunkCount())
                .createTime(d.getCreateTime())
                .updateTime(d.getUpdateTime())
                .build();
    }
}
