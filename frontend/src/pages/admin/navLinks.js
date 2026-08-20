// Grouped so the admin bar stays short: related pages live under one
// dropdown instead of 7 separate links crowding the header.
export const ADMIN_NAV_LINKS = [
  { key: 'home', label: 'Home', to: '/admin' },
  {
    key: 'register',
    label: 'Register',
    children: [
      { key: 'register-customer', label: 'Register Customer', to: '/admin/register-customer' },
      { key: 'register-institution', label: 'Register Institution', to: '/admin/register-institution' },
    ],
  },
  {
    key: 'cards',
    label: 'Cards',
    children: [
      { key: 'add-cards', label: 'Add Cards', to: '/admin/add-cards' },
      { key: 'card-list', label: 'Card List', to: '/admin/card-list' },
    ],
  },
  {
    key: 'manage',
    label: 'Manage',
    children: [
      { key: 'customers', label: 'Customers', to: '/admin/customers' },
      { key: 'institutions', label: 'Institutions', to: '/admin/institutions' },
      { key: 'admins', label: 'Admins', to: '/admin/admins' },
      { key: 'update-user', label: 'Update Existing User', to: '/admin/update-user' },
    ],
  },
];
