# Gaps and Recommendations — Hena Wadeena

> Identifies coverage gaps between the product vision and technical design, ranks modules by design urgency, defines the MVP build order, and lists open decisions and blockers.

---

## 1. Feature Coverage Assessment

**Coverage legend:**

- **Full** — detailed schema, API, service layer, and data model all exist
- **Partial** — high-level design exists but key implementation decisions are missing
- **Sketch** — named or mentioned but no meaningful design present
- **Missing** — stated in the proposal, nowhere in the architecture

| Feature                                                       | Architecture Coverage | Gap Severity   | Notes                                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Chatbot ("Imagine") — RAG Q&A**                          | Full                  | Low            | chat_service, RAG pipeline, Qdrant ingestion, system prompt, chunker — all fully specified                                                                            |
| **Tourist guide (attractions, tips, hours)**                  | Full                  | Low            | tourist_guide schema, guide-service API endpoints, seed data structure — complete                                                                                     |
| **Listings directory (accommodation, restaurants, services)** | Full                  | Low            | listings schema, ListingService, CRUD endpoints, filters, cache layer — all present                                                                                   |
| **Investment opportunity board**                              | Full                  | Low            | Investment merged into Market Service (:8002). investment_opportunities schema, interest submission, sector filters — covered                                          |
| **User registration + role-based auth**                       | Full                  | Low            | JWT + @node-rs/argon2 (Argon2id), UserRole enum (tourist, resident, student, merchant, driver, guide, investor, admin), register/login/refresh endpoints — implemented |
| **Review & rating system**                                    | Full                  | Low            | reviews schema, ReviewService with parent rating recalculation — complete                                                                                             |
| **Unified search (text + semantic)**                          | Full                  | Low            | SearchService with PostgreSQL full-text + pg_trgm and Qdrant vector search — both paths implemented                                                                   |
| **Notifications (in-app)**                                    | Full                  | Low            | notifications collection, NotificationService, unread count cache — done                                                                                              |
| **Admin moderation panel**                                    | Partial/designed      | Medium         | Admin cross-service endpoints (T29) and admin market + investment (T30) designed for MVP. Moderation queue and audit log in scope                                     |
| **Wadi Exchange (crop/product prices)**                       | Sketch                | **Critical**   | Core differentiator. No price schema, no price-update workflow, no farmer/merchant model                                                                              |
| **B2B matching (farmers <-> factories <-> merchants)**        | Sketch                | **Critical**   | Primary revenue driver. Only a B2B Enquiries endpoint exists. No deal flow, no contact model, no matching logic                                                       |
| **Wadeena Connects You (intercity bus booking)**              | Missing               | **Critical**   | Core module. Entirely absent from architecture. No bus operator schema, no trip/seat/booking model, no integration point                                              |
| **Carpooling system**                                         | Partial/designed      | Medium         | Simplified carpool (async ride board) designed for MVP (T21). Real-time WebSocket matching deferred                                                                   |
| **Verified housing for students**                             | Partial               | High           | Listings with `is_verified` flag exist. But "verified housing" implies a distinct verification workflow, landlord role, and student-specific filters — none designed  |
| **On-demand local guide booking**                             | Full                  | Low            | Guide profiles (T11), booking state machine (T15), and guide reviews (T18) fully designed for MVP                                                                     |
| **Offline capability / weak network mode**                    | Sketch                | High           | Differentiator claimed in proposal. No service worker strategy, no local cache strategy, no data sync design                                                          |
| **Mobile app**                                                | Sketch                | Medium         | React Native (Expo) listed. No mobile architecture, no API adaptation layer, no push notification integration                                                         |
| **Payment gateway (Paymob)**                                  | Deferred              | N/A            | Payment integration (Paymob/Fawry) deferred from MVP entirely                                                                                                         |
| **Subscription billing (guide/merchant plans)**               | Deferred              | N/A            | Subscription billing deferred from MVP entirely                                                                                                                        |
| **KYC document upload (investors/guides)**                    | Partial/designed      | Medium         | KYC upload and admin review queue designed for MVP (T09, T29). Verification state machine in scope                                                                    |
| **Price prediction model**                                    | Sketch                | Low (post-MVP) | No dataset, no model design. Post-MVP                                                                                                                                 |
| **Sentiment analysis on reviews**                             | Sketch                | Low (post-MVP) | Listed but not designed                                                                                                                                               |
| **Analytics / KPI dashboards**                                | Sketch                | Medium         | No metrics schema, no aggregation pipeline, no dashboard data contract                                                                                                |
| **Government/official data integration**                      | Missing               | Medium         | Integration readiness with GAFI and governorate mentioned. No integration API design, no data contract, no auth handshake                                             |
| **Email notifications**                                       | Resolved              | Low            | **RESOLVED: Resend** (`resend` npm) — transactional email for OTP + password reset. Free tier: 3k emails/month permanent. No SMTP server to manage.                  |
| **SMS / OTP verification**                                    | Deferred              | N/A            | SMS OTP deferred from MVP. Phone-based registration is post-MVP                                                                                                        |

