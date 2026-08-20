package com.tap.dto;

import lombok.Getter;

/**
 * One successfully-created customer from a bulk customer+card upload.
 * The password itself is never surfaced here - it's set explicitly by
 * whoever prepared the upload file and is only ever sent to the customer
 * by email, never displayed in the admin UI.
 */
@Getter
public class BulkCustomerRow {
    private final String cardNo;
    private final String fullName;
    private final String username;

    public BulkCustomerRow(String cardNo, String fullName, String username) {
        this.cardNo = cardNo;
        this.fullName = fullName;
        this.username = username;
    }
}
