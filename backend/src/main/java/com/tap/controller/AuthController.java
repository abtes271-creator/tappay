package com.tap.controller;

import com.tap.dto.*;
import com.tap.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Self-registration is disabled - only administrators can create accounts
    // (see AdminController's /admin/cards/{cardNo}/register-customer and
    // /admin/institutions).
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    // Mandatory "change credentials" step enforced right after first login
    @PostMapping("/change-credentials")
    public ResponseEntity<Map<String, String>> changeCredentials(@Valid @RequestBody ChangeCredentialsRequest req,
                                                                   Authentication authentication) {
        Long userId = (Long) authentication.getCredentials();
        authService.changeCredentials(userId, req);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    // Works for ADMIN, INSTITUTION and USER accounts alike. Always returns the
    // same generic message so this endpoint can't be used to probe which
    // usernames/emails exist in the system.
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok(Map.of(
                "message", "If an account matches that username or email, a reset link has been sent."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }
}
