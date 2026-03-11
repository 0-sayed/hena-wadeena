# 04 — Business Logic & User Journeys

> Defines the platform's core business rules, user journeys by role, pricing model, verification flows, market intelligence logic, and notification triggers.

---

## 1. User Journeys

### 1.1 Tourist / Visitor

**Persona:** Salma, 24, Alexandria. Needs access, accommodation, guides, and a safe experience.

1. Opens the platform (web or chatbot).
2. Browses the tourist guide: filter by area (Al-Kharga, Al-Dakhla, Al-Farafra, Baris, Balat) and attraction type (historical, natural, adventure, festival).
3. Views an attraction detail page: description, entry fee, opening hours, recommended visit duration, tips, nearby sites, and photos.
4. Searches for accommodation (listings filtered by category=accommodation, area).
5. Uses the map view to find nearby services (restaurants, transport, pharmacies).
6. **Books a tour guide:** selects a guide profile, chooses a tour package, requests a booking date and time, specifies people count.
7. Payment deferred — booking is direct acceptance by the guide.
8. Receives booking confirmation via email and in-app notification.
9. Attends the tour; booking status transitions: `pending -> confirmed -> in_progress -> completed`.
10. Writes a review (rating 1-5, comment) after the booking is marked completed.
11. The review is attached to the booking record; one review per booking is enforced at the data level (unique on `booking_id`).

**Carpooling variant:** Tourist posts or joins a carpool ride (origin, destination, departure time, seats available). Carpool is free or cash-only for MVP — no payment integration. Seat-join requests follow statuses `pending | confirmed | cancelled`.

---

### 1.2 Investor

**Persona:** Mr. Mahmoud, 45, Cairo. Needs reliable data, direct supplier access, and deal flow.

1. Registers and selects the `investor` role (requires national ID + business document — KYC).
2. Completes KYC document upload; account remains limited until admin approves.
3. Browses investment opportunities via the **Market Service** (:8002) — investment opportunities and EOIs live in the Market schema, not a standalone Investment service. Opportunities are filtered by sector (agriculture, tourism, real estate, industry, energy, technology, services), area, and investment range (min/max EGP).
4. Views opportunity detail: description, expected return percentage, payback period, infrastructure availability, incentives, contact entity (e.g., GAFI, New Valley Governorate), attached documents.
5. Submits an Expression of Interest (EOI) with an optional message, contact email/phone, and proposed investment amount.
6. EOI status transitions: `pending -> reviewed -> accepted | rejected | withdrawn` (see Section 4.3 for the resolved state machine).
7. If accepted, accesses a due diligence document room to share and review documents with the opportunity owner.
8. Receives notifications on status changes (email, in-app).
9. Can also use the Wadi Exchange (Market Service) to view crop/commodity price trends and browse the B2B business directory.

The investment module is a lead-generation and deal-flow matching tool. Final deal closure (contract signing, fund transfer) occurs off-platform. Returns and dividends are not distributed through the platform.

---

### 1.3 Student / Newcomer

The student role is architecturally distinct (requires student ID for verification) but the functional journey closely follows the tourist path:

1. Registers with `student` role; uploads student ID for verification.
2. Searches for housing (listings filtered by `accommodation` category, area=target city, verified=true).
3. Reviews listing details: amenities, price range, contact info, rating, reviews from other students.
4. Contacts provider directly (phone/WhatsApp listed in listing contact fields) — no on-platform accommodation booking flow is defined in the MVP.
5. Uses the carpooling system for commuting to/from the governorate.
6. Accesses the daily services directory (healthcare, banking, shopping, education).
7. Uses the AI chatbot ("Imagine") for natural-language queries about housing options, campus maps, and service locations.

The Student and Newcomer Hub (with moving checklist and carpooling integration) is implemented as a filtered view of shared listing and guide data, not a separate module. There are no student-specific entities beyond the `student` role flag and KYC requirement.

