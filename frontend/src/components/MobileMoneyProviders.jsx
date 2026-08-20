import React from 'react';

export const MOBILE_MONEY_PROVIDERS = ['Telebirr', 'CBE Birr', 'HelloCash', 'M-Pesa', 'Other'];

/**
 * Renders the mobile money providers as their own clean, clearly-visible
 * section - a labeled group of selectable options rather than a plain
 * <select> buried inline with unrelated fields.
 */
export default function MobileMoneyProviders({ value, onChange }) {
  return (
    <div className="provider-section">
      <label className="provider-section-label">Mobile money provider</label>
      <div className="provider-list" role="radiogroup" aria-label="Mobile money provider">
        {MOBILE_MONEY_PROVIDERS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={value === p}
            className={`provider-option ${value === p ? 'selected' : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
