package com.tap.repository;

import com.tap.model.User;
import com.tap.model.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {
    Optional<Wallet> findByOwner(User owner);
    Optional<Wallet> findByOwnerId(Long ownerId);
}