---

### 1.4 Local Citizen / Resident

**Role:** `resident` — same permissions as `tourist` for most services; no KYC required; can additionally suggest POIs and create real estate listings.

1. Registers without verification requirement.
2. Browses and uses all public services: maps, listings, market prices.
3. Can create listings (real estate, land, services) — listing goes to `draft` status and requires admin approval to become `active`.
4. Can suggest new Points of Interest on the map (submitted as `pending`, approved by admin).
5. Can post and join carpooling rides.
6. Receives community notifications (system broadcasts, price updates).

---

### 1.5 Guide (Tour Guide / Host)

**Role:** `guide` — requires guide license + national ID (KYC).

**Listing creation and management:**

1. Registers with `guide` role; uploads license number and ID.
2. Admin reviews and verifies the guide license (`license_verified` flag on guide profile).
3. Creates tour packages: title (AR/EN), description, duration in hours, max people, price, included items, photos.
4. Sets availability calendar by blocking specific dates.

**Booking management:**

1. Receives booking request notification (email, in-app).
2. Confirms or declines the booking; booking states are `pending | confirmed | in_progress | completed | cancelled`.
3. On booking day, status moves to `in_progress`, then `completed`.
4. Tourist may submit a review; guide can reply to the review.

> **DEFERRED — post-hackathon:** Escrow release, payout requests, and admin payout approval require payment integration and are not in the MVP scope.

---

### 1.6 Merchant / Business Owner

**Role:** `merchant` — requires commercial register (KYC).

1. Registers with `merchant` role; uploads commercial registration document.
2. Creates business directory listings and real estate/service listings.
3. Listings enter `draft` status; admin approval required to become `active`.
4. Can pin a merchant location on the map.
5. Featured listings are set via admin toggle (not payment) — `is_featured` / `featured_until` managed by admin.

> **DEFERRED — post-hackathon:** Merchant subscriptions (`merchant_featured` plan) and payouts from wallet earnings require payment integration and are not in the MVP scope.

---

### 1.7 Driver (Carpool Driver)

**Role:** `driver` — for users who primarily offer carpool rides as drivers.

1. Registers with `driver` role; no KYC requirement beyond standard registration for MVP.
2. Posts carpool ride offers: origin, destination, departure time, seats available, fare (free or cash-only).
3. Reviews and confirms seat-join requests from passengers (`pending | confirmed | cancelled`).
4. Manages active rides and marks them complete.
5. Passengers (tourist, resident, student) can request to join the driver's posted ride.

---

### 1.8 Admin

**Role:** `admin` (full control, assigned by system seed).

**Moderation:**

1. Reviews content moderation queue: unverified listings, pending POI suggestions, flagged reviews.
2. Approves or rejects listings (sets `status` from `draft` to `active` or `suspended`).
3. Approves POI submissions.
4. Bans or suspends user accounts (sets user `status` to `suspended | banned`).
5. Changes user roles.

**KYC approval:**

1. Reviews uploaded KYC documents (`user_kyc` table: doc type, URL, status `pending`).
2. Approves: sets `status=approved`, triggers `user.verified` event, sends notification to user (email + in-app via the notification service).
3. Rejects: sets `status=rejected`, records `rejection_reason`, sends notification.
4. Rejected users can re-upload.

**Investment moderation:**

1. Views all expressions of interest submitted by investors.
2. Approves opportunity listings (sets `approved_by`, `approved_at`, transitions status from `review` to `active`).

**Dispute resolution:**

Dispute resolution and "clear policies + support + reviews" are defined as trust mechanisms. The dispute workflow is a known gap (see Known Gaps below).

**Payouts and Finance:**

> **DEFERRED — post-hackathon.** Payout approvals, wallet transaction views, and refunds require payment integration and are not in the MVP scope.

**AI / Knowledge Base:**

1. Admin can trigger a manual RAG index rebuild via admin endpoint.

