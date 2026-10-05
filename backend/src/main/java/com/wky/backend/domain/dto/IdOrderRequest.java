package com.wky.backend.domain.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/** 批量排序请求：按目标顺序排列的全量 id（实验 / 学科分类 / 示例问题通用） */
@Data
public class IdOrderRequest {

    @NotEmpty
    private List<Long> ids;
}