---

## 2. Modules Needing Most Design Work

Ranked from most to least urgent. "Urgent" means it blocks other modules or is central to the product's differentiated value.

### 1. Wadi Exchange — Price Board + B2B Matching (Partially Addressed)

The MVP includes an admin-curated crop price index (T10 — Market BizDir + Price Index). Prices are read-only, updated by admin. This addresses the minimum viable unit (price reference table) without the full B2B flow.

**Remaining gaps (post-MVP):**

- Full B2B matching (offer/counter-offer, deal workflow) is deferred
- Two-sided market dynamics (farmers posting their own prices) are deferred
- Fractional ownership or land leasing is blocked on regulatory clearance

### 2. Wadeena Connects You — Intercity Transport + Carpooling (Split)

**Carpool: IN MVP (T21).** Simplified async ride board designed under Map Service. Post a trip, request to join, confirm. No real-time WebSocket matching, no payment integration.

**Bus booking: DEFERRED.** No external operators have been approached. No integration API exists. Deferred entirely from MVP.

**Remaining decisions:**

- Bus integration approach (API vs. manual operator onboarding) — post-MVP
- Real-time carpool matching (WebSocket) — post-MVP

### 3. Guide Booking + Earnings Flow (RESOLVED)

Guide booking is fully designed for MVP: guide profiles and packages (T11), booking state machine (T15), and guide reviews (T18). The booking lifecycle (request -> confirm -> complete -> review) is in scope. Payment escrow and earnings payout are deferred (payment integration is post-MVP); MVP bookings are cash-based.

### 4. Verified Housing for Students (High)

"Verified" implies trust, legal protection, and a process.

**What is unclear:**

- What makes a listing "verified"? Admin manual review? Document upload + check? On-site inspection?
- Is there a landlord role? Distinct from the existing merchant/guide roles?
- What data fields differentiate student housing from a regular accommodation listing?
- Is there a roommate-matching feature implied by the student journey?

### 5. Payment Service + Paymob Integration (DEFERRED)

Payment integration (Paymob/Fawry) is deferred entirely from MVP. All transactional features use contact-based flows (express interest, cash payment for guide bookings) in the MVP. Payment design will be completed post-MVP before any financial feature ships.

### 6. Authentication — OTP + Phone Verification (DEFERRED)

MVP auth is email + password -> JWT only. SMS OTP and Google OAuth are deferred from MVP. Phone-based registration and OTP provider selection are post-MVP decisions.

### 7. Offline Mode (Medium — if claimed)

Explicitly called out as a differentiator. Zero design exists.

**What is unclear:**

- Which content is available offline? Just tourist guide? Also prices and listings?
- Service worker strategy (cache-first? stale-while-revalidate?)
- Data sync on reconnection — conflict resolution
- This is a frontend architecture decision with backend implications (versioned API responses for offline sync)

---

## 3. MVP Build Order

The MVP build order is defined by the roadmap task DAG (T01-T34 across 8 dependency layers, plus F00-F14 frontend tasks). See `initial-roadmap/roadmap.md` for the full task graph, dependency chains, and parallelism model.

### What moved INTO MVP (compared to the original 3-phase plan)

- **Guide booking** — guide profiles + packages (T11), booking state machine (T15), guide reviews (T18)
- **KYC** — document upload and admin review queue (T09, T29)
- **Notifications** — in-app notifications + preferences (T13)
- **Reviews** — listing reviews (T14), guide reviews (T18)
- **Carpool + POIs** — simplified async carpool and POI endpoints (T21)
- **Wadi Exchange price index** — admin-curated crop prices (T10)
- **Saved items** — user favourites (T09)
- **Admin endpoints** — cross-service admin (T29), admin market + investment (T30)
- **Unified search** — PostgreSQL full-text + pg_trgm (T24)

