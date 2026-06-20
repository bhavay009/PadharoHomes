# Padharo Homes — Development Log

This document records **every step** of development, phase by phase. It is updated
simultaneously as work happens. Each phase has: scope, steps taken, tests written/run,
results, and status.

> Source of truth for *what* we are building: [PRD.md](../PRD.md)

## Tech stack (locked)
- **Backend:** FastAPI (Python 3.13)
- **Frontend:** React + Vite (SPA)
- **Database:** PostgreSQL — hosted (Neon/Supabase), wired via `DATABASE_URL` env var (no hardcoded credentials)
- **ORM / migrations:** SQLAlchemy 2.x + Alembic
- **Tests:** pytest (unit + integration), smoke tests, frontend build smoke
- **Version control:** git, one branch per phase

## Working principles
- Pace is deliberately slow; one phase at a time.
- Testing after **every** phase (smoke + unit + integration as relevant) before moving on.
- **No hardcoding, no dummy/fake data, no stubs presented as real.** Anything not yet
  implemented is marked clearly as pending.
- Secrets (DB URL, API keys) live in `.env` (gitignored); `.env.example` documents the shape.

## Frontend sequencing
Vertical slices — each phase ships backend + matching React UI together.

---

## Phase plan (derived from PRD)

| Phase | Scope | Tests |
|------|-------|-------|
| 0 | Foundation & tooling: repo, git, FastAPI skeleton, Postgres wiring, config, pytest, React/Vite skeleton | app smoke, config unit, DB connectivity, frontend build smoke |
| 1 | Host auth & account: host model, email/phone OTP, sessions; login/OTP UI | OTP/token unit, auth-flow integration, smoke |
| 2 | Listings/units mgmt (at scale): unit model, CRUD + search/filter + bulk actions; dashboard UI | unit CRUD unit+integration, search/filter, smoke |
| 3 | Availability & pricing: block/unblock, weekend/seasonal overrides, min-stay, concurrency-safe locks, calendar; calendar UI | availability unit, double-booking prevention, smoke |
| 4 | Guest browsing & search: storefront API (location/date/guest/price), detail w/ live availability; storefront UI | search/filter integration, smoke |
| 5 | Booking + deposit payment: state machine, deposit gateway, balance-at-property, cancel/no-show/forfeit; booking UI | state-machine unit, booking integration, smoke |
| 6 | Host dashboard metrics & reconciliation: bookings mgmt, mark balance collected, occupancy/revenue/commission/outstanding; dashboard UI | metrics unit, reconciliation integration, smoke |
| 7 | Email notifications: confirmation + check-in emails | email unit (mocked transport), smoke |

Decisions deferred to their phase (will ask, not assume):
- Payment gateway (Razorpay vs Stripe) → Phase 5
- Email provider → Phase 7

---

## Phase 0 — Foundation & tooling

**Status:** IN PROGRESS

### Goal
A running, tested skeleton for both backend and frontend, wired to Postgres via env config,
with a working test harness — and nothing faked.

### Planned steps
1. Create repo structure (`backend/`, `frontend/`, `docs/`).
2. `git init`, create branch `phase-0-foundation`, add `.gitignore`.
3. Backend: FastAPI app, `core/config.py` (pydantic-settings), `core/database.py`
   (SQLAlchemy engine/session from `DATABASE_URL`), `/health` and `/health/db` endpoints.
4. Backend deps in `requirements.txt`; install into `backend/.venv`.
5. Alembic initialized and configured to read `DATABASE_URL` (no models yet → no migration).
6. pytest harness: app smoke test, config unit test, DB connectivity test
   (skips clearly if `DATABASE_URL` not configured — not faked).
7. Frontend: scaffold Vite React app; a page that calls `/health`.
8. Run all tests; record results below.

### Steps taken
1. Verified local tooling: Python 3.13.5, Node 25.1.0, npm 11.6.2, git 2.47.0.
   PostgreSQL/Docker not installed locally → decision: **hosted Postgres (Neon/Supabase)**
   wired via `DATABASE_URL`.
