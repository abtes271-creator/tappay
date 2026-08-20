package com.tap.dto;

import com.tap.model.User;
import lombok.Getter;

/**
 * Safe view of a User for the admin "link card to existing user by ID" flow -
 * deliberately excludes the password hash and only exposes what the admin
 * panel needs to confirm it found the right person before linking a card.
 */
@Getter
public class UserLookupResponse {
    private final Long id;
    private final String fullName;
    private final String username;
    private final String email;
    private final String phone;
    private final String role;
    private final boolean enabled;
    private final boolean alreadyHasCard;

    public UserLookupResponse(User user, boolean alreadyHasCard) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.role = user.getRole().name();
        this.enabled = user.isEnabled();
        this.alreadyHasCard = alreadyHasCard;
    }
}
