package com.tap.dto;

import com.tap.model.User;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Safe, editable view of a User for the admin "Update Existing User (by ID)"
 * screen. Unlike UserLookupResponse (which is USER-only and scoped to the
 * "link card" flow), this works for USER, INSTITUTION and ADMIN accounts
 * alike, and is returned both when fetching the account and after saving
 * changes to it. Never exposes the password hash.
 */
@Getter
public class AdminUserProfileView {
    private final Long id;
    private final String fullName;
    private final String email;
    private final String phone;
    private final String username;
    private final String role;
    private final String institutionName;
    private final boolean enabled;
    private final String approvalStatus;
    private final LocalDateTime createdAt;

    public AdminUserProfileView(User user) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.username = user.getUsername();
        this.role = user.getRole().name();
        this.institutionName = user.getInstitutionName();
        this.enabled = user.isEnabled();
        this.approvalStatus = user.getApprovalStatus().name();
        this.createdAt = user.getCreatedAt();
    }
}