---

## 2. Pricing and Commission Model

> **DEFERRED — post-hackathon.** The entire pricing, commission, and payment model is not in the MVP scope. Payment integration (Paymob/Fawry), escrow, subscriptions, and payout flows are deferred. Retained below for future reference.

> **Storage convention:** All monetary values across every service are stored as **integer piasters** (1 EGP = 100 قرش). API responses return piasters; frontend converts for display. This applies to all current MVP fields (listing prices, tour package prices, booking totals, investment amounts, carpool fares) and all future payment/wallet fields when implemented. Never use floating-point types for money.

### 2.1 Revenue Streams

| Stream                      | Description                                                  | Specifics                                                                   |
| --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| B2B matching commission     | Fee on deals matched via Wadi Exchange / investment portal   | Percentage or fixed fees — [TBD: exact figure]                              |
| Sponsored/featured listings | Paid promotion of listings                                   | Per-ad pricing — [TBD: exact figure]                                        |
| Premium service fees        | Booking facilitation, guide services, verified accommodation | [TBD: fee percentage]                                                       |
| Subscription plans          | Guide and merchant plans                                     | Plan types: `guide_basic`, `guide_pro`, `merchant_featured` — [TBD: prices] |
| Data services               | Reports and dashboards for companies                         | Optional — [TBD: pricing]                                                   |

### 2.2 Payment Flow for Bookings (Guide Tours)

The platform uses an escrow model for tour bookings:

1. Tourist pays total booking amount from their wallet (or tops up wallet via Paymob/Fawry first).
2. Payment is held in `escrow` table (status=`held`) associated with the booking.
3. On booking `completed`, escrow status changes to `released`; guide's wallet is credited.
4. If cancelled: escrow status changes to `refunded`; tourist's wallet is credited.

### 2.3 Refunds and Cancellations

- The booking entity has a `cancelled_at` and `cancel_reason` field; booking status can be `cancelled` or `refunded`.
- The payment service has a `refund.issued` event and an admin `issue_refund` action.

### 2.4 Subscriptions

- Subscription plans are stored with `current_period_start`, `current_period_end`, and `cancelled_at`.

### 2.5 Dynamic Pricing

- The Market Service performs periodic price refreshes for real estate snapshots (stored in `price_snapshots` table: avg, min, max per district per day).
- The Wadi Exchange / crop pricing provides seasonal updates.
- No dynamic pricing algorithm (surge pricing, demand-based adjustments) is applied to guide tour packages or listings.

---

## 3. Verification and Trust Mechanisms

### 3.1 KYC Flow

| Role       | Required Documents              | Who Reviews |
| ---------- | ------------------------------- | ----------- |
| `student`  | Student ID                      | Admin       |
| `investor` | National ID + business document | Admin       |
| `guide`    | Guide license + national ID     | Admin       |
| `merchant` | Commercial registration         | Admin       |
| `tourist`  | None                            | —           |
| `resident` | None                            | —           |
| `driver`   | None (MVP)                      | —           |

**Flow:**

1. User registers and selects a role that requires verification.
2. User uploads document(s) via the file/media service; stored as secure URLs in `user_kyc` table with status `pending`.
3. Admin reviews documents in the admin panel.
4. Approval: `status -> approved`; `verified_at` set on user record; `user.verified` event emitted; notification sent (email + in-app via the notification service).
5. Rejection: `status -> rejected`; `rejection_reason` recorded; notification sent to user.
6. Until verified: users with KYC-required roles have restricted access (e.g., cannot view investment opportunity details, cannot accept bookings as a guide).

**Authentication:** Password hashing via `@node-rs/argon2` (Argon2id, Rust/NAPI — no node-gyp, OWASP recommended). JWTs are issued by the Identity service on successful login.

### 3.2 Listing Verification