### What is DEFERRED (post-MVP)

- Payment integration (Paymob/Fawry)
- SMS OTP verification
- Google OAuth social login
- Push notifications (FCM)
- Subscription billing
- Full B2B matching (Wadi Exchange offer/counter-offer flow)
- Mobile app (React Native)
- Offline mode (service worker + sync)
- Real-time carpool (WebSocket matching)
- Bus booking integration
- Analytics / KPI dashboard
- Elasticsearch/Meilisearch (using pg_trgm instead)

---

## 4. Technical Risks

### Risk 1: Architecture Divergence (RESOLVED)

The architecture is locked: **6 microservices (5 domain + gateway)**. Investment Service has been **eliminated** — its functionality is merged into Market Service (:8002).

| Service        | Port  | Notes                              |
| -------------- | ----- | ---------------------------------- |
| Identity       | :8001 |                                    |
| Market         | :8002 | Includes investment functionality  |
| Guide-Booking  | :8003 |                                    |
| Map            | :8004 | (was :8005)                        |
| AI             | :8005 | (was :8006)                        |
| Gateway (Nginx)| :8000 |                                    |

Each NestJS service has its own PostgreSQL database. Redis 7 Streams handles async events. Per-service DB isolation enforced from the start.

### Risk 2: Wadi Exchange Regulatory Exposure (Critical)

The platform will connect buyers and sellers of agricultural commodities and possibly facilitate land/asset transactions. **In Egypt, facilitating financial transactions without appropriate licensing from the Central Bank of Egypt (CBE) or Financial Regulatory Authority (FRA) is illegal.** If the B2B matching feature involves any money movement through the platform — even as a middleman for commissions — it requires regulatory clearance before launch. This could delay Phase 1 by months.

### Risk 3: Payment Service Underdesigned (RESOLVED by Deferral)

Payment integration (Paymob/Fawry) is deferred entirely from MVP. Guide bookings use cash payment; investment interest uses contact forms. Payment design will be completed before any financial feature ships post-MVP.

### Risk 4: Arabic Text in Search Pipeline (High)

Arabic presents specific challenges:

- PostgreSQL full-text search with pg_trgm provides trigram-based fuzzy matching that handles Arabic morphology better than simple stemming. Searching "فنادق" (hotels, plural) can return results for "فندق" (hotel, singular) via trigram similarity.
- Qdrant vector search mitigates this but only for semantic queries, not exact keyword lookups.
- The chosen embedding model (Gemini Embedding 001) handles Arabic but its performance on Egyptian dialect vs. Modern Standard Arabic requires validation. Task T02a (Arabic Embedding Validation Spike) is scheduled to validate retrieval quality early.

**If the chatbot returns poor results for Arabic queries, it destroys the primary differentiator.** T02a addresses this risk by validating embedding quality before building dependent features.

### Risk 5: LLM Cost at Scale (Medium)

The architecture uses Gemini Flash Lite 3.1 for chat responses. At 1,000 active users x 10 messages/day = 6 million tokens/day — manageable with Gemini's pricing. Cost scales linearly with usage; monitoring token consumption is required.

> Cost estimate pending actual usage data with Gemini Flash Lite 3.1 pricing.

### Risk 6: File Storage for Production (RESOLVED)

File storage uses AWS S3. Presigned URLs handle secure file access. This is the production storage backend from MVP onwards.

### Risk 7: Single-Process Architecture vs. True Microservices (RESOLVED)

The architecture is locked as microservices from the start: 6 services (5 domain + gateway), each with its own database, communicating via Redis Streams for async events and direct HTTP for sync calls. No modular monolith phase needed.

### Risk 8: No Test Coverage for Core Financial/Legal Flows (Medium)

Payment/escrow flows are deferred from MVP, reducing the immediate risk. However, KYC document verification (T09), guide booking state machine (T15), and admin review workflows (T29) require test coverage in the MVP. Testing uses Vitest + Supertest (NestJS services) and pytest (AI service).

### Risk 9: Payment / Escrow Schema Divergence (RESOLVED by Deferral)

