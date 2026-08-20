package com.tap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddCardRequest {

    // Card Number: required, must be exactly 12 digits.
    @NotBlank(message = "Card Number is required")
    @Pattern(regexp = "^[0-9]{12}$", message = "Card Number must contain exactly 12 digits")
    private String cardNo;

    // Card UID: required - a mix of digits (0-9) and letters (A-F/a-f),
    // exactly 14 hexadecimal characters. This is the physical card's real
    // NFC UID, as scanned/read off the card - it is never auto-generated,
    // since a mismatched UID would mean the physical card can never
    // actually authenticate against its record.
    @NotBlank(message = "Card UID is required")
    @Pattern(regexp = "^[0-9A-Fa-f]{14}$", message = "Card UID must be exactly 14 hexadecimal characters (0-9, A-F)")
    private String cardUid;
}