- Listings created by any eligible user start in `draft` status.
- Admin sets status to `active` (approved) or `suspended`.
- Approved listings display a verified badge (`is_verified: true`).
- Featured status (`is_featured` / `featured_until`) is an admin toggle for MVP, not a paid promotion.

### 3.3 Review System

**Who can review:**

- Tourist, student, investor, and resident roles can submit reviews.
- Guide and merchant roles cannot review (they are service providers).

**When:**

Guide reviews are tied to a completed booking (`booking_id` referenced, `UNIQUE` constraint on `booking_id` ensures one review per tour). Listing reviews are open — one per user per listing (unique on `user_id` + `target_id`).

**Review moderation:**

- Admin can soft-delete any review (`is_active` flag).
- Guides can reply to reviews (via a `guide_reply` field).

### 3.4 Rating Recalculation

After a review is submitted, the relevant average rating field is recalculated:

**Listing reviews (Market Service):**

- When a `review.submitted` event fires with `target_type=listing`, recalculate `listings.average_rating` = `AVG(rating) WHERE listing_id = X AND is_active = true`.
- Unique constraint: one review per user per listing (`UNIQUE(user_id, listing_id)`).

**Guide reviews (Guide-Booking Service):**

- When a `review.submitted` event fires with `target_type=guide`, recalculate `guides.average_rating` = `AVG(rating)` from all reviews for that guide.
- Unique constraint: one review per booking (`UNIQUE(booking_id)`).

**Recalculation timing:** Runs synchronously immediately after review insert. Alternatively, triggered asynchronously via the Redis Streams `review.submitted` event — the consuming service updates the average on receipt.

---

## 4. Wadi Exchange / Investment Logic

### 4.1 What the Wadi Exchange Is

The "Wadi Exchange" is the platform's market intelligence module, not a financial exchange. It covers two concerns:

**A. Agricultural/commodity price reference:**

- Seasonal pricing for strategic crops (dates, olives) published as a price index.
- Updated periodically (daily monitoring, expandable to real-time).
- Reduces random pricing and market manipulation; helps investors, merchants, and citizens make data-driven decisions.
- Source: GAFI, New Valley Governorate, or private suppliers.

**B. B2B supplier matching:**

- A business directory linking farmers, factories, and merchants.
- Buyers (investors, merchants) can browse suppliers; suppliers can post listings.
- Direct linkage model to curb middlemen — matching buyers and sellers on the platform.
- The investment interest EOI workflow (Section 1.2 above) handles the B2B lead connection.

### 4.2 Fractional Ownership

There is no fractional ownership or tokenized investment unit in the platform. The "Wadi Exchange" name refers to a commodity price exchange, not a fractional property ownership instrument. No returns distribution, dividend calculation, or exit mechanism is designed.

### 4.3 Investment Matching Logic and EOI State Machine

**Resolved EOI state machine:** `pending → reviewed → accepted | rejected | withdrawn`

| State       | Meaning                                                                 | Actor                      |
| ----------- | ----------------------------------------------------------------------- | -------------------------- |
| `pending`   | Investor submitted EOI; awaiting admin attention                        | Investor (submit action)   |
| `reviewed`  | Admin has read and marked the EOI as reviewed                           | Admin                      |
| `accepted`  | Admin approves the connection; investor gains due-diligence room access | Admin                      |
| `rejected`  | Admin rejects the EOI                                                   | Admin                      |
| `withdrawn` | Investor withdraws the EOI at any point before `accepted`               | Investor (withdraw action) |

Rules:
- Investor can withdraw from `pending` or `reviewed` state (any status before `accepted`).
- Once `accepted`, the EOI cannot be withdrawn — the due diligence room is open.
- `rejected` is a terminal state; investor may submit a new EOI on the same opportunity if the admin allows it.

The matching between investors and opportunities is informational, not algorithmic:

- Investors browse a filtered list of opportunities (sector, area, min/max investment range) via the Market Service.
- AI-based recommendation ranking of opportunities based on investor behavior is a future capability — no matching algorithm is currently specified.
- No automated matching score, compatibility score, or weighted ranking is defined.

### 4.4 Expected Returns

- The `investment_opportunities` schema includes `expected_return_pct` (float, 0-100) and `payback_period_years` (float) as informational fields provided by the opportunity publisher.
- These are self-reported by the entity posting the opportunity (GAFI, governorate, or private owner) — not computed by the platform.
- No verification of return projections is required or enforced.

### 4.5 Liquidity / Exit

No exit mechanism is defined. Investments are not held by the platform; it is a matchmaking layer. Once a deal is agreed off-platform (or through the due diligence room), the financial transaction occurs outside the platform's payment infrastructure.

---

## 5. Notification Triggers

The following table maps triggering events to the notified party and channels.

| Trigger Event                   | Notified Party            | Email | In-App |
| ------------------------------- | ------------------------- | :---: | :----: |
| `user.registered`               | New user                  |  Yes  |   —    |
| `user.verified` (KYC approved)  | User                      |  Yes  |  Yes   |
| KYC rejected                    | User                      |  Yes  |  Yes   |
| `booking.requested`             | Guide                     |  Yes  |  Yes   |
| `booking.confirmed`             | Tourist                   |  Yes  |  Yes   |
| `booking.cancelled`             | Tourist + Guide           |  Yes  |  Yes   |
| `booking.completed`             | Tourist + Guide           |  Yes  |  Yes   |
| `review.submitted`              | Guide                     |   —   |  Yes   |
| `listing.updated`               | Users watching listing    |   —   |  Yes   |
| `listing.featured`              | Listing owner             |  Yes  |  Yes   |
| `investment.interest_submitted` | Admin + Opportunity owner |  Yes  |  Yes   |
| Carpool match found             | User                      |   —   |  Yes   |
| OTP / Auth code                 | User                      |  Yes  |   —    |
| System broadcast (admin)        | All / role-filtered       |  Yes  |  Yes   |
| Weekly digest (scheduled)       | Users with digest enabled |  Yes  |   —    |

> **Note:** SMS delivery is deferred (email only for MVP). Push notifications (FCM) are also deferred.

**Delivery logic:** The notification service reads the user's preferences (`notify_email` flag) before dispatching. Template rendering is language-aware (AR/EN) based on the user's `language` setting.

**Unread count:** Cached in Redis per user with a 60-second TTL; busted on each new notification write and each mark-as-read operation.

---

## 6. Chat / AI Business Logic

The AI service (FastAPI, :8005) powers the "Imagine" chatbot with a Qdrant-backed RAG pipeline. All chat endpoints are served through the AI service.

### 6.1 Session Management

| Endpoint              | Method | Description                                      |
| --------------------- | ------ | ------------------------------------------------ |
| `/chat/session`       | POST   | Create a new chat session; returns `session_id`  |
| `/chat/session/:id`   | GET    | Retrieve conversation history for a session      |
| `/chat/sessions`      | GET    | List all sessions for the authenticated user     |
| `/chat/session/:id`   | DELETE | Delete a session and its history                 |
| `/chat/message`       | POST   | Send a message to an existing session            |
| `/chat/suggestions`   | GET    | Return suggested prompts filtered by `user_type` |

**Session TTL:** Sessions auto-expire after **30 days** of inactivity. Expired sessions are purged; their history is not retained.

### 6.2 Conversation History

- History is stored as an ordered array of messages (role: `user` | `assistant`, content, timestamp).
- A **sliding window of the last 5 messages** is passed to the LLM as context on each request. Older messages remain in storage for the session history view but are not included in the LLM prompt.
- This bounds token usage while preserving enough context for coherent multi-turn conversations.

### 6.3 Suggestions by User Type

`GET /chat/suggestions` returns a list of suggested prompt strings tailored to the authenticated user's role:

