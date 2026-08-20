package com.tap.controller;

import com.tap.dto.TransactionView;
import com.tap.dto.WithdrawRequest;
import com.tap.exception.ApiException;
import com.tap.model.User;
import com.tap.model.Wallet;
import com.tap.repository.UserRepository;
import com.tap.service.ReportService;
import com.tap.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/institution")
public class InstitutionController {

    private final WalletService walletService;
    private final ReportService reportService;
    private final UserRepository userRepository;

    public InstitutionController(WalletService walletService, ReportService reportService,
                                  UserRepository userRepository) {
        this.walletService = walletService;
        this.reportService = reportService;
        this.userRepository = userRepository;
    }

    @GetMapping("/wallet")
    public ResponseEntity<Wallet> getWallet(Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.getWalletForUser(institutionId));
    }

    // Recent payment activity for the "what just happened" feed on the dashboard
    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionView>> getRecentTransactions(Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.getRecentTransactionsForUser(institutionId));
    }

    // Sends WALLET2 balance out via mobile money
    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(@Valid @RequestBody WithdrawRequest req, Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(walletService.withdraw(institutionId, req));
    }

    // Downloads the institution's full activity history as a PDF or Excel
    // file - same underlying transaction list as the "Recent Activity" screen.
    @GetMapping("/activity/export")
    public ResponseEntity<byte[]> exportActivity(@RequestParam String format, Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        User institution = userRepository.findById(institutionId)
                .orElseThrow(() -> new ApiException("Institution not found", HttpStatus.NOT_FOUND));
        String name = institution.getInstitutionName() != null ? institution.getInstitutionName() : institution.getFullName();

        List<TransactionView> transactions = walletService.getRecentTransactionsForUser(institutionId);

        byte[] fileBytes;
        String filename;
        MediaType mediaType;

        if ("excel".equalsIgnoreCase(format)) {
            fileBytes = reportService.buildExcelReport(name, transactions);
            filename = "activity-report.xlsx";
            mediaType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        } else if ("pdf".equalsIgnoreCase(format)) {
            fileBytes = reportService.buildPdfReport(name, transactions);
            filename = "activity-report.pdf";
            mediaType = MediaType.APPLICATION_PDF;
        } else {
            throw new ApiException("Unsupported export format - use 'pdf' or 'excel'", HttpStatus.BAD_REQUEST);
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(fileBytes);
    }
}