2. Created repo structure: `backend/`, `frontend/`, `docs/`.
3. `git init` on `main`, committed PRD + docs, branched `phase-0-foundation`.
4. Added `.gitignore` (ignores `.venv/`, `node_modules/`, `.env`, build artifacts).
5. Backend skeleton:
   - `backend/requirements.txt` (FastAPI, SQLAlchemy 2.x, psycopg v3, Alembic, pydantic-settings, pytest, httpx).
   - `app/core/config.py` — settings from env/.env; `DATABASE_URL` optional at import, never hardcoded.
   - `app/core/database.py` — lazy SQLAlchemy engine/session; raises `DatabaseNotConfiguredError`
     instead of silently faking a DB; `Base` declarative class for future models.
   - `app/api/health.py` — `GET /health` (liveness) and `GET /health/db` (real `SELECT 1`,
     503 if unconfigured/unreachable).
   - `app/main.py` — FastAPI app + CORS for the Vite dev origin.
   - `backend/.env.example` documents the `DATABASE_URL` shape.
6. Created `backend/.venv`, installed deps, verified imports.
7. Initialized Alembic; configured `alembic/env.py` to pull the real URL from `settings`
   and use `Base.metadata` (no credentials in `alembic.ini`). No migrations yet (no models).
8. pytest harness: `pytest.ini`, `tests/conftest.py` (TestClient fixture),
   `tests/test_health.py` (smoke + DB connectivity), `tests/test_config.py` (config unit).
9. Frontend skeleton: scaffolded Vite React app, `src/api.js` (base URL from `VITE_API_URL`),
   `src/App.jsx` shows live backend health; `frontend/.env.example` added.

### Test results
- **Backend pytest:** `5 passed` — app smoke (`/health` 200), config unit (×3),
  DB connectivity (honestly 503 "unconfigured" while no `DATABASE_URL`).
- **Frontend build smoke:** `npm run build` ✓ (17 modules, built in ~0.4s).
- **Live end-to-end smoke:** started uvicorn; `GET /health` → `{"status":"ok","env":"development"}`;
  `GET /health/db` → `503 {"status":"unconfigured"}` (correct — no DB configured yet).

### Live DB verification (carry-over closed)
- `DATABASE_URL` (Neon, `ap-southeast-1`, pooled) added to `backend/.env` (gitignored;
  scheme normalized to `postgresql+psycopg://`, keeping `sslmode=require&channel_binding=require`).
- Confirmed `.env` is git-ignored (`git check-ignore .env` → match).
- **pytest against live DB:** `5 passed in 2.88s` (real round-trip vs 0.01s offline).
- **Live `/health/db`:** `200 {"status":"ok","database":"reachable"}`.
- **Alembic connectivity:** `alembic current` connects to Neon (PostgresqlImpl), no revisions yet.

**Status:** ✅ COMPLETE — code + tests green, live DB verified.

---

## Phase 1 — Host auth & account

**Status:** ✅ COMPLETE — code + tests green, live DB verified.

### Decisions (confirmed with user, not assumed)
- **Identifier:** email only.
- **OTP delivery:** dev-mode — the OTP is real (generated, hashed, stored, verified) but, with
  no email provider yet, it is returned in the response + logged server-side in **non-production
  only**. Never returned in production. Real provider deferred to a later phase.

### Steps taken
1. Branched `phase-1-host-auth` (Phase 0 merged to `main` first).
2. Added deps: `pydantic[email]`, `PyJWT`. Generated a real `SECRET_KEY` into `backend/.env`
   (gitignored); `.env.example` documents it. Config gained JWT + OTP policy settings.
3. Models (`app/models/`): `Host` (UUID pk, unique email, is_active, timestamps) and
   `OtpCode` (email, **hashed** code, expiry, attempts, consumed_at). Stores only the hash.
