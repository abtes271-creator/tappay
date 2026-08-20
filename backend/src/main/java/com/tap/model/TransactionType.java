package com.tap.model;

public enum TransactionType {
    LOAD,          // mobile money -> WALLET1
    EXPENDITURE,   // WALLET1 -> WALLET2 (tap & pay)
    WITHDRAWAL     // WALLET2 -> mobile money
}
