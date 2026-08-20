package com.tap.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangeCredentialsRequest {
    @NotBlank
    private String currentPassword;

    @NotBlank
    private String newUsername;

    @NotBlank
    private String newPassword;
}