4. `app/core/security.py`: cryptographic OTP generation, HMAC-SHA256 hashing keyed by
   `SECRET_KEY`, constant-time compare, JWT create/decode. Raises if `SECRET_KEY` missing.
5. `app/services/auth_service.py`: `issue_otp`, `verify_otp` (expiry + attempt-limit +
   single-use, specific error types), `get_or_create_host` (passwordless signup-on-first-login),
   email normalization (lowercase).
6. Routes (`app/api/auth.py`): `POST /auth/request-otp`, `POST /auth/verify-otp` (issues JWT),
   `GET /auth/me` (bearer-protected via `app/api/deps.py::get_current_host`).
7. Alembic: registered models in `env.py`; autogenerated + applied migration
   `create hosts and otp_codes` to Neon.
8. Frontend: `api.js` auth client + token storage; `Login.jsx` two-step email→OTP flow
   (surfaces dev code, labelled dev-only); `App.jsx` resolves `/me`, shows signed-in state + logout.

### First migration
- `alembic revision --autogenerate` → `2215ba8a9df0_create_hosts_and_otp_codes`.
- `alembic upgrade head` applied to Neon. Tables now: `alembic_version`, `hosts`, `otp_codes`.

### Test results
- **Backend pytest:** `17 passed in 7.65s`
  - Phase 0: 5 (smoke/config/db).
  - Unit (`test_security.py`): OTP length/digits, hash determinism, constant-time match/mismatch,
    JWT roundtrip, tampered-token rejection.
  - Integration (`test_auth_flow.py`, transaction-isolated against real DB): dev-OTP issued,
    full login creates host + returns token + `/me`, case-insensitive email, wrong code → 400,
    verify-without-request → 400, `/me` unauthenticated → 403, invalid token → 401.
- **Isolation check:** after the suite, `hosts`/`otp_codes` row counts = 0 (rollback works; no junk in Neon).
- **Live end-to-end smoke** (running server): request-otp → real dev code → verify-otp → JWT →
  `/me` returns the host → unauthenticated `/me` = 403; the created row was then cleaned up (hosts back to 0).
- **Frontend build smoke:** `npm run build` ✓.

### Notes / deferred
- Real email delivery of OTP → later phase (provider TBD with user).
- Rate-limiting on `request-otp` → noted for hardening (V1.1+); attempt-limit on verify is in place.

---

## Phase 2 — Listings / units management (at scale)

**Status:** ✅ COMPLETE — code + tests green, live Cloudinary upload verified.

### Decisions (confirmed with user, not assumed)
- **Photos:** real file **upload to object storage** (not URL-only).
- **Provider:** **Cloudinary**. Credentials via env (`CLOUDINARY_*`); never hardcoded.

### Steps taken
1. Branched `phase-2-listings` (Phase 1 merged to `main`).
2. Added deps: `cloudinary`, `python-multipart`. Config gained `CLOUDINARY_*` +
   `cloudinary_configured` property and `default_currency`.
3. Models (`app/models/unit.py`): `Unit` (host FK, title, description, location attrs
   [address/city(indexed)/state/country/pincode], capacity/bedrooms/bathrooms,
   amenities as JSONB, house_rules, base_price + deposit_percent [Numeric], currency,
   status enum draft/published/unlisted [indexed], timestamps) and `UnitPhoto`
   (url + Cloudinary `storage_id` + sort_order, cascade delete).
4. Schemas (`app/schemas/unit.py`): create/update (partial)/out, paginated list,
   bulk-update (requires ≥1 of status/base_price). Amenity cleaning, price/deposit validation.
5. `app/services/storage.py`: Cloudinary wrapper — uploads real bytes, returns secure URL +
   public_id; raises `StorageNotConfiguredError` (never fakes) if creds missing.
6. `app/services/unit_service.py`: host-scoped CRUD, list with city/status/text filters +
   pagination, bulk update, photo add/get/delete. Ownership enforced on every read/write.
