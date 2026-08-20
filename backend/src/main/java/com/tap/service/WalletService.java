package com.tap.service;

import com.tap.dto.LoadMoneyRequest;
import com.tap.dto.TransactionView;
import com.tap.dto.WithdrawRequest;
import com.tap.exception.ApiException;
import com.tap.model.Card;
import com.tap.model.Transaction;
import com.tap.model.TransactionType;
import com.tap.model.Wallet;
import com.tap.repository.CardRepository;
import com.tap.repository.TransactionRepository;
import com.tap.repository.UserRepository;
import com.tap.repository.WalletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tap.model.User;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public WalletService(WalletRepository walletRepository, TransactionRepository transactionRepository,
                          CardRepository cardRepository, UserRepository userRepository,
                          PasswordEncoder passwordEncoder) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.cardRepository = cardRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Step shown by the "Load Money" popup on the user dashboard: the
     * customer enters their card number before continuing to the mobile
     * money form. Confirms the card exists, is enabled, and belongs to them.
     */
    public Card verifyCardForUser(Long userId, String cardNo) {
        Card card = cardRepository.findByCardNo(cardNo.trim())
                .orElseThrow(() -> new ApiException("Card not found", HttpStatus.NOT_FOUND));

        if (card.getUser() == null || !card.getUser().getId().equals(userId)) {
            throw new ApiException("This card is not registered to your account", HttpStatus.FORBIDDEN);
        }
        if (!card.isEnabled()) {
            throw new ApiException("This card is currently disabled", HttpStatus.BAD_REQUEST);
        }
        return card;
    }

    public Wallet getWalletForUser(Long userId) {
        return walletRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ApiException("Wallet not found for user", HttpStatus.NOT_FOUND));
    }

    /**
     * Mobile money -> user's WALLET1. In production this would be called after
     * the mobile money provider (Telebirr / HelloCash / M-Pesa, etc.) confirms
     * the payment via webhook or reference lookup.
     */
    @Transactional
    public Transaction loadMoney(Long userId, LoadMoneyRequest req) {
        Wallet wallet = getWalletForUser(userId);

        wallet.setBalance(wallet.getBalance().add(req.getAmount()));
        walletRepository.save(wallet);

        String reference = req.getMobileMoneyReference();
        if (req.getProvider() != null && !req.getProvider().isBlank()) {
            reference = req.getProvider() + (reference != null ? " · " + reference : "");
        }

        Transaction tx = new Transaction();
        tx.setType(TransactionType.LOAD);
        tx.setFromWallet(null);
        tx.setToWallet(wallet);
        tx.setAmount(req.getAmount());
        tx.setReference(reference);
        return transactionRepository.save(tx);
    }

    /**
     * Institution's WALLET2 -> mobile money out. Deducts from the wallet immediately;
     * actual payout to mobile money is handled by an external provider integration.
     */
    @Transactional
    public Transaction withdraw(Long userId, WithdrawRequest req) {
        // Password is confirmed here, immediately before processing - never
        // earlier in the form - as the last checkpoint before money moves out.
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("Account not found", HttpStatus.NOT_FOUND));
        if (!passwordEncoder.matches(req.getPassword(), owner.getPasswordHash())) {
            throw new ApiException("Incorrect password", HttpStatus.UNAUTHORIZED);
        }

        Wallet wallet = getWalletForUser(userId);

        if (wallet.getBalance().compareTo(req.getAmount()) < 0) {
            throw new ApiException("Insufficient balance", HttpStatus.BAD_REQUEST);
        }

        wallet.setBalance(wallet.getBalance().subtract(req.getAmount()));
        walletRepository.save(wallet);

        String reference = req.getPhoneNumber();
        if (req.getProvider() != null && !req.getProvider().isBlank()) {
            reference = req.getProvider() + (reference != null ? " · " + reference : "");
        }

        Transaction tx = new Transaction();
        tx.setType(TransactionType.WITHDRAWAL);
        tx.setFromWallet(wallet);
        tx.setToWallet(null);
        tx.setAmount(req.getAmount());
        tx.setReference(reference);
        return transactionRepository.save(tx);
    }

    public List<TransactionView> getRecentTransactionsForUser(Long userId) {
        Wallet wallet = getWalletForUser(userId);
        return transactionRepository.findByFromWalletOrToWalletOrderByTimestampDesc(wallet, wallet)
                .stream()
                .map(TransactionView::new)
                .collect(Collectors.toList());
    }

    /**
     * Core money-flow rule from the spec: expenditure moves balance from the
     * user's WALLET1 to the institution's WALLET2, atomically, updating both.
     */
    @Transactional
    public Transaction transferForExpenditure(Wallet fromWallet, Wallet toWallet, BigDecimal amount, com.tap.model.Item item, String cardUid) {
        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new ApiException("Insufficient balance on card", HttpStatus.BAD_REQUEST);
        }

        fromWallet.setBalance(fromWallet.getBalance().subtract(amount));
        toWallet.setBalance(toWallet.getBalance().add(amount));
        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        Transaction tx = new Transaction();
        tx.setType(TransactionType.EXPENDITURE);
        tx.setFromWallet(fromWallet);
        tx.setToWallet(toWallet);
        tx.setItem(item);
        tx.setAmount(amount);
        tx.setReference(cardUid);
        return transactionRepository.save(tx);
    }
}
