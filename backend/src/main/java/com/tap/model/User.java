package com.tap.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_user", uniqueConstraints = {
        @UniqueConstraint(columnNames = "username"),
        @UniqueConstraint(columnNames = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private Role role;

    // Forces the "change credentials" mandatory flow on first login
    private boolean mustChangePassword = true;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    private boolean enabled = false;

    // Only relevant when role == INSTITUTION
    private String institutionName;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime approvedAt;

    // --- Forgot-password flow (works for ADMIN, INSTITUTION and USER alike) ---
    @Column(unique = true)
    private String resetToken;

    private LocalDateTime resetTokenExpiry;
}
