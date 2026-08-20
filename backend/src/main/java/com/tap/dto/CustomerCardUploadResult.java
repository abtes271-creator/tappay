package com.tap.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class CustomerCardUploadResult {
    private final int totalRows;
    private final int created;
    private final int skipped;
    private final List<String> errors;
    private final List<BulkCustomerRow> createdCustomers;

    public CustomerCardUploadResult(int totalRows, int created, int skipped,
                                     List<String> errors, List<BulkCustomerRow> createdCustomers) {
        this.totalRows = totalRows;
        this.created = created;
        this.skipped = skipped;
        this.errors = errors;
        this.createdCustomers = createdCustomers;
    }
}
