package com.tap.dto;

import com.tap.model.Card;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Safe view of a Card for the admin cards list — deliberately excludes the
 * full User entity (which carries passwordHash) and only exposes what the
 * admin panel needs to display and act on. userId/username/fullName are
 * null until a customer has been registered to the card.
 */
@Getter
public class CardAdminView {
    private final Long id;
    private final String cardNo;
    private final boolean enabled;
    private final boolean registered;
    private final LocalDateTime registeredAt;
    private final Long userId;
    private final String username;
    private final String fullName;

    public CardAdminView(Card card) {
        this.id = card.getId();
        this.cardNo = card.getCardNo();
        this.enabled = card.isEnabled();
        this.registered = card.isRegistered();
        this.registeredAt = card.getRegisteredAt();
        this.userId = card.getUser() != null ? card.getUser().getId() : null;
        this.username = card.getUser() != null ? card.getUser().getUsername() : null;
        this.fullName = card.getUser() != null ? card.getUser().getFullName() : null;
    }
}
