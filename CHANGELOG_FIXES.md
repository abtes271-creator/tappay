# Tap & Pay System — Fix & Enhancement Changelog

This document maps every reported issue to the specific files changed and explains the fix.

---

## 1. Phone Number & Amount Validation

**Backend** (server-side, authoritative):
- Added `@Pattern(regexp = "^[0-9]{10}$")` + `@NotBlank` to the `phone` / `phoneNumber` field on:
  - `RegisterRequest`, `RegisterCustomerToCardRequest`, `CreateAdminRequest`, `CreateInstitutionRequest`
  - `LoadMoneyRequest`, `WithdrawRequest`
- Amount fields (`LoadMoneyRequest.amount`, `WithdrawRequest.amount`, `ItemRequest.price`) already carried `@Positive` — confirmed and left as-is (rejects zero/negative values).

**Frontend** (fast feedback + defense in depth):
- Every phone input now strips non-digits and caps at 10 characters as the user types (`Register.jsx`, `AdminRegisterInstitution.jsx`, `AdminManageAdmins.jsx`, `AdminRegisterCustomer.jsx`, `AdminUpdateUser.jsx`, `InstitutionWithdraw.jsx`, `UserWallet.jsx`), and forms block submission client-side with a clear error if the phone isn't exactly 10 digits.
- Amount inputs use `min="0.01"` and are re-validated (`> 0`) before every submit (`ItemForm.jsx`, `InstitutionWithdraw.jsx`, `UserWallet.jsx`).

---

## 2. Existing User Profile Update (by ID)

This capability didn't exist at all — added end-to-end:

- **New DTOs**: `UpdateUserRequest`, `AdminUserProfileView`
- **New service methods**: `AdminService.getUserProfile(userId)`, `AdminService.updateUserProfile(userId, req)`
- **New endpoints**: `GET /api/admin/users/{userId}/profile`, `PUT /api/admin/users/{userId}/profile`
- **New frontend page**: `pages/admin/AdminUpdateUser.jsx` — enter a user ID, fetch the account (works for USER, INSTITUTION or ADMIN), edit full name / email / phone / institution name / enabled status, and save.
- Wired into the admin nav bar (`Manage → Update Existing User`) and the dashboard quick actions.

This is separate from the existing `findUserById` / "link card to existing user" flow (which stays USER-only, scoped to card-linking) — no regression there.

---

## 3. Institution Payment Flow (multi-item selection)

- **Backend**: `TapPaymentRequest.itemId` (single `Long`) → `TapPaymentRequest.itemIds` (`List<Long>`). `PaymentService.tapToPay` now validates the whole basket atomically (all-or-nothing balance check), charges each item as its own ledger `Transaction` row (so per-item history is preserved), and returns a new `TapPaymentResponse` (list of transactions + total + new balance).
- **Frontend**: `TapToPay.jsx` rewritten — the item grid is now a checklist of checkboxes with a running total, followed by a **Pay** button that moves to the tap screen with the full basket.

---

## 4. Post-Payment Navigation

- `TapToPay.jsx`: on a successful payment, the terminal no longer auto-resets back to the item/payment screen. Instead it shows explicit **🏠 Home** and **🔑 Login** buttons, so the customer/staff always leaves via a deliberate choice rather than being dropped back into another purchase.

---

## 5. Forgot Password Screen Buttons

- `ForgotPassword.jsx`: added **Save** (submits the reset-link request) and **Cancel** (returns to `/login` without submitting) buttons.

---

## 6. Pending Registrations View

Root cause: self-registration had been fully removed from the backend (`AuthController`/`AuthService` had no `/register` endpoint), even though the frontend `Register.jsx` page, the `PENDING` approval workflow, and `MailService.notifyAdminOfNewRegistration()` were all still wired up and waiting for it. Since nothing could ever create a `PENDING` account, the "Pending Registrations" feature could never show anything.

- **Restored** `AuthService.register()` + `POST /api/auth/register`: creates a `PENDING`/disabled USER or INSTITUTION account and emails the admin.
- **New frontend page**: `pages/admin/AdminPendingRegistrations.jsx` — lists every pending applicant with full contact info and **Approve** / **Reject** buttons (using the pre-existing `adminApi.approve` / `adminApi.reject`, which were implemented but never called from any UI).
- Re-added the `/register` route in `App.jsx`, and the dashboard's "Pending registrations" panel and admin nav now link to this real review screen instead of the general Customers list.

---

## 7. Unnecessary Link on Forget Password

- Confirmed `ForgotPassword.jsx` has no "Don't have an account yet?" text (it only ever lived on `Login.jsx`). Left a comment in place documenting this is intentional so it doesn't get re-added by mistake.
- Updated the equivalent text on `Login.jsx` to point at the real `/register` page now that self-registration works again.

---

## 8. Email Notifications

