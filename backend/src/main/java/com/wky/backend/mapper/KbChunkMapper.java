package com.wky.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wky.backend.domain.entity.KbChunk;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface KbChunkMapper extends BaseMapper<KbChunk> {

    @Insert("""
            INSERT INTO kb_chunks (document_id, chunk_index, content, embedding)
            VALUES (#{documentId}, #{chunkIndex}, #{content}, CAST(#{embeddingLiteral} AS vector))
            """)
    int insertWithEmbedding(KbChunk chunk);

    @Update("""
            UPDATE kb_chunks
            SET content = #{content}, embedding = CAST(#{embeddingLiteral} AS vector)
            WHERE id = #{id}
            """)
    int updateWithEmbedding(KbChunk chunk);

    @Delete("DELETE FROM kb_chunks WHERE document_id = #{documentId}")
    int deleteByDocumentId(@Param("documentId") Long documentId);

    @Select("""
            SELECT id, document_id, chunk_index, content, create_time
            FROM kb_chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(#{embeddingLiteral} AS vector)
            LIMIT #{limit}
            """)
    List<KbChunk> searchByEmbedding(
            @Param("embeddingLiteral") String embeddingLiteral,
            @Param("limit") int limit);
}
