package com.wky.backend.domain.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class DayCountRow {
    private LocalDate day;
    private Long cnt;
}
