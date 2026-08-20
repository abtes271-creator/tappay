# Tap & Pay — Institution NFC Payment System

Built from the spec: admin-approved registration, mandatory credential change on
first login, mobile-money load into a personal wallet (WALLET1), institution
item dashboard, and NFC tap-to-pay that moves money from WALLET1 to the
institution's wallet (WALLET2), plus withdrawal to mobile money.

## Structure
```
tap-system/
  backend/    Spring Boot 3 (Java 17) REST API
  frontend/   React 18 + Vite SPA
```

## Backend — run it
```bash
cd backend
mvn spring-boot:run
```
Runs on `http://localhost:8080`. Uses an in-memory H2 database by default
(console at `/h2-console`) — swap the datasource block in
`application.properties` for SQL Server when you're ready for production.

Set real SMTP credentials in `application.properties` (or via environment
variables — see `.env.example`) so the admin gets an email whenever someone
registers, and so payment/reset/card-registration notifications actually send.

### Core endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Self-register as USER or INSTITUTION → PENDING |
| POST | `/api/auth/login` | Login (blocked until admin approves) |
| POST | `/api/auth/change-credentials` | Mandatory first-login credential change |
| POST | `/api/auth/forgot-password` | Request a reset link (works for ADMIN/INSTITUTION/USER) |
| POST | `/api/auth/reset-password` | Reset password with the emailed token |
| GET | `/api/admin/registrations/pending` | List accounts awaiting approval |
| POST | `/api/admin/registrations/{id}/approve` | Approve + enable account |
| POST | `/api/admin/registrations/{id}/reject` | Reject account |
| GET | `/api/admin/cards` | List all cards (registered + unregistered) |
| POST | `/api/admin/cards/add` | Manually provision a single card (CardNo, optional cardUid) |
| POST | `/api/admin/cards/upload` | Bulk-provision cards from a CSV (`CardNo`, optional `cardUid` columns) |
| GET | `/api/admin/cards/lookup?cardNo=` | Look up a card by its printed number |
| POST | `/api/admin/cards/{cardNo}/register-customer` | Create + link a customer account to an unregistered card |
| POST | `/api/admin/cards/{id}/enable` / `/disable` | Toggle a card |
| GET | `/api/wallet/balance` | Current user's WALLET1 balance |
| POST | `/api/wallet/verify-card` | Confirm a card number belongs to the logged-in user |
| POST | `/api/wallet/load` | Mobile money → WALLET1 |
| GET | `/api/wallet/transactions` | Current user's transaction history |
| GET | `/api/institution/wallet` | Institution's WALLET2 balance |
| POST | `/api/institution/withdraw` | WALLET2 → mobile money |
| GET | `/api/institution/transactions` | Institution's transaction history |
| POST | `/api/institution/items` | Add a sellable item |
| GET | `/api/items/institution/{id}` | Public item grid for the pay terminal |
| POST | `/api/payment/tap` | NFC tap: reads card, checks balance, moves WALLET1 → WALLET2 |

### Card provisioning workflow (admin panel)
1. **Add cards** — either upload a CSV with `CardNo` (required) and `cardUid`
   (optional — auto-generated if blank) columns, or add a single card manually.
   Cards start out unassigned/unregistered.
2. **Register Customer** — click the button, enter a card's printed number,
   click Find. If it exists and isn't registered yet, fill in the customer's
   name/email/phone/username/password and save — this creates their account,
   wallet, and links the card, then emails them a welcome message.
3. If the card isn't found → "Card not found". If it's already linked to
   someone → a clear "already registered" error.

### Email & SMS notifications
Notification code paths are already wired up (admin approval, payment
receipts, password reset, card registration) but **ship disabled by
default** — the placeholder credentials in `application.properties` mean
nothing is actually sent (calls log a warning instead of throwing, so the
app keeps working either way). To make them real:
- Copy `.env.example` to `.env` and fill in real `MAIL_*` (Gmail app
  password) and `TWILIO_*` values, then `docker compose up --build`, **or**
- Export the same variables in your shell before `mvn spring-boot:run`.

Admins aren't self-registered, so on first startup `DataSeeder` automatically
creates one admin account (only if no ADMIN exists yet) using
`app.admin.seed.*` in `application.properties`:
```
app.admin.seed.username=admin
app.admin.seed.password=ChangeMe123!
app.admin.seed.email=admin@example.com
```
Change these before running anywhere real. The seeded admin goes through the
same mandatory change-credentials flow as everyone else on first login.

## Run everything with Docker
```bash
docker compose up --build
```
This builds and runs both services: backend on `http://localhost:8080`,
frontend on `http://localhost:5173` (nginx proxies `/api` to the backend
container). Override any backend setting via environment variables in
`docker-compose.yml` (Spring Boot maps `APP_ADMIN_SEED_PASSWORD` etc. to the
matching property automatically).

## Frontend — run it
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies `/api` to the backend.

### Pages
- `/register`, `/login`, `/change-credentials` — onboarding + mandatory credential reset
- `/forgot-password`, `/reset-password` — password reset (works for admin, institution, and user accounts)
- `/user` — balance, transaction history, and "Load Money" (verifies your card number first)
- `/admin` — approve/reject pending accounts; add cards (single or CSV bulk); "Register Customer" (find card → create account); enable/disable cards
- `/institution`, `/institution/add-item` — dashboard, item grid, transaction history, withdraw
- `/pay/:institutionId` — public tap-to-pay terminal (item select → tap → paid)

## Money flow (as specified)
1. User loads money via mobile money → **WALLET1**.
2. User taps their card at an institution's terminal for a selected item.
3. Backend reads the card UID, checks WALLET1 balance, and atomically moves the
   item price from **WALLET1 → WALLET2**, updating both wallet rows and
   recording a `Transaction`.
4. Institution sees WALLET2 update on its dashboard and can withdraw to mobile
   money whenever it wants.