7. Routes (`app/api/units.py`): `POST/GET /units`, `GET/PATCH/DELETE /units/{id}`,
   `POST /units/bulk`, `POST/DELETE /units/{id}/photos[/...]`. Image type/size validation
   (jpeg/png/webp, 5 MB). All host-authenticated.
8. Migration `68f5749a839f_create_units_and_unit_photos` autogenerated + applied to Neon.
9. Frontend: `api.js` unit + upload client; `Dashboard.jsx` (list, search/filter by
   q/city/status, delete), `UnitForm.jsx` (create/edit + photo upload + preview), wired into `App.jsx`.

### Test results
- **Backend pytest:** `29 passed in 32.39s` (12 new in `test_units.py`):
  create (+auth required, +price validation), get/update, delete, list filters
  (city/status/text), pagination, **cross-host isolation** (404 + absent from list),
  bulk update (status+price, +requires-a-field 422), photo upload (honest **503** while
  Cloudinary unconfigured), non-image rejected (400).
- **Isolation check:** post-suite row counts = 0 for hosts/units/unit_photos/otp_codes.
- **Frontend build smoke:** `npm run build` ✓ (no warnings).

### Live Cloudinary verification (carry-over closed)
- `CLOUDINARY_*` creds added to `backend/.env` (gitignored; `cloudinary_configured` → True).
- **`test_photo_upload` (real path):** 1 passed in 7.4s — genuine upload, real `secure_url` returned.
- **Full suite with Cloudinary on:** `29 passed in 38.9s`.
- **Live end-to-end smoke:** login → create unit → upload real PNG → Cloudinary URL returned;
  fetching that URL → **HTTP 200, content-type image/png** (asset truly stored & served);
  `DELETE /units/{id}` → 204 (removes the Cloudinary asset + rows). DB left clean.

---

## Phase 3 — Availability & pricing

**Status:** ✅ COMPLETE — code + tests green, live verified (incl. concurrency).

### Decisions (confirmed with user, not assumed)
- **Weekend = Saturday & Sunday** (Python weekday 5,6).
- **Seasonal pricing = per-unit date-range overrides.**

### Design notes
- Date ranges are **half-open** `[start, end)` everywhere (matches hotel check-in/out).
  Overlap iff `a.start < b.end and b.start < a.end`.
- Per-night price precedence: **seasonal → weekend → base**.
- **Double-booking prevention:** `reserve_block` takes a PostgreSQL row-level lock
  (`SELECT ... FOR UPDATE` on the unit) before checking + inserting, serializing concurrent
  attempts. This is the primitive Phase 5 bookings will reuse.

### Steps taken
1. Branched `phase-3-availability`.
2. Unit model gained `weekend_price` (nullable) and `min_stay_nights` (default 1);
   schemas updated (create/update/out).
3. New models (`app/models/availability.py`): `AvailabilityBlock` and `SeasonalRate`,
   both with `CHECK (end_date > start_date)`.
4. `app/services/availability_service.py`: list/create/delete blocks, `is_available`,
   and the concurrency-safe `reserve_block` (row lock + overlap check + insert).
5. `app/services/pricing_service.py`: seasonal-rate CRUD (with overlap rejection),
   `_night_price` precedence, `quote` (validates range, min-stay, availability; computes
   nightly breakdown + subtotal + deposit/balance), `calendar` (per-night available + price).
6. Routes (`app/api/availability.py`, mounted under `/units/{unit_id}`):
   blocks (GET/POST/DELETE), rates (GET/POST/DELETE), `GET availability`, `GET quote`,
   `GET calendar`. All host-authenticated + ownership-checked.
7. Migration `6366a881815a` autogenerated + applied to Neon (2 tables + 2 columns).
8. Frontend: `UnitCalendar.jsx` (block dates, seasonal rates, live quote preview), wired
   into the dashboard via a "Calendar" action; `UnitForm` now sets weekend price + min stay.

