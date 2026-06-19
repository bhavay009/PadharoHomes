# PRD — Padharo Homes (Direct-Booking Platform for Independent Hosts)

**Status:** Draft v0.3 · **Owner:** Bhavay · **Date:** 2026-06-18

## 1. Overview
Owner-controlled, Airbnb-style direct-booking platform for a **single host/operator managing many units** (location-agnostic — units can be in one area or spread across multiple locations). The host accepts **zero-commission direct bookings** (deposit online + balance at property), manages availability and pricing for all units from one dashboard, and builds a repeatable guest relationship — independent of aggregators, while running **alongside** existing OTAs during transition. v1 should comfortably handle tens of units (~10–50) per host.

## 2. Goals & Non-Goals

**Goals (v1)**
- Single-host listing of many units (~10–50), in one area or across multiple locations.
- Location treated as a property attribute, with location-based search/filtering for guests.
- Direct guest bookings with online deposit (zero third-party commission).
- Centralized availability, pricing, and date-blocking across all units from one dashboard.
- No double-bookings across OTA channels.
- Capture guest data to enable repeat bookings.

**Non-Goals (v1)**
- Multi-host tenancy / open multi-host marketplace.
- Full channel-manager parity with all OTAs.
- Native mobile apps (responsive web first).
- ML-driven dynamic pricing.
- Full online payment (deposit-only in v1).

## 3. Success Metrics
- Commission saved vs OTA baseline (headline value metric).
- % of bookings that are direct (no aggregator).
- Repeat-booking rate (guests booking ≥2 times).
- Occupancy rate across units.
- Deposit → completed-stay conversion.
- Double-booking incidents (target: 0).
- Balance-collection rate.

## 4. Personas
- **Host/Admin** — one owner/operator managing many units (~10–50), in one area or across locations; lists units, sets pricing, blocks dates, confirms bookings, reconciles balances, manages OTA calendar sync.
- **Guest** — browses the host's branded site, filters by location/dates, checks availability, pays a deposit to book, pays balance on arrival.

## 5. Functional Requirements

### 5.1 Host / Admin
- Auth (email/phone OTP).
- Listing management: photos, description, amenities, capacity, location, house rules.
- Pricing: base rate, weekend/seasonal overrides, min-stay, deposit % per unit.
- Availability: unified multi-unit calendar across all units; block/unblock; two-way iCal sync with Airbnb/MMT/Booking (V1.1).
- Bookings: view/confirm/cancel; see deposit paid + balance due; mark balance collected; no-show handling.
- Dashboard at scale: search/filter units by location, name, and status; group/filter calendar and bookings by location; light bulk actions (e.g. bulk price/block) for managing many units.
- Dashboard metrics: bookings, occupancy, revenue, commission saved, outstanding balances.
- Guest CRM (lightweight): profiles + stay history; repeat-guest discount codes (V1.1).

### 5.2 Guest
- Browse host's branded storefront across all their units.
- Search/filter by location, dates, guests, price.
- Property detail: photos, amenities, pricing, deposit + balance breakdown, cancellation policy.
- Booking flow: dates → cost breakdown (deposit now / balance at property) → guest details → pay deposit → confirmation.
- Confirmation + check-in info via email (MVP).
- Manage/cancel booking per policy.

### 5.3 Platform / Cross-cutting
- Payment gateway for deposit (Razorpay/Stripe).
- Cancellation/refund engine with deposit-forfeit rules.
- Email notifications (MVP); WhatsApp (V1.1).
- Booking state machine: `pending → deposit_paid → confirmed → checked_in → completed`, plus `cancelled` / `no_show` (deposit forfeit) / `balance_due`.
- Concurrency-safe availability lock to prevent double-booking (incl. across synced OTA calendars).

## 6. Key User Flows
1. **List unit:** sign up → add property → price + deposit % + availability → publish.
2. **Guest books:** browse → dates → see deposit/balance split → pay deposit → confirmed (email).
3. **Arrival:** host checks in guest → marks balance collected → `completed`.
4. **No-show:** host marks no-show → deposit forfeited per policy → dates released.
5. **OTA safety (V1.1):** external booking on Airbnb → iCal sync blocks those dates on Padharo automatically.

## 7. High-Level Architecture (indicative)
- Responsive web app (host dashboard + guest storefront).
- Backend API + relational DB (listings, availability, bookings, guests).
- Integrations: payment gateway (deposit), email, iCal sync (V1.1), WhatsApp (V1.1).
- Concurrency-safe availability service to prevent double-booking.

## 8. Phasing
- **MVP:** single-host listings at scale (many units, location-agnostic), location-based guest search/filter, unified availability/calendar + date-blocking, guest booking with online deposit, balance-at-property tracking, email confirmations, host dashboard with unit search/filter + outstanding balances, cancellation/no-show rules.
- **V1.1:** two-way iCal/OTA sync, WhatsApp comms, guest CRM + repeat-discount codes, branded micro-site polish.
- **V2:** multi-host groups, reviews/trust layer, rule-based dynamic pricing, full payment option, deeper channel management.

## 9. Risks & Mitigations
- **No-show / unpaid balance** → deposit forfeit + clear policy at booking.
- **Double-booking across OTAs** → iCal sync prioritized to V1.1 + availability locks.
- **Guest trust w/o aggregator brand** → visible refund policy, verified photos, reviews (V2).
- **Cold-start demand** → host drives own traffic; branded micro-site + repeat-guest engine.
- **Deposit reconciliation errors** → explicit "balance collected" host action + audit trail.
- **Managing many units gets unwieldy** → dashboard search/filter by location/status + light bulk actions; performance-aware calendar.
