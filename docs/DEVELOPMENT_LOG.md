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

**Status:** ✅ COMPLETE (code + tests green) — ⚠️ one pending item: live photo-upload
verification awaits Cloudinary credentials.

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

### Pending (carry-over)
- ⚠️ **Live Cloudinary upload not yet verified** — needs `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`
  in `backend/.env`. Once set, `test_photo_upload` automatically switches from the 503 assertion
  to a real upload + asset-URL assertion (with cleanup). This is the only item to fully close Phase 2.
