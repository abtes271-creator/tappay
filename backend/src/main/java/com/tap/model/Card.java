package com.tap.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.tap.model.User;
import java.time.LocalDateTime;

@Entity
@Table(name = "card", uniqueConstraints = {
        @UniqueConstraint(columnNames = "card_uid"),
        @UniqueConstraint(columnNames = "card_no")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "card_no", nullable = false)
    private String cardNo;

    @Column(name = "card_uid", nullable = false)
    private String cardUid;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private boolean registered = false;

    private boolean enabled = true;

    private LocalDateTime registeredAt = LocalDateTime.now();
}