### Test results
- **Backend pytest:** `38 passed in 54s` (9 new):
  - `test_availability.py` (8): block create/list/delete, bad-range 422, **overlapping block 409**,
    availability reflects blocks, quote base/weekend + deposit math, **min-stay enforced**,
    seasonal override + **overlap 409**, calendar marks blocked days (end-exclusive).
  - `test_concurrency.py` (1): **two real threads race to reserve the same dates → exactly one
    wins, one gets conflict; exactly 1 block persisted.** Proves double-booking prevention. Rows cleaned up.
- **Isolation check:** post-suite all domain tables = 0 rows (one orphan OTP from an earlier
  live smoke was cleaned; OTPs aren't FK'd to hosts — noted for cleanup hygiene).
- **Live smoke:** block → availability=false over blocked range → Saturday quote applied the
  **weekend** price (₹1500) with deposit ₹300 / balance ₹1200. Cleaned up.
- **Frontend build smoke:** `npm run build` ✓.

---

## Phase 4 — Guest browsing & search

**Status:** ✅ COMPLETE — code + tests green, live verified.

### Decisions (confirmed with user, not assumed)
- **No dates → show all published units** (browse the whole portfolio).
- **Dates given → show only units available** for those nights (exclude blocked).
  (Phase 5 will extend the same availability check to also exclude booked dates.)

### Steps taken
1. Branched `phase-4-storefront` (Phase 3 merged to `main`).
2. `app/schemas/public.py`: `PublicUnitOut` (no host_id/status leaked) + list schema.
3. `app/services/public_service.py`: `list_published_units` (filters: city, guests≥capacity,
   min/max base_price; dates → `NOT EXISTS` overlapping-block subquery) and
   `get_published_unit` (published only).
4. `app/api/public.py` (no-auth `/public`): `GET /units` (browse/search),
   `GET /units/{id}` (detail, 404 if not published), `GET /units/{id}/availability`,
   `/quote`, `/calendar` — quote/calendar reuse the Phase 3 pricing/availability services.
   Single-date guard (both or neither).
5. No migration (no schema change).
6. Frontend: `Storefront.jsx` (browse grid + filters + detail with quote), public API client,
   and an App-level **guest/host toggle** (guests land on the storefront by default).

### Test results
- **Backend pytest:** `44 passed in 93s` (6 new in `test_public.py`):
  only-published browse (+ no host fields leaked), city/guests/price filters,
  **dates exclude blocked units** (and non-overlapping dates include them), single-date 400,
  detail 404-draft/200-published, public quote+availability (blocked → 400).
- **Live smoke (no auth):** browse → published only (draft hidden); overlapping dates → 0;
  free dates → 1. Cleaned up.
- **Frontend build smoke:** `npm run build` ✓.

---

## Phase 5 — Booking + deposit payment

**Status:** ✅ COMPLETE — code + tests green, live verified (incl. concurrency).

### Decisions (confirmed with user, not assumed)
- **Payment gateway:** mock-for-now behind a real `PaymentGateway` interface. Nothing is
  marked paid except through a gateway `confirm()`. Razorpay/Stripe adapters slot in later.
- **Deposit flow:** **hold-then-pay** — a row-locked pending booking holds the dates, then the
  deposit confirms it.

### Design notes
- **State machine:** `pending → confirmed → checked_in → completed`, plus `cancelled`,
  `no_show`, `expired`. PRD "deposit_paid" = `confirmed` + `deposit_paid_at`; "balance_due" =
  active booking with `balance_collected_at` null. (Documented in `app/models/booking.py`.)
- **Hold:** pending booking with `hold_expires_at` (default 15 min). Availability treats a
  pending hold as occupying dates only while unexpired.
- **Availability now spans blocks AND bookings:** `is_available` and the public date-filter
  exclude overlapping blocks plus active bookings (confirmed/checked_in/completed, or
  unexpired pending). `pricing_service.quote` reflects this; `price_breakdown` was split out
  so the locked booking path computes amounts without a redundant availability check.
- **Cancellation policy (v1):** deposit non-refundable — cancelling/no-show on a paid booking
  forfeits the deposit (`deposit_refunded` stays False); cancelling a pending hold just releases.

