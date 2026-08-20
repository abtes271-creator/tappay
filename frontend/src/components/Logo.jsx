import React from 'react';

/**
 * ipay brand mark - a contactless "tap" glyph plus wordmark. Used on every
 * screen (auth pages, top nav, payment terminal) so the product identity is
 * consistent everywhere.
 *
 * size controls the icon's pixel size; the wordmark scales to match.
 * withWord=false renders the icon only (e.g. a favicon-style badge).
 */
export default function Logo({ size = 32, withWord = true, className = '' }) {
  return (
    <span className={`ipay-logo ${className}`} style={{ '--logo-size': `${size}px` }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="ipay-logo-mark"
      >
        <defs>
          <linearGradient id="ipayGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#17c9a8" />
            <stop offset="100%" stopColor="#084e49" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#ipayGrad)" />
        {/* Contactless / tap-to-pay waves */}
        <path
          d="M17 30V18a4 4 0 1 1 8 0v9"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25 30v-6a4 4 0 1 1 8 0v3"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <circle cx="21" cy="30" r="2.6" fill="#f0d6a0" />
      </svg>
      {withWord && (
        <span className="ipay-logo-word" style={{ fontSize: size * 0.62 }}>
          c<span className="ipay-logo-accent">pay</span>
        </span>
      )}
    </span>
  );
}