- `MailService` itself was already solid (async, fails loudly if unconfigured, has a dedicated `notifyAdminOfNewRegistration` method) — the actual bug was that nothing ever called it, because registration was broken (see #6). Restoring `AuthService.register()` wires this notification back up.
- No other changes needed here; `application.properties` already documents the required `MAIL_USERNAME` / `MAIL_PASSWORD` environment variables.

---

## 9. Add Card & Add Customer Flow

- Confirmed the existing sequencing is already correct and unchanged: a card must be added first (`Add Cards`), then a customer is attached to it via `Register Customer` (new customer) or `Link to existing user` (existing account, looked up by ID) — `AdminRegisterCustomer.jsx` already enforces "find card → then register/link customer" in that order. Added phone validation (see #1) to the customer-registration form in this flow.

---

## Files touched

**Backend**
- `dto/RegisterRequest.java`, `dto/RegisterCustomerToCardRequest.java`, `dto/CreateAdminRequest.java`, `dto/CreateInstitutionRequest.java`, `dto/LoadMoneyRequest.java`, `dto/WithdrawRequest.java` — phone validation
- `dto/TapPaymentRequest.java` — itemIds list
- `dto/TapPaymentResponse.java` — new
- `dto/UpdateUserRequest.java` — new
- `dto/AdminUserProfileView.java` — new
- `service/AuthService.java` — restored `register()`
- `controller/AuthController.java` — restored `POST /register`
- `service/AdminService.java` — `getUserProfile`/`updateUserProfile`
- `controller/AdminController.java` — profile endpoints
- `service/PaymentService.java`, `controller/PaymentController.java` — multi-item basket

**Frontend**
- `App.jsx` — `/register`, `/admin/pending-registrations`, `/admin/update-user` routes
- `api/api.js` — profile endpoints, itemIds payload
- `pages/Register.jsx`, `pages/Login.jsx`, `pages/ForgotPassword.jsx`
- `pages/TapToPay.jsx` — full rewrite
- `pages/ItemForm.jsx`
- `pages/AdminDashboard.jsx`, `pages/admin/navLinks.js`
- `pages/admin/AdminPendingRegistrations.jsx` — new
- `pages/admin/AdminUpdateUser.jsx` — new
- `pages/admin/AdminRegisterInstitution.jsx`, `pages/admin/AdminManageAdmins.jsx`, `pages/admin/AdminRegisterCustomer.jsx`
- `pages/institution/InstitutionWithdraw.jsx`, `pages/user/UserWallet.jsx`

## Notes on verification

- All modified/new `.jsx`/`.js` files were syntax-checked with esbuild — no errors.
- The Java backend could not be compiled in this sandbox (no access to Maven Central to resolve Spring Boot dependencies), so changes were verified by careful manual review and brace/paren balance checks instead. Please run `mvn compile` (or your usual build) before deploying.
- `frontend/node_modules` and the project's `.git` history were removed from this delivered copy to keep the archive small — run `npm install` inside `frontend/` before running the dev server.

---

## 10. Visual redesign — production-ready UI polish

The prior UI used a generic indigo-gradient "AI SaaS dashboard" look. It's been redesigned with a distinctive, cohesive identity built around the product's actual subject matter — physical NFC tap cards — rather than a templated palette.

**New design system** (`frontend/src/styles.css` design tokens):
- **Brand teal** (`#0f766e` / `#14b8a6`) replaces the old indigo/purple as the interactive color throughout — buttons, links, focus states, form fields.
- **Card gold** (`#c8952e` / `#e7c374`) is a new signature accent used sparingly, as a direct reference to the physical gold chip on an NFC card.
- **Ink-navy** dark surfaces (`#0e1a1c` / `#16262a`) are used for a small number of deliberate "premium" moments rather than everywhere.
- Migrated every hardcoded color in the stylesheet (34+ occurrences) to the new palette — no leftover indigo anywhere.

**Two signature visual elements**, tying the brand directly to how the product is actually used:
1. **The virtual wallet card** (customer home screen, `UserWallet.jsx` + new `.wallet-card` styles) — the balance is no longer a plain white panel; it's rendered as an actual bank-card visual: ink-navy body, gold chip, embossed white balance figure, cardholder name footer.
2. **The tap-to-pay terminal disc** (`TapToPay.jsx` + reworked `.tap-circle` styles) — replaced the plain dashed circle with a dark disc bordered in gold, a proper contactless-wave icon (concentric arcs + a gold dot, matching the universal NFC payment symbol), and animated gold rings that pulse outward like an actual tap.

**Production polish added across the whole app**:
- Visible `:focus-visible` outlines on every interactive element (was previously inconsistent).
- `prefers-reduced-motion` respected — all animations/transitions collapse to instant for users who've asked for reduced motion.
- A subtle brand-tinted background wash instead of flat gray.
- Verified via an isolated design-preview harness rendered with Playwright at both desktop and mobile (390px) widths, which caught and fixed a real contrast bug (the wallet card's balance was nearly invisible against its dark background before the fix — a global heading-gradient rule was bleeding through via `-webkit-text-fill-color`).
- Confirmed the full frontend still builds cleanly with `vite build` and lints clean with esbuild after every change.

No visual changes required touching most page files individually — the shared class-based system (`.card`, `.btn-primary`, `.customer-table`, `.tx-badge`, etc.) means every admin, institution, and customer screen inherits the new look automatically. Only the two signature-element pages (`UserWallet.jsx`, `TapToPay.jsx`) and `Logo.jsx` needed direct markup changes.

---

## Round 2 — Build fix, POS/NFC redesign, admin deletions, card validation, security

### 1. Backend — `NoClassDefFoundError: com.tap.dto.CardAdminView`

Root cause: `backend/target/` (compiled classes) and `frontend/node_modules/` were
committed to git. Whatever was last checked in there could shadow a fresh build
depending on the deploy/CI tooling used, which is exactly the kind of drift that
produces a `NoClassDefFoundError` for a DTO that exists in source but not in
whatever `.class`/`.jar` actually got deployed.

- Rewrote `.gitignore` (was UTF-16, no `target/`/`node_modules/` rules) to properly
  exclude `target/`, `node_modules/`, `dist/`, `.env`, `.idea/`, `*.class`.
- `git rm -r --cached backend/target frontend/node_modules` and deleted the stale
  `backend/target` directory.
- `CardAdminView` itself compiles cleanly — always do `mvn clean package` (not just
  `mvn package`) after pulling this change.

### 2. UI contrast — dashboard headings

Audited every heading/label style in `styles.css`. Reinforced `.welcome-title`
with an explicit, always-white color + subtle text-shadow so "Admin Overview" /
"Welcome Back" style headings can never inherit a dark token in any theme.

### 3. Seller POS — clickable item tiles

`TapToPay.jsx`: checkboxes + a separate "Pay" button replaced with clickable
`.item-tile` buttons — one click/tap on an item jumps straight to the payment
screen for that item. `.item-tile` CSS updated to stay high-contrast now that
it's a real `<button>`.

### 4. Page-specific NFC payment flow + removing manual UID entry

- New backend step: `POST /api/payment/lookup` (`PaymentService.lookupCard`,
  `TapCardLookupRequest`/`Response`) reads a tapped card, validates it
  (disabled / not registered / unrecognized get distinct messages), and
  returns the customer's name — no money moves yet. Added `CardRepository
  .findByCardUid`. Registered as `permitAll()` in `SecurityConfig` alongside
  `/api/payment/tap`.
- `TapToPay.jsx` payment screen now initializes `window.NDEFReader()` only
  while that screen is mounted (cleaned up on unmount/navigation) — no
  background scanning elsewhere in the app. State machine: waiting → reading
  → confirm (shows customer name + **Confirm Payment**) → charging →
  success/**error** (with **Try Again**, which resets to waiting without
  remounting the reader). Manual Card UID text input removed entirely.

### 5. Withdrawal password confirmation

- `WithdrawRequest` gained a required `password` field; `WalletService
  .withdraw()` now verifies it against the account's stored hash immediately
  before moving money (shared by both the institution and personal-wallet
  withdraw flows).
- `InstitutionWithdraw.jsx` and `UserWallet.jsx` both split into two steps:
  amount/phone form → a password-confirmation modal shown only after
  clicking Withdraw.

### 6. Hiding the physical Card UID

- `CardAdminView` and `CustomerProfileView` no longer carry `cardUid` at all
  (removed from the DTOs, not just hidden in the UI) — the "All Cards" and
  "All Registered Customers" admin pages now show only Card Number + name.

### 7. Card data validation (12 / 14 digits)

- `AddCardRequest`: `@Pattern` enforcing `cardNo` = exactly 12 digits,
  `cardUid` = exactly 14 digits. Same rules applied inside `AdminService`'s
  CSV/Excel bulk importer, and the auto-generated UID (for bulk rows that
  omit one) now produces a random 14-digit numeric string instead of a
  `UID-xxxx` hex string.
- `AdminAddCards.jsx`: numeric-only inputs capped at the right length, with
  matching client-side validation.

### 8. Admin permanent deletion

- New `AdminService.deleteCard/deleteCustomer/deleteInstitution` +
  `DELETE /api/admin/cards/{id}`, `/customers/{id}`, `/institutions/{id}`.
  Deleting a customer unlinks (not deletes) their card and removes their
  wallet + transaction history; deleting an institution deactivates its
  items and removes its wallet + transaction history.
- `AdminCardList.jsx`, `AdminCustomers.jsx`, `AdminInstitutions.jsx` each got
  a **Delete** action per row with a confirmation modal before the
  irreversible call.
