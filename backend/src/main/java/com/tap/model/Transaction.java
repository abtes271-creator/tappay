package com.tap.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    @ManyToOne
    @JoinColumn(name = "from_wallet_id")
    private Wallet fromWallet; // null for LOAD

    @ManyToOne
    @JoinColumn(name = "to_wallet_id")
    private Wallet toWallet; // null for WITHDRAWAL

    @ManyToOne
    @JoinColumn(name = "item_id")
    private Item item; // only for EXPENDITURE

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    private String reference; // e.g. mobile money transaction reference / card UID used

    private boolean successful = true;

    private LocalDateTime timestamp = LocalDateTime.now();
}
