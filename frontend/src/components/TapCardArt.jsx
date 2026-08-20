import React from 'react';

/**
 * Decorative floating card-stack illustration for the auth hero. Echoes the
 * same contactless-wave + gold-chip-dot motif as the Logo mark, just built
 * out into a pair of physical "tap cards" so the hero has something to look
 * at besides text. Purely decorative - aria-hidden, no interactive content.
 */
export default function TapCardArt() {
  return (
    <div className="auth-hero-art" aria-hidden="true">
      <svg
        viewBox="0 0 360 300"
        className="auth-hero-art-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cardBack" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0e2a27" />
            <stop offset="100%" stopColor="#084e49" />
          </linearGradient>
          <linearGradient id="cardFront" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17c9a8" />
            <stop offset="55%" stopColor="#0e7c74" />
            <stop offset="100%" stopColor="#084e49" />
          </linearGradient>
          <linearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f3d99a" />
            <stop offset="100%" stopColor="#cb9a3d" />
          </linearGradient>
          <radialGradient id="waveFade" cx="0" cy="0" r="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="frontCardClip">
            <rect x="0" y="0" width="266" height="164" rx="20" />
          </clipPath>
        </defs>

        {/* Back card - sits behind, rotated, mostly a silhouette */}
        <g className="art-card-back" transform="translate(96, 18) rotate(9)">
          <rect width="266" height="164" rx="20" fill="url(#cardBack)" stroke="rgba(231,195,116,0.28)" strokeWidth="1" />
          <circle cx="228" cy="34" r="22" fill="rgba(231,195,116,0.10)" />
        </g>

        {/* Front card - the "active" tapped card */}
        <g className="art-card-front" transform="translate(46, 78) rotate(-6)">
          <rect width="266" height="164" rx="20" fill="url(#cardFront)" />
          <g clipPath="url(#frontCardClip)">
            <rect width="266" height="164" fill="url(#cardFront)" />
            {/* faint diagonal sheen */}
            <rect className="art-card-sheen" x="-80" y="-40" width="90" height="260" fill="rgba(255,255,255,0.16)" transform="rotate(22)" />
          </g>
          <rect width="266" height="164" rx="20" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />

          {/* Chip */}
          <rect x="26" y="30" width="34" height="26" rx="5" fill="url(#chipGrad)" />
          <rect x="31" y="36" width="24" height="4" rx="1.5" fill="rgba(14,26,28,0.25)" />
          <rect x="31" y="43" width="24" height="4" rx="1.5" fill="rgba(14,26,28,0.25)" />
          <rect x="31" y="50" width="15" height="3.5" rx="1.5" fill="rgba(14,26,28,0.2)" />

          {/* Contactless waves, echoing the Logo mark */}
          <g transform="translate(78, 26)" stroke="#ffffff" strokeLinecap="round" fill="none">
            <path d="M0 16a10 10 0 0 1 14 0" strokeWidth="2.6" opacity="0.95" />
            <path d="M-4 20a16 16 0 0 1 22 0" strokeWidth="2.6" opacity="0.6" />
            <path d="M-8 24a22 22 0 0 1 30 0" strokeWidth="2.6" opacity="0.35" />
          </g>

          {/* Masked card number */}
          <g transform="translate(26, 96)" fill="rgba(255,255,255,0.92)">
            <circle cx="0" cy="4" r="3" /><circle cx="10" cy="4" r="3" /><circle cx="20" cy="4" r="3" /><circle cx="30" cy="4" r="3" />
            <circle cx="50" cy="4" r="3" opacity="0.7" /><circle cx="60" cy="4" r="3" opacity="0.7" /><circle cx="70" cy="4" r="3" opacity="0.7" /><circle cx="80" cy="4" r="3" opacity="0.7" />
            <circle cx="100" cy="4" r="3" opacity="0.7" /><circle cx="110" cy="4" r="3" opacity="0.7" /><circle cx="120" cy="4" r="3" opacity="0.7" /><circle cx="130" cy="4" r="3" opacity="0.7" />
            <text x="152" y="8" fontFamily="Sora, sans-serif" fontSize="13" fontWeight="700" fill="rgba(255,255,255,0.92)" letterSpacing="1">4471</text>
          </g>

          {/* Cardholder + wordmark */}
          <text x="26" y="140" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.75)" letterSpacing="0.5">CARDHOLDER</text>
          <text x="180" y="150" fontFamily="Sora, sans-serif" fontSize="16" fontWeight="800" fill="#ffffff">i<tspan fill="#f0d6a0">pay</tspan></text>
        </g>

        {/* Tap ripple rings, anchored near the top-right corner of the front card */}
        <g className="art-tap-ripples" transform="translate(268, 62)">
          <circle className="art-ripple art-ripple-1" cx="0" cy="0" r="6" fill="url(#waveFade)" />
          <circle className="art-ripple art-ripple-2" cx="0" cy="0" r="6" fill="url(#waveFade)" />
          <circle className="art-ripple art-ripple-3" cx="0" cy="0" r="6" fill="url(#waveFade)" />
        </g>
      </svg>
    </div>
  );
}
