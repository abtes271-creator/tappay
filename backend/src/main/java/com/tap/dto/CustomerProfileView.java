package com.tap.dto;

import com.tap.model.Card;
import com.tap.model.User;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Complete customer profile for the admin "All Registered Customers" page -
 * combines the User account, their linked card (if any), and their WALLET1
 * balance into a single safe view (never exposes passwordHash).
 */
@Getter
public class CustomerProfileView {
    private final Long id;
    private final String fullName;
    private final String email;
    private final String phone;
    private final String username;
    private final boolean enabled;
    private final LocalDateTime createdAt;

    private final String cardNo;
    private final boolean cardEnabled;

    private final BigDecimal walletBalance;

    public CustomerProfileView(User user, Card card, BigDecimal walletBalance) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.username = user.getUsername();
        this.enabled = user.isEnabled();
        this.createdAt = user.getCreatedAt();
        this.cardNo = card != null ? card.getCardNo() : null;
        this.cardEnabled = card != null && card.isEnabled();
        this.walletBalance = walletBalance != null ? walletBalance : BigDecimal.ZERO;
    }
}
