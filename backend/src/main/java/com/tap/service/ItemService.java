package com.tap.service;

import com.tap.dto.ItemRequest;
import com.tap.exception.ApiException;
import com.tap.model.Item;
import com.tap.model.User;
import com.tap.repository.ItemRepository;
import com.tap.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ItemService {

    private final ItemRepository itemRepository;
    private final UserRepository userRepository;

    public ItemService(ItemRepository itemRepository, UserRepository userRepository) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    public Item addItem(Long institutionId, ItemRequest req) {
        User institution = userRepository.findById(institutionId)
                .orElseThrow(() -> new ApiException("Institution not found", HttpStatus.NOT_FOUND));

        Item item = new Item();
        item.setInstitution(institution);
        item.setName(req.getName());
        item.setPrice(req.getPrice());
        item.setActive(true);
        return itemRepository.save(item);
    }

    public List<Item> getItemsForInstitution(Long institutionId) {
        return itemRepository.findByInstitutionIdAndActiveTrue(institutionId);
    }

    /**
     * Fetch a single item owned by the institution - used to pre-fill the
     * "Add Item" form when it's opened in edit mode.
     */
    public Item getItemForInstitution(Long institutionId, Long itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ApiException("Item not found", HttpStatus.NOT_FOUND));
        if (!item.getInstitution().getId().equals(institutionId)) {
            throw new ApiException("Item not found", HttpStatus.NOT_FOUND);
        }
        return item;
    }

    /**
     * The same "Add Item" form can be reused to edit an existing item -
     * updates name/price in place rather than creating a new one.
     */
    public Item updateItem(Long institutionId, Long itemId, ItemRequest req) {
        Item item = getItemForInstitution(institutionId, itemId);
        item.setName(req.getName());
        item.setPrice(req.getPrice());
        return itemRepository.save(item);
    }

    public void deactivateItem(Long itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ApiException("Item not found", HttpStatus.NOT_FOUND));
        item.setActive(false);
        itemRepository.save(item);
    }
}
