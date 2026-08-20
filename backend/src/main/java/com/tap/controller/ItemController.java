package com.tap.controller;

import com.tap.dto.ItemRequest;
import com.tap.model.Item;
import com.tap.service.ItemService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    // Institution adds an item from its own dashboard ("Item name / Price / Save")
    @PostMapping("/api/institution/items")
    public ResponseEntity<Item> addItem(@Valid @RequestBody ItemRequest req, Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(itemService.addItem(institutionId, req));
    }

    @GetMapping("/api/institution/items")
    public ResponseEntity<List<Item>> myItems(Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(itemService.getItemsForInstitution(institutionId));
    }

    // Fetch a single item to pre-fill the Add/Edit Item form
    @GetMapping("/api/institution/items/{itemId}")
    public ResponseEntity<Item> getItem(@PathVariable Long itemId, Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(itemService.getItemForInstitution(institutionId, itemId));
    }

    // Institution edits an existing item from the same form used to add one
    @PutMapping("/api/institution/items/{itemId}")
    public ResponseEntity<Item> updateItem(@PathVariable Long itemId, @Valid @RequestBody ItemRequest req,
                                            Authentication authentication) {
        Long institutionId = (Long) authentication.getCredentials();
        return ResponseEntity.ok(itemService.updateItem(institutionId, itemId, req));
    }

    @DeleteMapping("/api/institution/items/{itemId}")
    public ResponseEntity<?> deactivateItem(@PathVariable Long itemId) {
        itemService.deactivateItem(itemId);
        return ResponseEntity.ok().build();
    }

    // Public read used by the payment terminal / item-selection screen for a given institution
    @GetMapping("/api/items/institution/{institutionId}")
    public ResponseEntity<List<Item>> itemsForInstitution(@PathVariable Long institutionId) {
        return ResponseEntity.ok(itemService.getItemsForInstitution(institutionId));
    }
}
