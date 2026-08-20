const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('tap_token');
}

// Session expiry (security): the backend rejects every authenticated
// request with a 401 once the JWT is missing, tampered with, or past its
// expiration time (see app.jwt.expiration-ms on the backend). This handler
// is the single place that reacts to that 401 - it wipes the stale session
// out of localStorage and sends the user back to the login screen with a
// clear reason, instead of leaving them on a broken authenticated page or
// showing a raw "Request failed (401)" error.
//
// Only fires for calls that were actually sent WITH a token (auth !== false)
// - a plain wrong-password 401 from the public /auth/login endpoint must
// keep behaving like a normal form error, not trigger a "session expired"
// redirect loop.
function handleSessionExpiry(res, wasAuthedRequest) {
  if (res.status === 401 && wasAuthedRequest) {
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
    return true;
  }
  return false;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    if (handleSessionExpiry(res, auth)) {
      throw new Error('Your session has expired. Please log in again.');
    }
    const message = (data && (data.error || Object.values(data)[0])) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// Same as request(), but sends a FormData body (no JSON Content-Type header -
// the browser sets the correct multipart boundary itself).
async function requestMultipart(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    if (handleSessionExpiry(res, true)) {
      throw new Error('Your session has expired. Please log in again.');
    }
    const message = (data && (data.error || Object.values(data)[0])) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const authApi = {
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  changeCredentials: (payload) => request('/auth/change-credentials', { method: 'POST', body: payload }),
  // Works for ADMIN, INSTITUTION and USER accounts alike - one flow for everyone.
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: payload, auth: false }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),
};

export const walletApi = {
  getBalance: () => request('/wallet/balance'),
  verifyCard: (payload) => request('/wallet/verify-card', { method: 'POST', body: payload }),
  loadMoney: (payload) => request('/wallet/load', { method: 'POST', body: payload }),
  getTransactions: () => request('/wallet/transactions'),
  withdraw: (payload) => request('/wallet/withdraw', { method: 'POST', body: payload }),
};

export const adminApi = {
  listCards: () => request('/admin/cards'),
  // Card provisioning: add a single card, or bulk-add via CSV/Excel (CardNo, cardUid columns)
  addCard: (payload) => request('/admin/cards/add', { method: 'POST', body: payload }),
  // Works for .csv, .xlsx and .xls - the backend picks the right parser from the filename.
  uploadCardsFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestMultipart('/admin/cards/upload', formData);
  },
  // "Register customer" button: find card by CardNo, then link a new customer account to it
  lookupCard: (cardNo) => request(`/admin/cards/lookup?cardNo=${encodeURIComponent(cardNo)}`),
  registerCustomer: (cardNo, payload) =>
    request(`/admin/cards/${encodeURIComponent(cardNo)}/register-customer`, { method: 'POST', body: payload }),
  // Bulk "Register customer": institution sends a CSV/Excel of their
  // customers (CardNo, FullName, Email required; Phone, Username, Password
  // optional) and every row is registered + linked in one upload.
  uploadCustomersFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestMultipart('/admin/customers/upload', formData);
  },
  // "Update Existing User" screen: search accounts (USER/INSTITUTION/ADMIN) by
  // username/name/email, optionally filtered by role, then pick one from the results.
  searchUsers: (query, role) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (role) params.set('role', role);
    const qs = params.toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  // "Update Existing User" screen: fetch any account (USER/INSTITUTION/ADMIN) by ID and save edits to it.
  getUserProfile: (userId) => request(`/admin/users/${encodeURIComponent(userId)}/profile`),
  updateUserProfile: (userId, payload) =>
    request(`/admin/users/${encodeURIComponent(userId)}/profile`, { method: 'PUT', body: payload }),
  enableCard: (cardId) => request(`/admin/cards/${cardId}/enable`, { method: 'POST' }),
  disableCard: (cardId) => request(`/admin/cards/${cardId}/disable`, { method: 'POST' }),
  // Permanent deletions - the UI confirms with the admin before calling these.
  deleteCard: (cardId) => request(`/admin/cards/${cardId}`, { method: 'DELETE' }),
  deleteCustomer: (userId) => request(`/admin/customers/${userId}`, { method: 'DELETE' }),
  deleteInstitution: (userId) => request(`/admin/institutions/${userId}`, { method: 'DELETE' }),
  // Sub-admin management - restricted server-side to existing admins only.
  listAdmins: () => request('/admin/admins'),
  createAdmin: (payload) => request('/admin/admins', { method: 'POST', body: payload }),
  // All Registered Customers - full profile (account + card + wallet balance)
  registeredCustomers: () => request('/admin/customers'),
  // Institutions - created directly by an admin, no public self-registration.
  createInstitution: (payload) => request('/admin/institutions', { method: 'POST', body: payload }),
  institutions: () => request('/admin/institutions'),
};

export const institutionApi = {
  getWallet: () => request('/institution/wallet'),
  getTransactions: () => request('/institution/transactions'),
  withdraw: (payload) => request('/institution/withdraw', { method: 'POST', body: payload }),
  addItem: (payload) => request('/institution/items', { method: 'POST', body: payload }),
  myItems: () => request('/institution/items'),
  getItem: (itemId) => request(`/institution/items/${itemId}`),
  updateItem: (itemId, payload) => request(`/institution/items/${itemId}`, { method: 'PUT', body: payload }),
  deactivateItem: (itemId) => request(`/institution/items/${itemId}`, { method: 'DELETE' }),
  // Activity report export - triggers a browser download of the generated file.
  exportActivityReport: (format) => downloadFile(`/institution/activity/export?format=${format}`, `activity-report.${format === 'excel' ? 'xlsx' : 'pdf'}`),
};

// Fetches a binary file (PDF/Excel) from an authenticated endpoint and
// triggers a normal browser download, since <a href> can't attach the
// Authorization header itself.
async function downloadFile(path, filename) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = (data && (data.error || Object.values(data)[0])) || message;
    } catch {
      // Response wasn't JSON - fall back to the generic message above.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const paymentApi = {
  itemsForInstitution: (institutionId) => request(`/items/institution/${institutionId}`, { auth: false }),
  // Step 1 of the page-specific NFC flow: the instant a card is tapped, look
  // it up and get the customer's name back - no money moves yet.
  lookupCard: (cardUid) => request('/payment/lookup', { method: 'POST', body: { cardUid }, auth: false }),
  // Step 2: seller taps Confirm Payment - itemIds: one or more selected items, charged together.
  tapToPay: (payload) => request('/payment/tap', { method: 'POST', body: payload, auth: false }),
};

export function saveSession({ token, username, role }) {
  localStorage.setItem('tap_token', token);
  localStorage.setItem('tap_username', username);
  localStorage.setItem('tap_role', role);
}

export function clearSession() {
  localStorage.removeItem('tap_token');
  localStorage.removeItem('tap_username');
  localStorage.removeItem('tap_role');
}

export function getSession() {
  return {
    token: getToken(),
    username: localStorage.getItem('tap_username'),
    role: localStorage.getItem('tap_role'),
  };
}

// Decodes the JWT payload client-side just to read the userId claim for
// building links (e.g. the institution's public tap-to-pay terminal URL).
// This does NOT verify the signature - the backend is the source of truth.
export function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

// Reads the token's standard "exp" claim (seconds since epoch) and returns
// it in milliseconds, for the auto-logout timer in SessionWatcher. Like
// getUserIdFromToken above, this is read-only client-side info for UX -
// it does NOT verify the signature, the backend remains the real gatekeeper
// on every request regardless of what this returns.
export function getTokenExpiryMs() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