### Steps taken
1. Branched `phase-5-bookings`.
2. Models (`app/models/booking.py`): `Booking` (guest details, dates, priced amounts, status,
   hold/payment/lifecycle timestamps, `deposit_refunded`) and `Payment` (gateway, intent_id,
   amount, status). Enums + `ACTIVE_BOOKING_STATUSES`.
3. Payments package (`app/services/payments/`): `PaymentGateway` Protocol + `PaymentIntent`,
   `MockGateway` (create/confirm), `get_gateway()` factory keyed by `settings.payment_gateway`.
4. `booking_service.py`: `create_hold` (unit row-lock → price → availability → pending booking +
   intent), `pay_deposit` (gateway confirm → confirmed), `cancel`, and host transitions
   `check_in`/`complete`/`mark_no_show` with state guards.
5. `availability_service`: shared `lock_unit`, `is_available` extended to bookings;
   `pricing_service` split into `price_breakdown` + `quote`; `public_service` date-filter excludes
   active bookings too.
6. Guest routes on `/public`: `POST /units/{id}/bookings`, `GET/POST /bookings/{id}`,
   `/pay`, `/cancel`.
7. Migration `c1f663ff0223` (bookings, payments) applied to Neon.
8. Frontend: `Booking.jsx` (details → hold → pay → confirmed), wired into the storefront detail
   via "Book these dates"; public booking API client.

### Test results
- **Backend pytest:** `57 passed in 186s`:
  - `test_bookings.py` (12): hold returns pending+intent (deposit math), pay→confirmed,
    confirmed booking blocks dates in availability+browse, **active hold prevents double-booking
    (409)**, can't pay twice, cancel-pending frees dates, **cancel-confirmed forfeits deposit**,
    min-stay rejected, blocked-dates 409, get/404, full state-machine transitions + guards, no-show forfeit.
  - `test_concurrency.py` (2): the Phase 3 block race **plus** a new **two-thread booking-hold
    race → exactly one wins, one conflict; exactly 1 booking persisted.** Rows cleaned up.
- **Isolation check:** post-suite all domain tables = 0 rows.
- **Live smoke:** hold (deposit ₹600 / balance ₹2400, mock gateway) → overlapping 2nd guest 409
  → pay → confirmed (deposit_paid_at set) → those dates excluded from public browse. Cleaned up.
- **Frontend build smoke:** `npm run build` ✓ (Phase 6).

### Deferred to Phase 6
- Host-facing booking management endpoints (list bookings, check-in, complete + mark balance
  collected, no-show). The service logic + state machine are implemented and tested now; only
  the host HTTP endpoints + dashboard UI remain.

---

## Phase 6 — Host dashboard metrics & reconciliation

**Status:** ✅ COMPLETE — code + tests green, live verified.

### Decisions (confirmed with user, not assumed)
- **Commission saved** = configurable fixed % (`OTA_COMMISSION_PERCENT`, default 15) × booked revenue.
- **Revenue** shows **both** booked value and cash collected.

### Metric definitions (documented in `metrics_service.py`)
- `revenue_booked` = Σ subtotal of active bookings (confirmed/checked_in/completed).
- `cash_collected` = deposits paid (any later status) + balances marked collected.
- `outstanding_balance` = Σ balance of active bookings not yet collected.
- `commission_saved` = rate% × revenue_booked.
- `occupancy_percent` = booked nights in next N days / (published_units × N).

### Steps taken
1. Branched `phase-6-host-dashboard`.
2. Config: `OTA_COMMISSION_PERCENT` (Decimal, default 15), `OCCUPANCY_WINDOW_DAYS` (30);
   documented in `.env.example`.
3. `metrics_service.dashboard_metrics`: SQL aggregates (revenue/cash/outstanding/commission,
   bookings-by-status) + Python occupancy over the rolling window.
