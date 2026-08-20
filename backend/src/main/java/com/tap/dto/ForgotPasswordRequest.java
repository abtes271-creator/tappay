package com.tap.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {

    // Accepts either a username or an email - works the same for ADMIN,
    // INSTITUTION and USER accounts since they all log in through /auth/login.
    @NotBlank
    private String usernameOrEmail;
}
