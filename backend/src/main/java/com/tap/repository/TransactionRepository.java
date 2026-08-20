package com.tap.repository;

import com.tap.model.Transaction;
import com.tap.model.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByFromWalletOrToWalletOrderByTimestampDesc(Wallet fromWallet, Wallet toWallet);
}