- `tourist` — tourism prompts: nearby attractions, guide recommendations, itinerary help.
- `investor` — investment prompts: opportunity sectors, EOI process, market data queries.
- `student` — housing prompts: accommodation search, campus navigation, services directory.
- `resident` — local services prompts: price checks, POI suggestions, community info.
- `driver` — carpool-related prompts: route suggestions, ride posting help.
- `merchant` / `guide` — business-facing prompts: listing management, booking overview.

### 6.4 RAG Pipeline

- The AI service maintains a Qdrant vector store indexed from platform content (listings, POIs, investment opportunities, guides).
- On message receipt, relevant context chunks are retrieved via semantic similarity search and injected into the LLM prompt alongside the conversation window.
- Admin can trigger a full KB rebuild via `POST /admin/kb/rebuild`, which publishes a `kb.rebuild.requested` event to the Redis Stream.

---

## 7. Unified Search Architecture

All free-text search across the platform uses **PostgreSQL full-text search + `pg_trgm`**. No external search engine (Elasticsearch, Typesense) is required for MVP.

### 7.1 Unified Search Endpoint

- The Gateway (or Identity service, task T24) exposes a single `GET /search?q=...` endpoint.
- The unified search handler proxies the `q` parameter to each downstream service's `/internal/search?q=...` endpoint in parallel.
- Services that respond: Identity (users/guides), Market (listings, opportunities), Guide-Booking (tour packages), Map (POIs), AI (RAG knowledge base).
- Results from each service are collected, deduplicated, and ranked by relevance score before returning a unified response.

### 7.2 Arabic Text Normalization

- Before executing a full-text query, the search handler normalizes Arabic text:
  - Strip tashkeel (diacritics).
  - Normalize alef variants (أ إ آ ا → ا).
  - Normalize teh marbuta (ة → ه).
- Normalization is applied to both the query string and indexed content at insert time.

### 7.3 Semantic Search (AI Service)

- Semantic search is available separately via `GET /ai/search/semantic?q=...` (AI service, :8005).
- Uses Qdrant vector similarity; returns knowledge-base chunks and matched entities.
- Not part of the unified keyword search aggregation — clients call it independently when a natural-language or conceptual query is needed.

---

## 8. Redis Streams — Event-Driven Architecture

Services communicate asynchronously via **Redis Streams** (XADD / XREADGROUP). Each subscribing service maintains a consumer group on the relevant stream; if a service restarts, it resumes from its last acknowledged offset — no events are lost.

### 8.1 Canonical Event List

| Event                   | Emitter             | Consumer(s)                          | Purpose                                      |
| ----------------------- | ------------------- | ------------------------------------ | -------------------------------------------- |
| `user.registered`       | Identity (:8001)    | AI (:8005)                           | Personalization bootstrap                    |
| `listing.created`       | Market (:8002)      | AI (:8005)                           | Add listing to knowledge base                |
| `listing.verified`      | Market (:8002)      | AI (:8005)                           | Update KB entry on verification              |
| `booking.requested`     | Guide-Booking (:8003) | Identity (:8001)                   | Notify guide of new booking request          |
| `booking.confirmed`     | Guide-Booking (:8003) | Identity (:8001)                   | Notify tourist of confirmation               |
| `booking.cancelled`     | Guide-Booking (:8003) | Identity (:8001)                   | Notify both parties of cancellation          |
| `booking.completed`     | Guide-Booking (:8003) | Identity (:8001)                   | Notify both parties; trigger review prompt   |
| `review.submitted`      | Guide-Booking / Market | Identity (:8001)                  | Notify reviewed party; trigger rating recalc |
| `opportunity.published` | Market (:8002)      | AI (:8005)                           | Add opportunity to knowledge base            |
| `poi.approved`          | Map (:8004)         | AI (:8005)                           | Add approved POI to knowledge base           |
| `kb.rebuild.requested`  | Admin (via AI)      | AI (:8005)                           | Full Qdrant re-index                         |

