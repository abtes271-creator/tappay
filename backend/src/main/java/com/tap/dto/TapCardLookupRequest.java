package com.tap.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Sent by the POS terminal the instant an NFC card is tapped, before any
 * money moves - this only looks the card up and returns the customer's name
 * so the seller can show a Confirm Payment step. The actual charge still
 * goes through /api/payment/tap.
 */
@Getter
@Setter
public class TapCardLookupRequest {

    @NotBlank
    private String cardUid;
}
