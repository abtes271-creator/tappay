package com.tap.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

// Used by the admin "Update Existing User" screen: fetch an account by ID,
// edit its editable fields, and save. Works for USER, INSTITUTION and ADMIN
// accounts alike - username/password are intentionally excluded here (those
// go through the dedicated change-credentials / reset-password flows).
@Getter
@Setter
public class UpdateUserRequest {

    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    private String email;

    // Strictly a 10-digit phone number (no spaces, dashes or country code).
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    // Only meaningful when the account being updated is an INSTITUTION.
    private String institutionName;

    // Lets an admin re-enable/disable an account from the same form.
    private Boolean enabled;
}
