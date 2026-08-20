package com.tap.dto;

import com.tap.model.User;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class AdminView {
    private final Long id;
    private final String fullName;
    private final String email;
    private final String phone;
    private final String username;
    private final LocalDateTime createdAt;

    public AdminView(User user) {
        this.id = user.getId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.username = user.getUsername();
        this.createdAt = user.getCreatedAt();
    }
}
