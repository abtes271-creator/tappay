package com.tap.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyCardRequest {
    @NotBlank
    private String cardNo;
}
