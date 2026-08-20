import React from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': 'true',
};

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 19.4a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
      <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
    </svg>
  );
}

export function MailIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function KeyIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="14.5" r="3.6" />
      <path d="M10.6 11.9 18.5 4l1.7 1.7-1.6 1.6 1.6 1.6-2 2-1.6-1.6-2.2 2.2" />
    </svg>
  );
}

export function ShieldCheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6.3v5.4c0 4.4-2.9 7.9-7 8.8-4.1-.9-7-4.4-7-8.8V6.3L12 3.5Z" />
      <path d="m9 12.2 2.1 2.1 4-4.2" />
    </svg>
  );
}
