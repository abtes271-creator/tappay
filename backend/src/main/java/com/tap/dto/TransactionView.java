package com.tap.dto;

import com.tap.model.Transaction;
import com.tap.model.TransactionType;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Safe, flattened view of a Transaction for the institution's "recent
 * activity" feed — avoids serializing the full Wallet/User graph.
 */
@Getter
public class TransactionView {
    private final Long id;
    private final TransactionType type;
    private final BigDecimal amount;
    private final String itemName; // null unless type == EXPENDITURE
    private final boolean successful;
    private final LocalDateTime timestamp;

    public TransactionView(Transaction tx) {
        this.id = tx.getId();
        this.type = tx.getType();
        this.amount = tx.getAmount();
        this.itemName = tx.getItem() != null ? tx.getItem().getName() : null;
        this.successful = tx.isSuccessful();
        this.timestamp = tx.getTimestamp();
    }
}
