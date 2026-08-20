package com.tap.dto;

import lombok.Getter;

/**
 * Result of a successful tap-to-pay card lookup: just enough for the POS
 * terminal to show "Charge <name>?" and a Confirm Payment button. Never
 * includes the raw card UID or any other sensitive card data.
 */
@Getter
public class TapCardLookupResponse {
    private final String cardUid;
    private final String customerName;

    public TapCardLookupResponse(String cardUid, String customerName) {
        this.cardUid = cardUid;
        this.customerName = customerName;
    }
}