### 8.2 Delivery Guarantee

- XREADGROUP with ACK — a message is not removed from the pending entry list until the consumer explicitly ACKs it.
- On service restart, the consumer re-reads from the last unACKed offset (PEL recovery).
- Failed message handling (DLQ / retry policy) is a known gap — not yet specified for MVP.

---

## 9. Saved Items Business Logic

The Identity service owns the `saved_items` table. Saving an item is a lightweight bookmarking operation — no cross-schema joins are required.

### 9.1 Data Model

```
saved_items (
  id          UUID PK,
  user_id     UUID FK → users.id,
  item_type   ENUM('listing', 'guide', 'poi', 'opportunity'),
  item_id     UUID,   -- reference to the item in its owning service
  created_at  TIMESTAMPTZ,
  UNIQUE(user_id, item_type, item_id)
)
```

- `item_id` is a plain UUID reference — Identity does not join into Market, Guide-Booking, or Map schemas.
- The client resolves item details by calling the owning service with the `item_id` after fetching the saved-items list.

### 9.2 CRUD Operations

| Action          | Endpoint                               | Description                                      |
| --------------- | -------------------------------------- | ------------------------------------------------ |
| Save item       | `POST /saved-items`                    | Body: `{ item_type, item_id }`                   |
| Unsave item     | `DELETE /saved-items/:item_type/:item_id` | Remove a specific saved item                  |
| List saved items| `GET /saved-items?item_type=...`       | List user's saved items; filterable by item_type |

---

## Open Decisions

- **Review gating model:** RESOLVED — Guide reviews are per-booking (unique on `booking_id`, requires completed booking). Listing reviews are open — one per user per listing (unique on `user_id` + `target_id`).
- **EOI status state machine:** RESOLVED — `pending → reviewed → accepted | rejected | withdrawn`. See Section 4.3 for the full state machine.
- **Guide booking confirmation:** RESOLVED — Guide explicitly accepts or declines the booking request. State machine: `pending -> confirmed -> in_progress -> completed -> cancelled`.

---

## Known Gaps

- **Commission model:** DEFERRED — Commission and fee structures are deferred with the payment service (post-hackathon).
- **Cancellation and refund policy:** DEFERRED — Refund tiers and cancellation fees are deferred with the payment service (post-hackathon).
- **Dispute resolution workflow:** No dispute entity, dispute workflow, or escalation states exist in any data schema or API specification.
- **KYC re-submission rules:** No re-upload counter, cooldown period, or document expiry date is modeled. Re-verification after license renewal is not addressed.
- **Subscription pricing and billing:** DEFERRED — Subscription billing is deferred with the payment service (post-hackathon).
- **Merchant plan pricing:** DEFERRED — Deferred with the payment service (post-hackathon).
- **Platform fee deduction from escrow:** DEFERRED — Deferred with the payment service (post-hackathon).
- **Carpooling approval mechanism:** Seat-join requests have statuses `pending | confirmed | cancelled` but the approval mechanism (auto-confirm vs. driver approval) is not detailed.
- **Student hub specifics:** The proposal describes a dedicated Student and Newcomer Hub with a moving checklist, but no student-specific entities exist beyond the `student` role flag and KYC requirement.
- **Listing documentation requirements:** Required documentation for listings beyond the user's own KYC is not specified.
- **Review dispute/appeal process:** No formal dispute or appeal process for reviews is defined.
- **Fractional ownership:** The "Wadi Exchange" naming could imply tradeable investment units, but no such instrument is designed. Clarify naming if needed to avoid regulatory confusion.
- **Dynamic pricing for services:** No surge pricing or demand-based adjustment algorithm is defined for guide tours or listings.
- **Redis Streams DLQ / retry policy:** No dead-letter queue, retry backoff, or poison-message handling is defined for failed stream consumers.