Payment integration is deferred entirely from MVP. Guide bookings use cash payment without platform escrow. The escrow schema design will be finalized post-MVP before any payment code is written.

---

## 5. MVP Cut List

These features are in the proposal but will not be built for the initial demo. Each cut is backed by a specific reason.

| Feature                                         | Cut Rationale                                                                                                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile app (React Native)**                   | Zero code exists. Building a mobile app while also building a web app doubles the frontend surface area. The web app works on mobile browsers. Cut entirely for MVP — build after web is stable.                                        |
| **Offline mode / service worker**               | Requires significant frontend architecture work (PWA, cache manifest, sync logic). Not needed to demonstrate the product. Add after core features work reliably online.                                                                 |
| **Paymob payment processing**                   | No schema, no webhook handler, no testing infrastructure. Integrating a payment gateway under hackathon time pressure introduces security risks and bugs. Use "express interest" (contact form) for all transactional features at demo. |
| **Subscription billing (guide/merchant plans)** | Depends on payments, which is cut. Deferred to Phase 3.                                                                                                                                                                                 |
| **Carpooling real-time matching**               | Real-time WebSocket matching is deferred. MVP includes an async ride request board (T21). Cut the real-time part for MVP.                                                                                                               |
| **Bus booking integration**                     | No external operators have been approached. No integration API exists. Showing a static bus schedule with WhatsApp contact links achieves the same demo impact without integration work. Cut completely.                                |
| **SMS OTP verification**                        | SMS provider selection is an open decision. Phone-based registration not required for MVP. Deferred.                                                                                                                                    |
| **Google OAuth social login**                   | Non-trivial redirect/callback flow. MVP uses email + password -> JWT only. Deferred.                                                                                                                                                    |
| **Push notifications (FCM)**                    | In-app notifications (T13) are sufficient for MVP. Push notification integration deferred.                                                                                                                                              |
| **B2B deal flow / offer-counter-offer**         | Requires the full Wadi Exchange design which has regulatory questions attached. Cut to "price reference table + contact form" for MVP.                                                                                                  |
| **Price prediction model**                      | No training data exists yet. Cannot build ML on data that has not been collected. Cut entirely.                                                                                                                                         |
| **Sentiment analysis on reviews**               | No data, and manual reviews at MVP scale are better quality-controlled. Cut.                                                                                                                                                            |
| **Analytics / KPI dashboard**                   | Useful for partners and investors in later stages. At demo stage, show aggregate counts (total listings, total guides, etc.) from a simple stats endpoint. Cut the dedicated analytics-service.                                         |
| **Government API integrations**                 | No partnerships are established. Cannot integrate with an API that does not exist or is not accessible. Cut; add a "partner integration roadmap" slide to the demo instead.                                                             |
| **Fractional ownership / land marketplace**     | **Regulatory blocker.** Do not touch until legal clearance is obtained from CBE/FRA.                                                                                                                                                    |
| **Email digest notifications**                  | In-app notifications are sufficient for demo. Email via Resend covers transactional OTP/password-reset only. Digest emails are post-MVP.                                                                                               |
| **Wadi Exchange full two-sided market**         | Too much unknown (data source, legal status, B2B flow). Ship as a read-only price reference table curated by admin. Demonstrate the value; defer the complexity.                                                                        |

---

## Adopted Decisions

These decisions are locked and must not be re-opened during MVP development.

- **Email provider: RESOLVED — Resend** (`resend` npm) — transactional email for OTP + password reset. Free tier: 3k emails/month permanent. No SMTP server to manage.
- **API Docs:** Skipped for MVP. Zod/Swagger integration is too costly to maintain at 127+ endpoints. Will be added post-hackathon.
- **TypeScript strict mode:** DO NOT enable for MVP. Would require fixing hundreds of type errors across 35+ files. Currently using lenient TS config.
- **Monetary values:** All monetary values stored as `integer` (piasters, 1 EGP = 100 piasters). Never use float, real, or decimal. API returns piasters; frontend converts for display.
- **drizzle-zod footgun:** Never pass `createInsertSchema(table)` directly to `createZodDto()`. Always call `.extend()`, `.pick()`, or `.omit()` first to remove auto-generated fields (id, created_at, updated_at) from input DTOs.
- **Password hashing:** `@node-rs/argon2` (Argon2id) — NOT bcrypt.
- **React Router:** v7 (upgraded from v6 — non-breaking, 15% smaller bundle). Do not migrate to TanStack Router.
- **Docker images:** node:22-slim for NestJS service runtime, node:22 for build stage, python:3.12-slim for AI service.
- **Team:** 4 developers — NestJS × 3, Python/AI × 1. Service ownership: whoever starts a service, owns it through MVP.
- **Service ownership:** The developer who starts a service owns it — they are responsible for schema, API, tests, and integration.

