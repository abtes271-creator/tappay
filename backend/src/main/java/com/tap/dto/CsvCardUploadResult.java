package com.tap.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class CsvCardUploadResult {
    private final int totalRows;
    private final int created;
    private final int skipped;
    private final List<String> errors;

    public CsvCardUploadResult(int totalRows, int created, int skipped, List<String> errors) {
        this.totalRows = totalRows;
        this.created = created;
        this.skipped = skipped;
        this.errors = errors;
    }
}
