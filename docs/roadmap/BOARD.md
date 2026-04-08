# Task Board

> **How to use:** Claim a service below, write your name on tasks, check boxes when done.
> Scan `←` deps to find what's available — all listed deps must be `[x]` before you start.

## Service Ownership

| Service | Owner |
|---------|-------|
| Identity | ___ |
| Market | ___ |
| Guide-Booking + Map | ___ |
| AI (Python) | ___ |

---

## Legend

```
[ ] **ID** Task Name · Size · ← deps ·
                        S/M/L   task IDs
```

- `←` _no deps_ = start immediately
- `[x]` = done
- Sizes: **S** = small, **M** = medium, **L** = large

---

## Layer 0 — Foundation

- [x] **T01** Repo Scaffold + Shared Pkgs · L · ← _no deps_
- [x] **T02** AI Service Scaffold · M · ← _no deps_
- [ ] **T02a** Arabic Embedding Validation Spike · S · ← _no deps_
- [x] **T03** Market Schema Design · S · ← _no deps_
- [x] **T04** Guide + Map Schema Design · S · ← _no deps_
- [x] **F00** Move Frontend into Monorepo · S · ← T01

## Layer 1 — Core Services

- [x] **T05** Identity: Auth Core · M · ← T01
- [x] **T06** Market: Core CRUD · M · ← T01, T03
- [x] **T07** Guide-Booking: Attractions · M · ← T01, T04
- [ ] **T08** RAG: Ingestion Pipeline · M · ← T02, T02a
- [x] **F01** Frontend Foundation · M · ← F00
- [ ] **F12** Error Handling + Loading States · S · ← F01
- [ ] **F14** File Upload + Image · S · ← T01, F01

## Layer 2 — Service Features

- [x] **T09** Identity: User Management · M · ← T05
- [x] **T10** Market: BizDir + Price Index · M · ← T06
- [x] **T11** Guide-Booking: Profiles + Packages · L · ← T07
- [ ] **T12** RAG: Retrieval + Chat · L · ← T08
- [x] **T20** API Gateway (Nginx) · M · ← T05
- [x] **F02** Auth Flow Integration · S · ← T05, F01
- [x] **F03** Tourism + Guides · M · ← T07, T11, F01
- [x] **F04** Market · M · ← T06, T10, F01
- [ ] **F08** AI Chatbot · S · ← T12, F01
- [x] **F11** Role Dashboard Wiring · S · ← F02

## Layer 3 — Advanced Features

- [x] **T13** Identity: Notifications + Admin · M · ← T09
- [x] **T14** Market: Listing Reviews · M · ← T10
- [x] **T15** Guide-Booking: Booking State Machine · M · ← T11
- [ ] **T16** Chat Session Management · M · ← T12
- [x] **T17** Market: Investment CRUD + EOI · M · ← T10
- [x] **F06** Guide Booking Flow · S · ← T15, F02, F03
- [x] **F07** Notifications + Wallet · S · ← T13, F02
- [x] **F13** Pagination + Performance · S · ← F01, F03

## Layer 4 — Secondary Services + Reviews

- [x] **T18** Guide-Booking: Reviews · M · ← T15
- [ ] **T19** Knowledge Base Seeding · M · ← T16
- [x] **T22** Market: Search Indexes · S · ← T17

## Layer 5 — Map, Search, Cross-Service

- [x] **T21** Map: POIs + Carpool · M · ← T18
- [ ] **T23** Arabic Quality Tuning · M · ← T19
- [x] **T24** Unified Search · M · ← T20, T22
- [x] **F05** Logistics + Map · M · ← T21, F01
- [x] **F09** Unified Search · S · ← T24, F01

## Layer 6 — Integration + Seed Data

- [x] **T25** Seed Data Scripts · M · ← T24, T21
- [x] **T26** Integration: Market · M · ← T14, T20, T22
- [x] **T27** Integration: Guide + Map · M · ← T21, T20
- [ ] **T28** AI: Semantic Search + Cross-Service · M · ← T23, T20

## Layer 7 — Admin + Polish

- [x] **T29** Admin: Cross-Service Endpoints · M · ← T25, T26, T27
- [x] **T30** Admin: Market · S · ← T26
- [x] **T31** Guide + Map: Search Indexes · S · ← T27
- [ ] **T32** AI: E2E Integration + Polish · M · ← T28
- [x] **F10** Admin Dashboards · M · ← T29, F02

## Layer 8 — Deploy + Ship

- [x] **T33** Deploy to AWS · M · ← T29, T30, T31, T32
- [x] **T34** Demo Prep + Ship · S · ← T33

---

## Phase 2 — Hackathon Improvements

> Detail in `docs/specs/06-improvements.md` · ✅ Core · ⚠️ Stretch · ❌ Post-hackathon

## Phase 2 / Core ✅

- [ ] **T35** Wallet Ledger · S · ← T29
- [ ] **T36** Employment Board (schema + API + state machine + wallet transfer) · L · ← T35, T26
- [ ] **T37** Price Alerts (schema + API + threshold cron) · M · ← T26
- [ ] **T38** Produce Listings (schema extension + API) · S · ← T26
- [x] **T39** Site Status Board (schema + API) · S · ← T27
- [ ] **T40** Guide Safety + Desert Trip (schema + ETAA + API + overdue cron) · M · ← T27
- [x] **T41** Price History Endpoint (no schema, uses existing snapshots) · S · ← T26
- [ ] **T48** Government Benefits Navigator (benefit_info records + eligibility wizard) · S · ← T29
- [x] **T49** Groundwater & Well Cost Monitor (schema + API + solar estimator) · S · ← T26
- [ ] **F15** Employment Board UI · M · ← T36
- [ ] **F16** Price Alerts + Produce Listings UI · S · ← T37, T38
- [ ] **F17** Site Status Board UI · S · ← T39
- [ ] **F18** Guide Safety UI (desert trip registration, check-in, ETAA badge) · M · ← T40
- [ ] **F19** Price Trend Charts · S · ← T41
- [ ] **F22** Benefits Navigator UI (eligibility wizard + results) · S · ← T48
- [ ] **F23** Well Cost Monitor UI (log form + monthly summary + solar estimator) · S · ← T49

## Phase 2 / Stretch ⚠️

- [ ] **T42** Artisan Market Access (schema + API + QR generation) · M · ← T26
- [ ] **T43** Heritage Early Warning (schema + API) · M · ← T27
- [ ] **T44** Skills Pipeline (schema + API) · M · ← T29
- [ ] **T45** White Desert Incident Reporting (schema + API) · S · ← T27
- [ ] **T50** Public Transport Tracker (bus routes + departures + ETA board) · M · ← T21
- [ ] **T51** Desert Emergency Dispatch (emergency resources + SOS + breadcrumbs) · M · ← T40, T21
- [ ] **T52** Solar Community Map (installer category + community POIs + static overlay) · S · ← T21, T26
- [ ] **F20** Artisan Market UI · M · ← T42
- [ ] **F21** Heritage + White Desert UI · M · ← T43, T45
- [ ] **F24** Transport Tracker UI (departure board + subscriptions) · M · ← T50
- [ ] **F25** Emergency Dispatch UI (SOS button + resource map + breadcrumb) · M · ← T51
- [ ] **F26** Solar Community Map UI (installer directory + community pins + irradiance layer) · S · ← T52

## Phase 2 / Post-Hackathon ❌

- [ ] **T46** Cold Chain & B2B Market Access · L · ← T38, T37
- [ ] **T47** Craft Knowledge Archive · L · ← T42
