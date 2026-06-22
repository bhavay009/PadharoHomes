# Padharo Homes — Project Summary

> A plain-English explanation of what this project is, what it does, and how it maps to the
> original product spec. Read this first, then see [PRD.md](../PRD.md) for the original
> requirements and [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) for the phase-by-phase build log.

---

## 1. What it is (in one paragraph)
**Padharo Homes** is an owner-controlled, Airbnb-style **direct-booking platform**. A single host
(or small operator) can list many properties, take bookings **directly from guests with zero
third-party commission**, manage availability and pricing from one dashboard, and build a repeat
relationship with guests. Guests browse stays, book by paying a **small deposit online** and the
**balance at the property**, and can review their stay afterwards. It is a full-stack web app,
deployed and working in production.

- **Live frontend:** https://padharo-homes.vercel.app
- **Live API:** https://padharo-api-lcz5.onrender.com
- **Repo:** https://github.com/bhavay009/PadharoHomes

---

## 2. The problem it solves (from the PRD)
Hosts on aggregators (Airbnb, MMT, Booking.com) lose **15–20% commission**, don't own the customer
relationship, and have no control over branding. Padharo Homes gives an owner a lightweight platform
to **list multiple units, take commission-free direct bookings, manage everything from one place, and
own the guest relationship.** Two roles: **Host/Admin** and **Guest**.

---

## 3. PRD → Implementation traceability
How each requirement in the PRD was delivered.

### Host / Admin features
| PRD requirement | Status | Where |
|---|---|---|
| Onboarding & auth (email/phone OTP) | ✅ | Passwordless **email *and* phone** OTP login |
| Listing management (photos, amenities, capacity, location, house rules) | ✅ | Multi-step **listing wizard** (Cloudinary photo upload) |
| Pricing (base, weekend, seasonal, min-stay, deposit %) | ✅ | Pricing step + seasonal rate engine |
| Availability (unified calendar, block/unblock) | ✅ | Availability blocks + per-unit calendar |
| Bookings (view, confirm, cancel, mark balance collected, no-show) | ✅ | Host booking management + state machine |
| Dashboard (bookings, occupancy, revenue, commission saved, outstanding) | ✅ | Host dashboard with live metrics |
| Search/filter by location & status, bulk actions | ✅ | Listing search/filter + bulk update |

### Guest features
| PRD requirement | Status | Where |
|---|---|---|
| Browse host's branded storefront | ✅ | Public storefront / listings |
| Property detail (photos, amenities, pricing, policy, live availability) | ✅ | Property detail page |
| Search/filter (location, dates, guests, price) | ✅ | Dates-aware search (excludes blocked/booked) |
| Booking flow (deposit now, balance at property) | ✅ | Hold-then-pay with live quote |
| Confirmation + manage/cancel booking | ✅ | Booking confirmation + cancel |

### Platform / cross-cutting
| PRD requirement | Status | Notes |
|---|---|---|
| Payment gateway (deposit) | ⚠️ **Mock** | Real `PaymentGateway` interface + mock adapter; Razorpay/Stripe drop-in ready |
| Cancellation / refund engine (deposit forfeit) | ✅ | v1 policy: deposit non-refundable on cancel/no-show |
| Notifications (email; WhatsApp later) | ✅ email | Email via Resend interface (console fallback); WhatsApp = future |
| Booking state machine | ✅ | `pending → confirmed → checked_in → completed` + `cancelled/no_show/expired` |
| **No double-booking** | ✅ | PostgreSQL **row-level locking**, proven with concurrent-thread tests |

### Built *beyond* the PRD MVP (PRD listed these as V2)
- ✅ **Reviews & ratings** (guest reviews a paid booking; aggregate rating on listings)
- ✅ **Admin dashboard** (platform oversight + moderation; single configurable admin)
- ✅ **Host profiles** (photo, bio, languages, response time — shown to guests)
- ✅ **Phone-number login** (in addition to email)

### Intentionally *not* in this build (matches PRD "Future")
- iCal/OTA two-way sync, WhatsApp notifications, multi-host marketplace, ML dynamic pricing.
- **Real payment processing** (mock gateway only) and **real OTP delivery in production** (see §8).

---

## 4. Architecture & tech stack
**Frontend** — React + Vite + Tailwind CSS, React Router, Framer Motion, Lucide icons.
Deployed on **Vercel**.

**Backend** — FastAPI (Python), SQLAlchemy 2.x ORM, Alembic migrations, Pydantic validation.
Deployed on **Render**.

**Database** — PostgreSQL (hosted on **Neon**).

**Integrations** — Cloudinary (image hosting, live), Resend (email interface), a mock payment
gateway behind a real interface.

```
Guest / Host (browser)
        │  HTTPS
React SPA (Vercel)  ──VITE_API_URL──►  FastAPI (Render)  ──►  PostgreSQL (Neon)
                                          │
                          Cloudinary · Resend · Payment gateway (mock)
```

---

## 5. Key engineering highlights
- **Concurrency-safe double-booking prevention** — booking holds take a Postgres `SELECT … FOR UPDATE`
  row lock; verified with real multi-threaded race tests (exactly one of two racers wins).
- **Hold-then-pay booking** — a pending booking holds the dates for a short window, then a deposit
  confirms it; availability checks span both manual blocks **and** active bookings.
- **Passwordless OTP auth** — email or phone, HMAC-hashed single-use codes, attempt limits, and
  per-identifier **rate limiting**; JWT sessions.
- **Swappable payment & email** — both sit behind clean interfaces, so Razorpay/Stripe and a real
  email/SMS provider plug in without touching business logic.
- **Role-based UX** — generic login → guest dashboard (My Trips); "Become a Host" → host dashboard;
  a single configurable admin gets the Admin dashboard.

---

## 6. Testing
- **70+ backend tests** (pytest) covering auth, listings, availability/pricing, the booking state
  machine, reviews, host dashboard metrics, and admin — including **two real concurrency race tests**.
- Integration tests run **transaction-isolated** against the real database (rolled back, leaving no junk).
- A live **end-to-end production smoke** verifies all 23 critical flows against the deployed system
  (**30/30 including admin**).

---

## 7. Data model (core entities)
`Host` (account + profile) · `Unit` (listing, ~40 fields incl. pricing/rules/safety) ·
`UnitPhoto` · `AvailabilityBlock` · `SeasonalRate` · `Booking` (+ state machine) · `Payment` ·
`Review` · `OtpCode`. Six Alembic migrations, all applied to the production database.

---

## 8. Production readiness — honest status
**Ready for:** portfolio, client demo, investor/recruiter showcase. Fully deployed and verified.

**Before taking real customers & money, complete:**
1. **Real payments** — wire Razorpay/Stripe (interface is ready; needs API keys).
2. **Real OTP delivery + `APP_ENV=production`** — currently runs in dev mode where the login code is
   returned in the API response (convenient for demos, unsafe for real users). Needs a verified email
   domain (Resend) and/or SMS provider (Twilio/MSG91).
3. **Rotate secrets** used during development; add error monitoring (e.g. Sentry).

Already done for production hardening: configurable CORS, OTP rate-limiting, **Terms & Privacy** pages.

---

## 9. Running it locally
**Backend**
```bash
cd backend
python -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill DATABASE_URL, SECRET_KEY, CLOUDINARY_*, etc.
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload --port 8000
```
**Frontend**
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000
npm run dev            # http://localhost:5173
```

---

## 10. Where to read more
- **[PRD.md](../PRD.md)** — the original product requirements.
- **[DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)** — detailed, phase-by-phase build record with test results.
