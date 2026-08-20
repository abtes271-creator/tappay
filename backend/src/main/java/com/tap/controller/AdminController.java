package com.tap.controller;

import com.tap.dto.*;
import com.tap.model.User;
import com.tap.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/cards")
    public ResponseEntity<List<CardAdminView>> listCards() {
        return ResponseEntity.ok(adminService.getAllCards());
    }

    // Manually add a single unassigned card: both cardNo and cardUid are required.
    @PostMapping("/cards/add")
    public ResponseEntity<?> addCard(@Valid @RequestBody AddCardRequest req) {
        return ResponseEntity.ok(adminService.addCard(req));
    }

    // Bulk-add cards from a CSV or Excel (.xlsx/.xls) file with "CardNo" and
    // "cardUid" columns - both required. multipart/form-data, field name "file".
    @PostMapping(value = "/cards/upload", consumes = "multipart/form-data")
    public ResponseEntity<CsvCardUploadResult> uploadCards(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminService.uploadCards(file));
    }

    // Step 1 of "Register customer": look up a card by its printed CardNo.
    @GetMapping("/cards/lookup")
    public ResponseEntity<CardLookupResponse> lookupCard(@RequestParam String cardNo) {
        return ResponseEntity.ok(adminService.findCardByCardNo(cardNo));
    }

    // Step 2: card was found and is unregistered - create the customer
    // account and link it to the card.
    @PostMapping("/cards/{cardNo}/register-customer")
    public ResponseEntity<?> registerCustomer(@PathVariable String cardNo,
                                               @Valid @RequestBody RegisterCustomerToCardRequest req) {
        User user = adminService.registerCustomerToCard(cardNo, req);
        return ResponseEntity.ok(Map.of(
                "message", "Customer registered and linked to card " + cardNo,
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    // "Link to existing user" flow: look an account up by its user ID before linking a card to it.
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserLookupResponse> findUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(adminService.findUserById(userId));
    }

    // Link an unregistered card directly to an existing customer account by user ID
    // (as opposed to /register-customer, which creates a brand-new account).
    @PostMapping("/cards/{cardNo}/link-user")
    public ResponseEntity<?> linkCardToUser(@PathVariable String cardNo,
                                             @Valid @RequestBody LinkCardToUserRequest req) {
        User user = adminService.linkCardToExistingUser(cardNo, req);
        return ResponseEntity.ok(Map.of(
                "message", "Card " + cardNo + " linked to user #" + user.getId(),
                "userId", user.getId(),
                "username", user.getUsername()
        ));
    }

    @PostMapping("/cards/{cardId}/enable")
    public ResponseEntity<?> enableCard(@PathVariable Long cardId) {
        adminService.setCardEnabled(cardId, true);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cards/{cardId}/disable")
    public ResponseEntity<?> disableCard(@PathVariable Long cardId) {
        adminService.setCardEnabled(cardId, false);
        return ResponseEntity.ok().build();
    }

    // Permanent deletion - the frontend confirms with the admin before calling this.
    @DeleteMapping("/cards/{cardId}")
    public ResponseEntity<?> deleteCard(@PathVariable Long cardId) {
        adminService.deleteCard(cardId);
        return ResponseEntity.ok(Map.of("message", "Card deleted"));
    }

    // Bulk customer + card registration: an institution hands the admin a CSV
    // or Excel (.xlsx/.xls) file with one row per customer - "CardNo",
    // "FullName", "Email", "Phone", "Username" and "Password" columns are ALL
    // required, nothing is auto-generated. Each row creates a new customer
    // account and links it to that card, same as the single-customer
    // "Register Customer" flow, but for the whole batch at once. The
    // password is only ever sent to the customer by email, never returned
    // in the response. multipart/form-data, field name "file".
    @PostMapping(value = "/customers/upload", consumes = "multipart/form-data")
    public ResponseEntity<CustomerCardUploadResult> uploadCustomerCards(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminService.uploadCustomerCards(file));
    }

    // ---- Search existing users by username/name/email (optionally filtered by role) ----
    // Backs the "Update Existing User" picker - lets the admin search by
    // username instead of needing to already know a raw numeric user ID.

    @GetMapping("/users")
    public ResponseEntity<List<UserSearchView>> searchUsers(@RequestParam(required = false) String query,
                                                              @RequestParam(required = false) String role) {
        return ResponseEntity.ok(adminService.searchUsers(query, role));
    }

    // ---- Update existing user profile by ID (works for USER, INSTITUTION and ADMIN) ----

    @GetMapping("/users/{userId}/profile")
    public ResponseEntity<AdminUserProfileView> getUserProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(adminService.getUserProfile(userId));
    }

    @PutMapping("/users/{userId}/profile")
    public ResponseEntity<AdminUserProfileView> updateUserProfile(@PathVariable Long userId,
                                                                    @Valid @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(adminService.updateUserProfile(userId, req));
    }

    // ---- Sub-admin management ----
    // This whole controller is already restricted to ADMIN role only (see
    // SecurityConfig: /api/admin/** requires ROLE_ADMIN), so only an existing
    // admin can ever reach these - there is no public path to create an admin.

    @GetMapping("/admins")
    public ResponseEntity<List<AdminView>> listAdmins() {
        return ResponseEntity.ok(adminService.listAdmins());
    }

    @PostMapping("/admins")
    public ResponseEntity<?> createAdmin(@Valid @RequestBody CreateAdminRequest req) {
        User admin = adminService.createSubAdmin(req);
        return ResponseEntity.ok(Map.of(
                "message", "Admin account created",
                "userId", admin.getId(),
                "username", admin.getUsername()
        ));
    }

    // ---- All Registered Customers (full profile: account + card + wallet) ----

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerProfileView>> registeredCustomers() {
        return ResponseEntity.ok(adminService.getRegisteredCustomers());
    }

    // Permanent deletion of a customer account - the frontend confirms with the admin before calling this.
    @DeleteMapping("/customers/{userId}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long userId) {
        adminService.deleteCustomer(userId);
        return ResponseEntity.ok(Map.of("message", "Customer account deleted"));
    }

    // ---- Institutions: created directly by an admin, no public self-registration ----

    @PostMapping("/institutions")
    public ResponseEntity<?> createInstitution(@Valid @RequestBody CreateInstitutionRequest req) {
        User institution = adminService.createInstitution(req);
        return ResponseEntity.ok(Map.of(
                "message", "Institution account created",
                "userId", institution.getId(),
                "username", institution.getUsername()
        ));
    }

    @GetMapping("/institutions")
    public ResponseEntity<List<InstitutionProfileView>> institutions() {
        return ResponseEntity.ok(adminService.getInstitutions());
    }

    // Permanent deletion of an institution account - the frontend confirms with the admin before calling this.
    @DeleteMapping("/institutions/{userId}")
    public ResponseEntity<?> deleteInstitution(@PathVariable Long userId) {
        adminService.deleteInstitution(userId);
        return ResponseEntity.ok(Map.of("message", "Institution account deleted"));
    }
}
