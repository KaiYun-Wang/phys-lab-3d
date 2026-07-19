package com.wky.backend.service.impl;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KnowledgeServiceImplSplitTest {

    @Test
    void splitText_fixedWindowWithOverlap() {
        String text = "a".repeat(20);
        List<String> chunks = KnowledgeServiceImpl.splitText(text, 10, 2);
        assertEquals(3, chunks.size());
        assertEquals(10, chunks.get(0).length());
        assertEquals(10, chunks.get(1).length());
        assertEquals(4, chunks.get(2).length());
    }

    @Test
    void splitText_noChunkUsesMaxAsSinglePiece() {
        String text = "hello world ".repeat(50).trim();
        int size = KnowledgeServiceImpl.resolveChunkSize(null, true);
        int overlap = KnowledgeServiceImpl.resolveOverlap(null, size, true);
        List<String> chunks = KnowledgeServiceImpl.splitText(text, size, overlap);
        assertEquals(1, chunks.size());
        assertEquals(text, chunks.get(0));
    }

    @Test
    void resolveOverlap_rejectsOverlapGteSize() {
        assertThrows(Exception.class, () -> KnowledgeServiceImpl.resolveOverlap(512, 512, false));
    }

    @Test
    void splitText_empty() {
        assertTrue(KnowledgeServiceImpl.splitText("   ", 10, 2).isEmpty());
    }
}
