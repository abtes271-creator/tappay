package com.tap.repository;

import com.tap.model.Item;
import com.tap.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {
    List<Item> findByInstitutionAndActiveTrue(User institution);
    List<Item> findByInstitutionId(Long institutionId);
    List<Item> findByInstitutionIdAndActiveTrue(Long institutionId);
}
