package com.tap.repository;

import com.tap.model.ApprovalStatus;
import com.tap.model.Role;
import com.tap.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByApprovalStatus(ApprovalStatus status);
    List<User> findByRole(Role role);
    Optional<User> findByResetToken(String resetToken);

    // Backs the admin "Update Existing User" search-by-username flow: matches
    // partial, case-insensitive text against username/fullName/email, with an
    // optional role filter (pass role = null to search across all roles).
    @Query("SELECT u FROM User u WHERE " +
            "(:query IS NULL OR :query = '' " +
            " OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) " +
            " OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
            " OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND (:role IS NULL OR u.role = :role) " +
            "ORDER BY u.username ASC")
    List<User> searchUsers(@Param("query") String query, @Param("role") Role role);
}
