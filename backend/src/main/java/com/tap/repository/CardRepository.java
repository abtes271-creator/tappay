package com.tap.repository;

import com.tap.model.Card;
import com.tap.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, Long> {
    Optional<Card> findByCardUidAndEnabledTrue(String cardUid);
    Optional<Card> findByCardUid(String cardUid);
    List<Card> findByUser(User user);
    Optional<Card> findByCardNo(String cardNo);
    boolean existsByCardNo(String cardNo);
    boolean existsByCardUid(String cardUid);
}
