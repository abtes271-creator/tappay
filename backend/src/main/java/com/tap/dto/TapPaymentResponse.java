package com.tap.dto;

import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of a tap-to-pay basket that may contain multiple items - one
 * Transaction row is still recorded per item (so the institution's activity
 * feed shows each item individually), but the terminal only needs the total
 * charged and the customer's resulting balance to show a single confirmation.
 */
@Getter
public class TapPaymentResponse {
    private final List<TransactionView> transactions;
    private final BigDecimal totalAmount;
    private final BigDecimal newBalance;

    public TapPaymentResponse(List<TransactionView> transactions, BigDecimal totalAmount, BigDecimal newBalance) {
        this.transactions = transactions;
        this.totalAmount = totalAmount;
        this.newBalance = newBalance;
    }
}
