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
- [X] **T03** Market Schema Design · S · ← _no deps_
- [x] **T04** Guide + Map Schema Design · S · ← _no deps_
- [x] **F00** Move Frontend into Monorepo · S · ← T01

## Layer 1 — Core Services

- [X] **T05** Identity: Auth Core · M · ← T01
- [X] **T06** Market: Core CRUD · M · ← T01, T03
- [x] **T07** Guide-Booking: Attractions · M · ← T01, T04
- [ ] **T08** RAG: Ingestion Pipeline · M · ← T02, T02a
- [x] **F01** Frontend Foundation · M · ← F00
- [ ] **F12** Error Handling + Loading States · S · ← F01
- [ ] **F14** File Upload + Image · S · ← T01, F01

## Layer 2 — Service Features

- [X] **T09** Identity: User Management · M · ← T05
- [X] **T10** Market: BizDir + Price Index · M · ← T06
- [x] **T11** Guide-Booking: Profiles + Packages · L · ← T07
- [ ] **T12** RAG: Retrieval + Chat · L · ← T08
- [x] **T20** API Gateway (Nginx) · M · ← T05
- [ ] **F02** Auth Flow Integration · S · ← T05, F01
- [x] **F03** Tourism + Guides · M · ← T07, T11, F01
- [ ] **F04** Market · M · ← T06, T10, F01
- [ ] **F08** AI Chatbot · S · ← T12, F01
- [ ] **F11** Role Dashboard Wiring · S · ← F02

## Layer 3 — Advanced Features

- [ ] **T13** Identity: Notifications + Admin · M · ← T09
- [ ] **T14** Market: Listing Reviews · M · ← T10
- [ ] **T15** Guide-Booking: Booking State Machine · M · ← T11
- [ ] **T16** Chat Session Management · M · ← T12
- [ ] **T17** Market: Investment CRUD + EOI · M · ← T10
- [ ] **F06** Guide Booking Flow · S · ← T15, F02, F03
- [ ] **F07** Notifications + Wallet · S · ← T13, F02
- [ ] **F13** Pagination + Performance · S · ← F01, F03

## Layer 4 — Secondary Services + Reviews

- [ ] **T18** Guide-Booking: Reviews · M · ← T15
- [ ] **T19** Knowledge Base Seeding · M · ← T16
- [ ] **T22** Market: Search Indexes · S · ← T17

## Layer 5 — Map, Search, Cross-Service

- [ ] **T21** Map: POIs + Carpool · M · ← T18
- [ ] **T23** Arabic Quality Tuning · M · ← T19
- [ ] **T24** Unified Search · M · ← T20, T22
- [ ] **F05** Logistics + Map · M · ← T21, F01
- [ ] **F09** Unified Search · S · ← T24, F01

## Layer 6 — Integration + Seed Data

- [ ] **T25** Seed Data Scripts · M · ← T24, T21
- [ ] **T26** Integration: Market · M · ← T14, T20, T22
- [ ] **T27** Integration: Guide + Map · M · ← T21, T20
- [ ] **T28** AI: Semantic Search + Cross-Service · M · ← T23, T20

## Layer 7 — Admin + Polish

- [ ] **T29** Admin: Cross-Service Endpoints · M · ← T25, T26, T27
- [ ] **T30** Admin: Market · S · ← T26
- [ ] **T31** Guide + Map: Search Indexes · S · ← T27
- [ ] **T32** AI: E2E Integration + Polish · M · ← T28
- [ ] **F10** Admin Dashboards · M · ← T29, F02

## Layer 8 — Deploy + Ship

- [ ] **T33** Deploy to AWS · M · ← T29, T30, T31, T32
- [ ] **T34** Demo Prep + Ship · S · ← T33
