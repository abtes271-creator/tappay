package com.tap.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends all app email notifications through Resend's HTTPS API
 * (https://api.resend.com/emails) instead of connecting directly to an SMTP
 * server. This matters because most PaaS hosts (Render included) block
 * outbound SMTP ports (587/465) to prevent spam abuse, so a JavaMailSender/
 * Gmail SMTP setup that works fine on a local machine will time out and
 * silently fail once deployed. Resend's API runs over normal HTTPS (443),
 * which is never blocked.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final URI RESEND_ENDPOINT = URI.create("https://api.resend.com/emails");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.admin.notification-email}")
    private String adminEmail;

    @Value("${app.mail.resend-api-key:}")
    private String resendApiKey;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String fromAddress;

    /**
     * Fails loudly and immediately at startup if RESEND_API_KEY was never
     * set - this is the #1 cause of "email notifications aren't working":
     * the app boots fine and every send is silently caught and logged, so
     * nothing visibly breaks until someone notices no email ever arrives.
     * Surface it clearly instead.
     */
    @PostConstruct
    void checkMailConfig() {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("=====================================================================");
            log.warn(" EMAIL IS NOT CONFIGURED - notifications will silently fail to send.");
            log.warn(" Set the RESEND_API_KEY environment variable (from resend.com/api-keys).");
            log.warn(" See .env.example for setup instructions.");
            log.warn("=====================================================================");
        } else {
            log.info("Mail sender configured via Resend, sending as {}", fromAddress);
        }
    }

    @Async
    public void notifyAdminOfNewRegistration(String fullName, String username, String role) {
        String text = "A new " + role + " account is awaiting approval.\n\n"
                + "Name: " + fullName + "\n"
                + "Username: " + username + "\n\n"
                + "Please log in to the admin console to approve or reject this request.";
        send(adminEmail, "New registration awaiting approval", text, "Admin notification");
    }

    @Async
    public void notifyUserOfApproval(String toEmail, boolean approved) {
        String subject = approved ? "Your account has been approved" : "Your registration was rejected";
        String text = approved
                ? "Good news! Your account has been approved. You can now log in."
                : "Unfortunately your registration request was rejected by the admin.";
        send(toEmail, subject, text, "User notification");
    }

    /**
     * Sent to the user whose WALLET1 balance just went down from a tap-to-pay purchase.
     */
    @Async
    public void notifyUserOfPaymentDecrease(String toEmail, String userName, String itemName,
                                            BigDecimal amount, String institutionName, BigDecimal newBalance) {
        if (isBlank(toEmail)) {
            log.warn("Cannot email payment notice - user has no email on file.");
            return;
        }
        String text = "Hi " + userName + ",\n\n"
                + "Your wallet was charged " + amount + " for " + itemName + " at " + institutionName + ".\n"
                + "Your remaining balance is " + newBalance + ".\n\n"
                + "If you didn't authorize this, contact support immediately.";
        send(toEmail, "Payment sent: " + amount + " to " + institutionName, text, "Payment decrease");
    }

    /**
     * Sent to the admin every time a tap-to-pay purchase moves money out of a user's wallet.
     */
    @Async
    public void notifyAdminOfPayment(String userName, String itemName, BigDecimal amount, String institutionName) {
        String text = "A payment was just processed.\n\n"
                + "User: " + userName + "\n"
                + "Item: " + itemName + "\n"
                + "Amount: " + amount + "\n"
                + "Institution: " + institutionName;
        send(adminEmail, "Payment processed: " + amount + " (" + institutionName + ")", text, "Admin payment notification");
    }

    /**
     * Sent to ADMIN, INSTITUTION or USER accounts alike when they request a
     * password reset. The reset link points at the SPA's /reset-password
     * route with the raw token as a query param; the frontend posts it back
     * to /api/auth/reset-password.
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String resetLink) {
        if (isBlank(toEmail)) {
            log.warn("Cannot email password reset link - account has no email on file.");
            return;
        }
        String text = "Hi " + (fullName != null ? fullName : "there") + ",\n\n"
                + "We received a request to reset your password.\n\n"
                + "Reset link (valid for 30 minutes): " + resetLink + "\n\n"
                + "If you didn't request this, you can safely ignore this email - "
                + "your password will remain unchanged.";
        send(toEmail, "Reset your Tap & Pay password", text, "Password reset");
    }

    /**
     * Sent to a customer the moment an admin registers them against a
     * physical card via the admin panel's "Register customer" flow (single
     * or bulk). Includes the password the admin/institution set for them,
     * since that's now the only place it's ever surfaced - the admin UI
     * itself never displays it. The customer is forced to change it on
     * first login regardless.
     */
    @Async
    public void notifyCustomerCardRegistered(String toEmail, String fullName, String username, String cardNo, String password) {
        if (isBlank(toEmail)) {
            log.warn("Cannot email card registration welcome - customer has no email on file.");
            return;
        }
        String text = "Hi " + fullName + ",\n\n"
                + "Your card (" + cardNo + ") has been registered and your account is ready to use.\n\n"
                + "Username: " + username + "\n"
                + "Temporary password: " + password + "\n\n"
                + "Log in and you'll be asked to set a new password before your first use. "
                + "You can then load money onto your card and start tapping to pay.";
        send(toEmail, "Your Tap & Pay card is ready", text, "Card registration welcome");
    }

    /**
     * Same welcome email, without a password line - used when a card is
     * linked to an account that already existed (linkCardToExistingUser),
     * so there's no new/temporary password to disclose.
     */
    @Async
    public void notifyCustomerCardRegistered(String toEmail, String fullName, String username, String cardNo) {
        if (isBlank(toEmail)) {
            log.warn("Cannot email card registration welcome - customer has no email on file.");
            return;
        }
        String text = "Hi " + fullName + ",\n\n"
                + "Your card (" + cardNo + ") has been registered and your account is ready to use.\n\n"
                + "Username: " + username + "\n\n"
                + "Log in and you'll be asked to set a new password before your first use. "
                + "You can then load money onto your card and start tapping to pay.";
        send(toEmail, "Your Tap & Pay card is ready", text, "Card registration welcome");
    }

    /**
     * Shared send path for every notification above. Builds the JSON body
     * Resend's API expects and posts it with the API key as a Bearer token.
     * Never throws - a failed email must never block the business action
     * (registration, payment, password reset) that triggered it; every
     * outcome is logged loudly instead so it's easy to check in Render's
     * Logs tab.
     */
    private void send(String toEmail, String subject, String text, String label) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("Cannot send '{}' email to {} - RESEND_API_KEY is not configured.", label, toEmail);
            return;
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("from", fromAddress);
            body.put("to", List.of(toEmail));
            body.put("subject", subject);
            body.put("text", text);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(RESEND_ENDPOINT)
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("{} email sent to {}", label, toEmail);
            } else {
                log.error("Failed to send {} email to {}: Resend returned HTTP {} - {}",
                        label, toEmail, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("Failed to send {} email to {}: {}", label, toEmail, e.toString(), e);
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}