---

## Open Decisions

These are unknowns that will force rework if building starts without answering them.

- **Wadi Exchange — pricing model (post-MVP):** MVP uses admin-curated prices (T10). Post-MVP decision: is commodity price entry crowdsourced (farmers post their own prices) or does it remain admin-curated? Entirely different data model, auth flows, and trust mechanisms depending on the answer. Owner: Product owner + legal.
- **Wadi Exchange — B2B financial transactions:** Does B2B matching involve any financial transaction through the platform? If yes, triggers PCI-DSS and Egyptian financial services regulations. If no, it is just a contact directory. Owner: Legal + business.
- **Wadi Exchange — fractional land ownership:** [TBD] The proposal's investment portal language describes per-unit participation in real estate assets, which constitutes a regulated financial product under Egyptian FRA jurisdiction. Fractional ownership requires CBE or FRA licensing. **Do not build until resolved.** Owner: Legal.
- **Payments — gateway selection:** Is Paymob the confirmed payment gateway, or is Fawry also in scope? Different API, different webhook schemas, different fee structures — choose one before writing a single line of payment code. Owner: Business + technical.
- **Payments — escrow model:** What is the escrow model for guide bookings? Hold until completion, or instant transfer? Escrow requires platform licensing as a payment intermediary in Egypt. Owner: Legal.
- **Guide Booking — dispute resolution:** Who handles disputes between tourists and guides? Determines whether a dispute resolution workflow must be built into the MVP. Owner: Business.
- **Verified Housing — verification SLA:** What is the verification SLA? Who reviews documents? If it requires on-site fieldwork, that is an ops problem, not a software problem. Must not be designed as an automated flow if manual review is needed. Owner: Operations + product.
- **Carpooling — platform liability:** Is the platform liable for carpooling trips? If yes, insurance/legal review is required before building. Owner: Legal.
- **Data Residency — Egypt requirement:** Must all data be stored in Egypt? Egyptian data protection law (PDPL, 2020) applies to personal data of Egyptian residents — requires data to remain in Egypt. Owner: Legal + DevOps.
- **Seed Data — legal usability:** Is the seed data (tourist guide, listings, investment opportunities) verified and legally usable? Publishing inaccurate prices or contact information creates liability. Owner: Operations + legal.

---

## Known Gaps

- **Wadi Exchange (full B2B)** — MVP includes admin-curated price index (T10). Full B2B matching (offer/counter-offer, deal workflow), farmer/merchant data model, and commodity category taxonomy remain undesigned. Deferred.
- **Intercity Bus Booking** — Entirely absent from architecture. No bus operator schema, no trip/seat/booking model, no integration point with external operators. Deferred.
- **Payment/Escrow** — Deferred from MVP. No payment schema, no Paymob webhook handler, no idempotency key design, no escrow state machine implementation, no refund flow.
- **Subscription Billing** — Deferred from MVP. No billing cycle design, no plan tier schema, no recurring payment integration.
- **OTP / Phone Verification** — Deferred from MVP. No OTP flow, no provider integration, no phone-based registration path.
- **Offline Mode** — Deferred from MVP. No service worker strategy, no local cache design, no data sync/conflict resolution.
- **Verified Housing** — No verification workflow, no landlord role, no student-specific listing fields, no roommate-matching consideration.
- **Analytics** — No metrics schema, no aggregation pipeline, no dashboard data contract. Deferred.
- **Government Integration** — No integration API design, no data contract, no auth handshake with GAFI or governorate systems. Deferred.
- **Mobile App** — No mobile architecture, no API adaptation layer, no push notification integration. Deferred.
- **Test Coverage** — Payment/escrow flows deferred. KYC document verification (T09), guide booking state machine (T15), and review integrity (one-review-per-user enforcement) require test coverage in MVP.
