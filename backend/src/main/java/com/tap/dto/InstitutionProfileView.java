package com.tap.dto;

import com.tap.model.User;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
public class InstitutionProfileView {
    private final Long id;
    private final String institutionName;
    private final String fullName;
    private final String email;
    private final String phone;
    private final String username;
    private final boolean enabled;
    private final LocalDateTime createdAt;
    private final BigDecimal walletBalance;

    public InstitutionProfileView(User user, BigDecimal walletBalance) {
        this.id = user.getId();
        this.institutionName = user.getInstitutionName();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.username = user.getUsername();
        this.enabled = user.isEnabled();
        this.createdAt = user.getCreatedAt();
        this.walletBalance = walletBalance != null ? walletBalance : BigDecimal.ZERO;
    }
}
