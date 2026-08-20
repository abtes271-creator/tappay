package com.tap.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Sends SMS confirmations after a successful tap-to-pay transaction.
 *
 * Requires three env vars to actually send anything:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * If they're not set, this service logs and no-ops instead of throwing -
 * mirrors the same "don't block the transaction" pattern as MailService.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${app.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.twilio.auth-token:}")
    private String authToken;

    @Value("${app.twilio.from-number:}")
    private String fromNumber;

    @Value("${app.admin.notification-phone:}")
    private String adminPhone;

    private boolean configured = false;

    @PostConstruct
    public void init() {
        if (isBlank(accountSid) || isBlank(authToken) || isBlank(fromNumber)) {
            log.warn("Twilio credentials not set (app.twilio.account-sid / auth-token / from-number) - " +
                    "SMS notifications are disabled. Payments will still succeed without SMS.");
            configured = false;
            return;
        }
        Twilio.init(accountSid, authToken);
        configured = true;
        log.info("Twilio SMS service initialized.");
    }

    public void sendPaymentConfirmation(String customerPhone, String merchantPhone,
                                        String itemName, BigDecimal amount, String institutionName) {
        String customerText = String.format(
                "Payment confirmed: you paid %.2f for %s at %s.", amount, itemName, institutionName);
        String merchantText = String.format(
                "Payment received: %.2f for %s.", amount, itemName);

        send(customerPhone, customerText);
        send(merchantPhone, merchantText);
    }

    /**
     * Optional extra SMS to a fixed admin phone number, sent alongside every
     * payment confirmation. Set ADMIN_NOTIFICATION_PHONE to enable; leave
     * unset to skip it (same opt-in pattern as the rest of this service).
     */
    public void sendAdminPaymentAlert(String userName, String itemName, BigDecimal amount, String institutionName) {
        if (isBlank(adminPhone)) {
            log.info("[Admin SMS skipped - ADMIN_NOTIFICATION_PHONE not set]");
            return;
        }
        String text = String.format(
                "Payment alert: %s paid %.2f for %s at %s.", userName, amount, itemName, institutionName);
        send(adminPhone, text);
    }

    private void send(String toPhone, String text) {
        if (!configured) {
            log.info("[SMS skipped - not configured] to {}: {}", toPhone, text);
            return;
        }
        if (isBlank(toPhone)) {
            log.warn("Cannot send SMS - recipient has no phone number on file.");
            return;
        }
        try {
            Message.creator(new PhoneNumber(toPhone), new PhoneNumber(fromNumber), text).create();
            log.info("SMS sent to {}", toPhone);
        } catch (Exception e) {
            // Never let an SMS failure roll back or block a payment that already succeeded.
            log.error("Failed to send SMS to {}: {}", toPhone, e.toString(), e);
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}