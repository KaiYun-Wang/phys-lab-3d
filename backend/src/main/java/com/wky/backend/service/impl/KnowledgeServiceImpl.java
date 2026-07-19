package com.wky.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wky.backend.config.AiModelFactory;
import com.wky.backend.config.AiProperties;
import com.wky.backend.domain.dto.KbChunkResponse;
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

    static final int DEFAULT_CHUNK_SIZE = 512;
    static final int DEFAULT_CHUNK_OVERLAP = 128;
    private static final int MAX_CHUNK_SIZE = 100_000;

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
    public KbDocumentResponse upload(
            String title, MultipartFile file, Integer chunkSize, Integer chunkOverlap, boolean noChunk) {
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

        int size = resolveChunkSize(chunkSize, noChunk);
        int overlap = resolveOverlap(chunkOverlap, size, noChunk);

        KbDocument doc = new KbDocument();
        doc.setTitle(StringUtils.hasText(title) ? title.trim() : stripExt(filename));
        doc.setFilename(filename);
        doc.setContentType(file.getContentType());
        doc.setStatus("PROCESSING");
        doc.setChunkCount(0);
        documentMapper.insert(doc);

        try {
            int chunks = indexDocument(doc.getId(), text, size, overlap);
            doc.setChunkCount(chunks);
            doc.setStatus("READY");
            documentMapper.updateById(doc);
            return toResponse(doc);
        } catch (ApiException e) {
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
    public List<KbChunkResponse> listChunks(Long documentId) {
        KbDocument doc = documentMapper.selectById(documentId);
        if (doc == null) {
            throw new ApiException(404, "文档不存在");
        }
        List<KbChunk> chunks = chunkMapper.selectList(
                new LambdaQueryWrapper<KbChunk>()
                        .eq(KbChunk::getDocumentId, documentId)
                        .orderByAsc(KbChunk::getChunkIndex));
        return chunks.stream().map(this::toChunkResponse).toList();
    }

    @Override
    @Transactional
    public KbChunkResponse updateChunk(Long chunkId, String content) {
        if (!StringUtils.hasText(content)) {
            throw new ApiException(400, "分块内容不能为空");
        }
        KbChunk chunk = chunkMapper.selectById(chunkId);
        if (chunk == null) {
            throw new ApiException(404, "分块不存在");
        }
        String trimmed = content.trim();
        Embedding embedding = aiModelFactory.embeddingModel().embed(trimmed).content();
        ensureDimension(embedding.vector().length);
        chunk.setContent(trimmed);
        chunk.setEmbeddingLiteral(toVectorLiteral(embedding.vector()));
        chunkMapper.updateWithEmbedding(chunk);
        return toChunkResponse(chunkMapper.selectById(chunkId));
    }

    @Override
    @Transactional
    public void deleteChunk(Long chunkId) {
        KbChunk chunk = chunkMapper.selectById(chunkId);
        if (chunk == null) {
            throw new ApiException(404, "分块不存在");
        }
        Long documentId = chunk.getDocumentId();
        chunkMapper.deleteById(chunkId);
        KbDocument doc = documentMapper.selectById(documentId);
        if (doc != null) {
            long remaining = chunkMapper.selectCount(
                    new LambdaQueryWrapper<KbChunk>().eq(KbChunk::getDocumentId, documentId));
            doc.setChunkCount((int) remaining);
            documentMapper.updateById(doc);
        }
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

    private int indexDocument(Long documentId, String text, int chunkSize, int chunkOverlap) {
        chunkMapper.deleteByDocumentId(documentId);
        List<String> pieces = splitText(text, chunkSize, chunkOverlap);
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

    static int resolveChunkSize(Integer chunkSize, boolean noChunk) {
        if (noChunk) {
            return MAX_CHUNK_SIZE;
        }
        int size = chunkSize != null ? chunkSize : DEFAULT_CHUNK_SIZE;
        if (size < 1 || size > MAX_CHUNK_SIZE) {
            throw new ApiException(400, "块大小须在 1～" + MAX_CHUNK_SIZE + " 之间");
        }
        return size;
    }

    static int resolveOverlap(Integer chunkOverlap, int chunkSize, boolean noChunk) {
        if (noChunk) {
            return 0;
        }
        int overlap = chunkOverlap != null ? chunkOverlap : DEFAULT_CHUNK_OVERLAP;
        if (overlap < 0) {
            throw new ApiException(400, "重叠大小不能为负");
        }
        if (overlap >= chunkSize) {
            throw new ApiException(400, "重叠大小须小于块大小");
        }
        return overlap;
    }

    static List<String> splitText(String text, int chunkSize, int chunkOverlap) {
        String normalized = text.replace("\r\n", "\n").trim();
        if (normalized.isEmpty()) {
            return List.of();
        }
        if (normalized.length() <= chunkSize) {
            return List.of(normalized);
        }
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < normalized.length()) {
            int end = Math.min(start + chunkSize, normalized.length());
            String piece = normalized.substring(start, end).trim();
            if (!piece.isEmpty()) {
                chunks.add(piece);
            }
            if (end >= normalized.length()) {
                break;
            }
            start = Math.max(end - chunkOverlap, start + 1);
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

    private KbChunkResponse toChunkResponse(KbChunk c) {
        String content = c.getContent() != null ? c.getContent() : "";
        return KbChunkResponse.builder()
                .id(c.getId())
                .documentId(c.getDocumentId())
                .chunkIndex(c.getChunkIndex())
                .content(content)
                .charCount(content.length())
                .createTime(c.getCreateTime())
                .build();
    }
}
