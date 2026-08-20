package com.tap.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

// Used only by the existing primary Admin to create additional admin
// (sub-admin) accounts - never exposed on a public/self-registration endpoint.
@Getter
@Setter
public class CreateAdminRequest {
    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    private String email;

    // Strictly a 10-digit phone number (no spaces, dashes or country code).
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    @NotBlank
    private String username;

    @NotBlank
    private String password;
}
