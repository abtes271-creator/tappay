package com.tap.dto;

import com.tap.model.User;
import lombok.Getter;

/**
 * Result row for the admin "Update Existing User" search-by-username picker
 * (GET /api/admin/users?query=...&role=...). Deliberately includes the id
 * (the frontend still needs it to fetch/save the full profile) but the admin
 * UI itself does not render the id column - it's kept out of the visible list.
 */
@Getter
public class UserSearchView {
    private final Long id;
    private final String fullName;
    private final String username;
    private final String email;
    private final String phone;
    private final String role;
    private final boolean enabled;
    private final String approvalStatus;

    public UserSearchView(User user) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.role = user.getRole().name();
        this.enabled = user.isEnabled();
        this.approvalStatus = user.getApprovalStatus().name();
    }
}