4. `booking_service`: `get_host_booking`, `list_host_bookings` (status/unit filters + pagination).
5. Routes (`app/api/host_bookings.py`, authenticated): `GET /bookings` (+filters),
   `GET /bookings/{id}`, `POST /bookings/{id}/{check-in|complete|no-show|cancel}`,
   `GET /dashboard/metrics`. All host-scoped (other hosts → 404). Reuses the Phase 5 state machine.
6. No migration (no schema change).
7. Frontend: `HostBookings.jsx` (metric cards + bookings table with transition actions),
   plus a Listings/Bookings tab switch in the host area.

### Test results
- **Backend pytest:** `66 passed in 284s` (9 new in `test_host_dashboard.py`):
  host lists only own bookings, status filter, check-in→complete (balance collected),
  cannot check-in pending, **cross-host 404 on view + transitions**, no-show endpoint,
  metrics (revenue/cash/outstanding/commission math; cash rises + outstanding clears on
  completion), occupancy-in-window > 0, empty-host zeros.
- **Isolation check:** post-suite all domain tables = 0 rows.
- **Live smoke:** deposit paid → revenue ₹2000 / cash ₹400 / outstanding ₹1600 /
  commission ₹300 (15%); after complete(balance) → cash ₹2000 / outstanding ₹0 /
  completed count 1. Cleaned up.
- **Frontend build smoke:** `npm run build` ✓.

---

## Phase 7 — Email notifications

**Status:** ✅ COMPLETE — code + tests green, live Resend delivery verified.

### Decisions (confirmed with user, not assumed)
- **Provider:** Resend (real), behind an `EmailSender` interface with a console/capture dev adapter.
- **Triggers:** booking confirmed (guest), check-in info (guest), host new-booking notification, cancellation (guest + host).
- **OTP:** moves to real email when Resend is configured; falls back to dev-mode (code in response) while it is not.

### Steps taken
1. Branched `phase-7-email`. Added dep `resend`. Config: `EMAIL_PROVIDER`, `RESEND_API_KEY`,
   `EMAIL_FROM` + `email_real_configured` property; documented in `.env.example`.
2. Email package (`app/services/email/`): `EmailSender` Protocol + `EmailMessage`,
   `ConsoleSender` (dev, logs + in-memory capture, `is_dev=True`), `ResendSender` (real),
   `get_sender()` factory (Resend when configured, else console).
3. `notifications.py`: `send_otp` (returns whether sent via dev sender), `notify_booking_confirmed`
   (guest + host), `notify_check_in` (guest), `notify_booking_cancelled` (guest + host).
   All sends best-effort (failures logged, never break the operation).
4. Wired into `booking_service` (pay→confirmed, check_in, cancel) and `auth.request_otp`
   (sends OTP via sender; only returns `dev_otp` when using the dev sender and not production).
5. No migration. No frontend change (emails are server-side; on-screen booking confirmation already exists).

### Test results
- **Backend pytest:** `70 passed in 219s` (4 new in `test_notifications.py`, via console capture):
  OTP email sent, booking-confirmed emails guest+host, check-in emails guest, cancellation
  emails guest+host. Existing auth tests still pass (dev_otp via console adapter).
- **Isolation check:** notification capture is in-memory and cleared per test; no DB rows persist.

### Live Resend verification (carry-over closed)
- `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` (`onboarding@resend.dev`) added to
  `backend/.env` (gitignored); `email_real_configured` → True.
- **Real send accepted by Resend** — message id `11339aae-bf45-4f5a-bf8e-d99cd9c33952` returned
  (to the Resend account address; `onboarding@resend.dev` only delivers to the account owner in test mode).
- **OTP now real:** with Resend on, `POST /auth/request-otp` returns `dev_otp: null`
  ("a code has been sent") — the code is no longer leaked in the response.
- **Test hermeticity:** added an autouse session fixture forcing the console adapter during
  tests, so the suite never sends real email even with `EMAIL_PROVIDER=resend` in `.env`.
  Full suite: `70 passed`.
