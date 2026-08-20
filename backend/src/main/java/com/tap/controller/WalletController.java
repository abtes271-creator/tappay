package com.tap.controller;

import com.tap.dto.LoadMoneyRequest;
import com.tap.dto.TransactionView;
import com.tap.dto.VerifyCardRequest;
import com.tap.dto.WithdrawRequest;
import com.tap.model.Wallet;
import com.tap.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/balance")
    public ResponseEntity<Wallet> getBalance(Authentication authentication) {
        Long userId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.getWalletForUser(userId));
    }

    // Step 1 of the "Load Money" popup: confirm the entered card number
    // belongs to the logged-in user before showing the mobile-money form.
    @PostMapping("/verify-card")
    public ResponseEntity<Map<String, Object>> verifyCard(@Valid @RequestBody VerifyCardRequest req,
                                                            Authentication authentication) {
        Long userId = (Long) authentication.getCredentials();
        var card = walletService.verifyCardForUser(userId, req.getCardNo());
        return ResponseEntity.ok(Map.of("verified", true, "cardNo", card.getCardNo()));
    }

    // User loads money via mobile money into WALLET1
    @PostMapping("/load")
    public ResponseEntity<?> loadMoney(@Valid @RequestBody LoadMoneyRequest req, Authentication authentication) {
        Long userId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.loadMoney(userId, req));
    }

    // Full transaction history for the logged-in user's own wallet (loads and
    // tap-to-pay expenditures), newest first.
    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionView>> getTransactions(Authentication authentication) {
        Long userId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.getRecentTransactionsForUser(userId));
    }

    // Sends WALLET1 balance out via mobile money - same withdrawal flow
    // institutions already use for WALLET2 (see InstitutionController#withdraw).
    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(@Valid @RequestBody WithdrawRequest req, Authentication authentication) {
        Long userId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.withdraw(userId, req));
    }
}
