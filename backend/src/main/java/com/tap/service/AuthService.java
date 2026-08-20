package com.tap.service;

import com.tap.config.JwtUtil;
import com.tap.dto.*;
import com.tap.exception.ApiException;
import com.tap.model.*;
import com.tap.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    // How long a password-reset token stays valid before the user has to request a new one.
    private static final long RESET_TOKEN_VALID_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final MailService mailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder, JwtUtil jwtUtil, MailService mailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.mailService = mailService;
    }

    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new ApiException("Invalid username or password", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ApiException("Invalid username or password", HttpStatus.UNAUTHORIZED);
        }
        if (user.getApprovalStatus() != ApprovalStatus.APPROVED || !user.isEnabled()) {
            throw new ApiException("Your account is pending admin approval", HttpStatus.FORBIDDEN);
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());
        return new LoginResponse(token, user.getUsername(), user.getRole().name(), user.isMustChangePassword());
    }

    @Transactional
    public void changeCredentials(Long userId, ChangeCredentialsRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
            throw new ApiException("Current password is incorrect", HttpStatus.BAD_REQUEST);
        }
        if (!user.getUsername().equals(req.getNewUsername())
                && userRepository.existsByUsername(req.getNewUsername())) {
            throw new ApiException("Username already taken", HttpStatus.CONFLICT);
        }
        // Password reuse prevention: the new password must be different from the current one.
        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new ApiException("New password must be different from your current password", HttpStatus.BAD_REQUEST);
        }

        user.setUsername(req.getNewUsername());
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    /**
     * Works identically for ADMIN, INSTITUTION and USER accounts - they all
     * authenticate through the same /auth/login endpoint, so one reset flow
     * covers everyone. Always returns normally (no "account not found" leak);
     * if no matching account exists this silently no-ops.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        String identifier = req.getUsernameOrEmail().trim();

        Optional<User> maybeUser = userRepository.findByUsername(identifier);
        if (maybeUser.isEmpty()) {
            maybeUser = userRepository.findByEmail(identifier);
        }

        if (maybeUser.isEmpty()) {
            log.info("Password reset requested for unknown identifier '{}' - ignoring.", identifier);
            return;
        }

        User user = maybeUser.get();
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(RESET_TOKEN_VALID_MINUTES));
        userRepository.save(user);

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        mailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        User user = userRepository.findByResetToken(req.getToken())
                .orElseThrow(() -> new ApiException("Invalid or expired reset link", HttpStatus.BAD_REQUEST));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new ApiException("Invalid or expired reset link", HttpStatus.BAD_REQUEST);
        }
        // Password reuse prevention: the new password must be different from the previous one.
        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new ApiException("New password must be different from your previous password", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        // They've now deliberately chosen a real password, so don't force the
        // mandatory first-login change flow on top of this.
        user.setMustChangePassword(false);
        userRepository.save(user);
    }
}
