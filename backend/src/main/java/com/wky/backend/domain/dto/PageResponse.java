package com.wky.backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class PageResponse<T> {

    private List<T> records;
    private long total;
    private long page;
    private long pageSize;
}
