package com.tap.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class LoadMoneyRequest {
    // Amount must be a strictly positive number (no zero, no negative values),
    // and capped well below the wallet amount column's NUMERIC(19,4) limit so
    // an oversized value is rejected with a clear message instead of a raw
    // SQL "numeric field overflow" error.
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be a positive number")
    @DecimalMax(value = "100000", message = "Amount cannot exceed 100,000 per load")
    private BigDecimal amount;

    // reference returned by the mobile money provider (Telebirr, HelloCash, etc.)
    private String mobileMoneyReference;

    // Strictly a 10-digit phone number (no spaces, dashes or country code).
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phoneNumber;

    // Which mobile money provider the customer paid with (Telebirr, CBE Birr, M-Pesa, HelloCash...)
    private String provider;
}
