package com.tap.dto;

import com.tap.model.Card;
import lombok.Getter;

@Getter
public class CardLookupResponse {
    private final Long id;
    private final String cardNo;
    private final boolean registered;
    private final boolean enabled;

    public CardLookupResponse(Card card) {
        this.id = card.getId();
        this.cardNo = card.getCardNo();
        this.registered = card.isRegistered();
        this.enabled = card.isEnabled();
    }
}
