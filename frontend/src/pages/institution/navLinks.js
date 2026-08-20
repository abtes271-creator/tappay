// Each link now points at its own real route, so navigating between
// dashboard sections loads a separate page rather than jumping to an
// anchor within one long scrolling page.
export const INSTITUTION_NAV_LINKS = [
  { key: 'wallet', label: 'Wallet', to: '/institution' },
  { key: 'items', label: 'Items', to: '/institution/items' },
  { key: 'activity', label: 'Activity', to: '/institution/activity' },
  { key: 'withdraw', label: 'Withdraw', to: '/institution/withdraw' },
];
