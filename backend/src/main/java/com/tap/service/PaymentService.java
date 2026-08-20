package com.tap.service;

import com.tap.dto.TapCardLookupResponse;
import com.tap.dto.TapPaymentRequest;
import com.tap.dto.TapPaymentResponse;
import com.tap.dto.TransactionView;
import com.tap.exception.ApiException;
import com.tap.model.Card;
import com.tap.model.Item;
import com.tap.model.Transaction;
import com.tap.model.Wallet;
import com.tap.repository.CardRepository;
import com.tap.repository.ItemRepository;
import com.tap.repository.WalletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final CardRepository cardRepository;
    private final ItemRepository itemRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final SmsService smsService;
    private final MailService mailService;

    public PaymentService(CardRepository cardRepository, ItemRepository itemRepository,
                          WalletRepository walletRepository, WalletService walletService,
                          SmsService smsService, MailService mailService) {
        this.cardRepository = cardRepository;
        this.itemRepository = itemRepository;
        this.walletRepository = walletRepository;
        this.walletService = walletService;
        this.smsService = smsService;
        this.mailService = mailService;
    }

    /**
     * First step of the page-specific NFC payment flow: the moment a card is
     * tapped, the terminal calls this to read the card, validate it, and
     * retrieve the customer info - before any money moves. Distinguishes
     * disabled / not-registered / unrecognized cards so the terminal can show
     * a clear, specific error and a Try Again button for each case.
     */
    public TapCardLookupResponse lookupCard(String cardUid) {
        Card card = cardRepository.findByCardUid(normalizeUid(cardUid))
                .orElseThrow(() -> new ApiException("Card not recognized. Please try again.", HttpStatus.NOT_FOUND));

        if (!card.isEnabled()) {
            throw new ApiException("This card has been disabled.", HttpStatus.BAD_REQUEST);
        }
        if (card.getUser() == null) {
            throw new ApiException("This card is not registered to a customer.", HttpStatus.BAD_REQUEST);
        }

        return new TapCardLookupResponse(card.getCardUid(), card.getUser().getFullName());
    }

    /**
     * Terminal flow: NFC reader captures the card UID, and one or more items
     * were selected via checkboxes on the institution's item grid. This
     * reads the card, checks the user's WALLET1 balance against the combined
     * basket total, and -if sufficient- moves the money to the
     * institution's WALLET2, one item at a time so each purchase still shows
     * up as its own line in the transaction history.
     */
    @Transactional
    public TapPaymentResponse tapToPay(TapPaymentRequest req) {
        Card card = cardRepository.findByCardUidAndEnabledTrue(normalizeUid(req.getCardUid()))
                .orElseThrow(() -> new ApiException("Card not recognized or disabled", HttpStatus.NOT_FOUND));

        if (card.getUser() == null) {
            throw new ApiException("Card is not yet registered to a customer", HttpStatus.BAD_REQUEST);
        }

        // The basket may list the same item id more than once - that's how a
        // quantity greater than one is represented (e.g. two Cupcakes is
        // itemIds containing that id twice). itemRepository.findAllById(...)
        // returns each distinct entity only once, so looking items up that
        // way would silently drop duplicates and make a valid multi-quantity
        // order look like a "not found" error. Resolve each id individually
        // instead, preserving duplicates and each unit's own line.
        List<Long> itemIds = req.getItemIds();
        List<Item> distinctItems = itemRepository.findAllById(
                itemIds.stream().distinct().collect(Collectors.toList()));
        java.util.Map<Long, Item> itemsById = distinctItems.stream()
                .collect(Collectors.toMap(Item::getId, item -> item));
        List<Item> items = new ArrayList<>();
        for (Long id : itemIds) {
            Item item = itemsById.get(id);
            if (item == null) {
                throw new ApiException("One or more selected items could not be found", HttpStatus.NOT_FOUND);
            }
            items.add(item);
        }
        for (Item item : items) {
            if (!item.isActive()) {
                throw new ApiException("\"" + item.getName() + "\" is no longer available", HttpStatus.BAD_REQUEST);
            }
        }

        Wallet userWallet = walletRepository.findByOwner(card.getUser())
                .orElseThrow(() -> new ApiException("User wallet not found", HttpStatus.NOT_FOUND));

        BigDecimal basketTotal = items.stream().map(Item::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Insufficient-balance check up front against the whole basket, so a
        // multi-item tap either fully succeeds or fully fails - never half-charges.
        if (userWallet.getBalance().compareTo(basketTotal) < 0) {
            throw new ApiException("Insufficient balance on card", HttpStatus.BAD_REQUEST);
        }

        List<Transaction> transactions = new ArrayList<>();
        for (Item item : items) {
            Wallet institutionWallet = walletRepository.findByOwner(item.getInstitution())
                    .orElseThrow(() -> new ApiException("Institution wallet not found", HttpStatus.NOT_FOUND));

            Transaction tx = walletService.transferForExpenditure(
                    userWallet, institutionWallet, item.getPrice(), item, card.getCardUid());
            transactions.add(tx);
        }

        String itemSummary = items.stream().map(Item::getName).collect(Collectors.joining(", "));
        String institutionName = items.get(0).getInstitution().getInstitutionName();

        smsService.sendPaymentConfirmation(
                card.getUser().getPhone(),
                items.get(0).getInstitution().getPhone(),
                itemSummary,
                basketTotal,
                institutionName);

        smsService.sendAdminPaymentAlert(
                card.getUser().getFullName(),
                itemSummary,
                basketTotal,
                institutionName);

        mailService.notifyUserOfPaymentDecrease(
                card.getUser().getEmail(),
                card.getUser().getFullName(),
                itemSummary,
                basketTotal,
                institutionName,
                userWallet.getBalance());

        mailService.notifyAdminOfPayment(
                card.getUser().getFullName(),
                itemSummary,
                basketTotal,
                institutionName);

        List<TransactionView> views = transactions.stream().map(TransactionView::new).collect(Collectors.toList());
        return new TapPaymentResponse(views, basketTotal, userWallet.getBalance());
    }

    // Card UIDs are 14-character hexadecimal strings and are always stored
    // uppercase (see AdminService). Real NFC readers (e.g. the browser's Web
    // NFC API) commonly hand back lowercase hex with byte separators, so
    // every lookup normalizes the same way before hitting the database -
    // otherwise a genuine tap on a real card would never match the record
    // an admin created for it.
    private String normalizeUid(String cardUid) {
        return cardUid == null ? "" : cardUid.trim().toUpperCase(java.util.Locale.ROOT);
    }
}
