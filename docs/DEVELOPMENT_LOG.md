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
_(updated as work proceeds)_

### Test results
_(pending)_
