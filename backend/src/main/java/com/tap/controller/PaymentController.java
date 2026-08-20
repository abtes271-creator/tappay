package com.tap.controller;

import com.tap.dto.TapCardLookupRequest;
import com.tap.dto.TapCardLookupResponse;
import com.tap.dto.TapPaymentRequest;
import com.tap.dto.TapPaymentResponse;
import com.tap.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Hit by the terminal the instant a physical card is tapped, before any
    // items are charged - reads the card, validates it, and returns the
    // customer's name so the seller can show a Confirm Payment step.
    @PostMapping("/lookup")
    public ResponseEntity<TapCardLookupResponse> lookup(@Valid @RequestBody TapCardLookupRequest req) {
        return ResponseEntity.ok(paymentService.lookupCard(req.getCardUid()));
    }

    // Hit once the seller taps Confirm Payment after a successful lookup.
    @PostMapping("/tap")
    public ResponseEntity<TapPaymentResponse> tap(@Valid @RequestBody TapPaymentRequest req) {
        return ResponseEntity.ok(paymentService.tapToPay(req));
    }
}
