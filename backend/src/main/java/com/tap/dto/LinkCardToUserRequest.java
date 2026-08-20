package com.tap.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LinkCardToUserRequest {

    @NotNull
    private Long userId;
}
