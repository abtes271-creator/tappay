package com.tap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class TapPaymentRequest {
    // UID read from the NFC card by the reader/terminal
    @NotBlank
    private String cardUid;

    // One or more items selected on the institution's item grid (checkboxes) -
    // all are charged together in a single tap, as one basket.
    @NotEmpty(message = "Select at least one item before tapping to pay")
    private List<Long> itemIds;
}
