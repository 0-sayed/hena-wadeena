# API Surface — Hena Wadeena

> Complete, tech-agnostic mapping of the planned API surface. Serves as the contract for NestJS implementation.

---

## Service Architecture

**All request validation uses Zod + nestjs-zod + drizzle-zod (single source of truth: Drizzle schema → Zod → NestJS pipe).**

**Both Auth and Users endpoints are under Identity service (:8001).**

**Notifications endpoints belong to Identity service (:8001), not a separate Notifications service.**

**No separate Files/Media service.** Each service generates its own S3 presigned PUT URLs via AWS S3 (`@aws-sdk/s3-request-presigner`). The browser uploads directly to S3.

| Service       | Port  | Endpoint Count | Domains Covered                                      |
| ------------- | ----- | -------------- | ---------------------------------------------------- |
| Identity      | :8001 | 20             | Auth, Users, Notifications                           |
| Market        | :8002 | 21             | Listings, Reviews, Investments (Wadi Exchange)       |
| Guide-Booking | :8003 | 20             | Guides, Bookings, Tour Packages                      |
| Map           | :8004 | 8              | Points of Interest, Carpool, Routing                 |
| AI            | :8005 | 6              | Chat, Recommendations, Knowledge Base                |
| Gateway       | :8000 | —              | Nginx reverse proxy + JWT auth subrequest            |

---

## Table of Contents

1. [Endpoints by Service](#1-endpoints-by-service)
2. [Internal Routes](#2-internal-routes)
3. [Redis Streams Events](#3-redis-streams-events)
4. [Auth Flows](#4-auth-flows)
5. [Request / Response Contracts](#5-request--response-contracts)
6. [API Design Issues](#6-api-design-issues)
7. [Open Decisions](#open-decisions)
8. [Known Gaps](#known-gaps)

---

## 1. Endpoints by Service

**Base path:** `/api/v1`

All protected endpoints require a short-lived JWT access token in the `Authorization: Bearer <token>` header unless stated otherwise.

**Role abbreviations used in Auth Required column:**
`any` = any authenticated user | `admin` = admin or super_admin only | `owner` = resource creator or admin | `role:X` = specific role required

---

### 1.1 Identity Service (:8001)

Both Auth and Users endpoints live under Identity service (:8001). Notifications are also owned by Identity service.

#### 1.1.1 Auth

**Route prefix:** `/api/v1/auth`

| Method | Path                           | Purpose                                     | Auth Required          | Notes                                            |
| ------ | ------------------------------ | ------------------------------------------- | ---------------------- | ------------------------------------------------ |
| POST   | `/register`                    | Create a new account                        | None                   | Returns tokens immediately on success            |
| POST   | `/login`                       | Email + password login                      | None                   | Returns access + refresh tokens                  |
| POST   | `/otp/request`                 | Request SMS OTP for phone login             | None                   | **DEFERRED** — SMS OTP deferred from MVP         |
| POST   | `/otp/verify`                  | Verify OTP, issue tokens                    | None                   | **DEFERRED** — SMS OTP deferred from MVP         |
| POST   | `/refresh`                     | Exchange refresh token for new access token | Refresh token (opaque) | Old refresh token invalidated (rotation)         |
| POST   | `/logout`                      | Invalidate current session                  | Bearer                 | Blacklists JWT `jti` + deletes refresh token     |
| GET    | `/me`                          | Get current authenticated user's profile    | Bearer                 | Shorthand — resolves to Users service internally |
| PATCH  | `/me`                          | Update own profile fields                   | Bearer                 | —                                                |
| POST   | `/change-password`             | Change own password                         | Bearer                 | Requires current password confirmation           |
| GET    | `/google`                      | Initiate Google OAuth2 flow                 | None                   | **DEFERRED** — Google OAuth deferred from MVP    |
| GET    | `/google/callback`             | Handle Google OAuth2 callback               | None                   | **DEFERRED** — Google OAuth deferred from MVP    |
| POST   | `/auth/password-reset/request` | Send HMAC-signed reset link to email        | None                   | Returns 202; 1-hour token TTL                    |
| POST   | `/auth/password-reset/confirm` | Validate token, set new password            | None                   | Returns 200; invalidates all existing sessions   |

---

#### 1.1.2 Users

**Route prefix:** `/api/v1/users`

| Method | Path              | Purpose                                                       | Auth Required                   | Notes                                             |
| ------ | ----------------- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------------------- |
| GET    | `/:id`            | Get public profile of any user                                | admin                           | Regular users cannot look up others               |
| GET    | `/`               | List all users (paginated)                                    | admin                           | Supports filters: role, status                    |
| PATCH  | `/:id/status`     | Activate, suspend, or ban a user                              | admin                           | Status values: `active`, `suspended`, `banned`    |
| PATCH  | `/:id/role`       | Change a user's role                                          | admin                           | —                                                 |
| DELETE | `/:id`            | Delete account (hard or soft)                                 | owner or admin                  | Self-delete allowed for all roles                 |
| GET    | `/preferences`    | Get own notification/interest preferences                     | Bearer                          | —                                                 |
| PATCH  | `/preferences`    | Update notification/interest preferences                      | Bearer                          | Notification channels, preferred areas, interests |
| GET    | `/saved`          | List saved items (listings, guides, POIs, opportunities)      | Bearer                          | Multi-type favourites list                        |
| POST   | `/saved`          | Save an item                                                  | Bearer                          | Body: `{item_type, item_id}`                      |
| DELETE | `/saved/:item_id` | Remove a saved item                                           | Bearer                          | —                                                 |
| POST   | `/kyc`            | Upload KYC documents (student ID, national ID, guide license) | Bearer (student/investor/guide) | Triggers admin review queue                       |
| GET    | `/kyc`            | Get own KYC submission status                                 | Bearer                          | —                                                 |

---

#### 1.1.3 Notifications

**Route prefix:** `/api/v1/notifications`

Notifications are owned by Identity service (:8001). They are emitted in response to booking, review, and other platform events via Redis Streams.

| Method | Path           | Purpose                                  | Auth Required | Notes                                   |
| ------ | -------------- | ---------------------------------------- | ------------- | --------------------------------------- |
| GET    | `/`            | List own notifications (paginated)       | Bearer        | Ordered by `created_at` desc            |
| PATCH  | `/:id/read`    | Mark single notification as read         | Bearer        | —                                       |
| PATCH  | `/read-all`    | Mark all notifications as read           | Bearer        | —                                       |
| GET    | `/count`       | Get unread notification count            | Bearer        | Backed by Redis cache (TTL 60s)         |
| GET    | `/preferences` | Get own notification channel preferences | Bearer        | —                                       |
| PATCH  | `/preferences` | Update notification channel preferences  | Bearer        | Push, email, SMS toggles per event type |

---

#### 1.1.4 Admin — Identity

Admin endpoints for Identity service (:8001).

| Method | Path                | Purpose                            | Auth Required  | Notes                            |
| ------ | ------------------- | ---------------------------------- | -------------- | -------------------------------- |
| GET    | `/admin/users`      | All users list                     | Bearer (admin) | —                                |
| PATCH  | `/admin/users/:id/status` | Activate, suspend, or ban a user account | Bearer (admin) | —                           |
| PATCH  | `/admin/users/:id/role`   | Change user role                         | Bearer (admin) | —                           |
| GET    | `/admin/kyc`        | Pending KYC review queue           | Bearer (admin) | —                                |
| PATCH  | `/admin/kyc/:id`    | Approve or reject a KYC submission | Bearer (admin) | Triggers notification to user    |
| POST   | `/admin/campaigns`  | Create notification broadcast campaign | Bearer (admin) | —                           |

---

### 1.2 Market Service (:8002)

Includes Listings, Reviews, Investment (Wadi Exchange), and market analytics. Investment endpoints are part of Market service — there is no standalone Investment service.

#### 1.2.1 Listings / Properties

**Route prefix:** `/api/v1/listings`

| Method | Path           | Purpose                                            | Auth Required                              | Notes                                               |
| ------ | -------------- | -------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| GET    | `/`            | List all active listings with filters + pagination | None                                       | Primary browse endpoint                             |
| GET    | `/:id`         | Get single listing detail                          | None                                       | —                                                   |
| GET    | `/slug/:slug`  | Get listing by SEO-friendly slug                   | None                                       | —                                                   |
| GET    | `/featured`    | Get featured/promoted listings                     | None                                       | Sorted by `is_featured`, then `created_at` desc     |
| GET    | `/nearby`      | Get listings within radius of lat/lng              | None                                       | Query params: `lat`, `lng`, `radius_km`             |
| POST   | `/`            | Create new listing                                 | Bearer (investor, merchant, local_citizen) | Starts in unverified state; requires admin approval |
| PUT    | `/:id`         | Full update of listing                             | owner                                      | —                                                   |
| PATCH  | `/:id`         | Partial update of listing                          | owner                                      | —                                                   |
| DELETE | `/:id`         | Soft-delete listing (sets `is_active: false`)      | owner                                      | —                                                   |
| POST   | `/:id/images`  | Request S3 presigned PUT URL for a listing image   | owner                                      | Returns presigned URL; browser uploads directly to S3 |
| GET    | `/:id/reviews` | Get paginated reviews for a listing                | None                                       | —                                                   |
| POST   | `/:id/views`   | Increment view counter                             | None                                       | Anonymous-safe analytics ping                       |

**GET / query parameters:**
`category`, `sub_category`, `area`, `tags` (comma-separated), `min_rating`, `is_verified`, `is_featured`, `offset` (integer, default 0), `limit` (integer, default 20, max 100), `sort` (field|direction)

**Listing categories:** `place`, `accommodation`, `restaurant`, `service`, `activity`, `transport`, `education`, `healthcare`, `shopping`

**Additional market-layer endpoints:**

| Method | Path                         | Purpose                                      | Auth Required                      | Notes                             |
| ------ | ---------------------------- | -------------------------------------------- | ---------------------------------- | --------------------------------- |
| GET    | `/market/price-index`        | Get price index by district and listing type | None                               | Aggregated `price_snapshots` data |
| GET    | `/market/analytics`          | Price trends, market heatmaps                | Bearer (investor, merchant, admin) | —                                 |
| GET    | `/market/business-directory` | Browse B2B business directory                | None                               | —                                 |
| POST   | `/market/business-directory` | Add business to directory                    | Bearer (merchant)                  | —                                 |

---

#### 1.2.2 Reviews

**Route prefix:** `/api/v1/reviews`

| Method | Path           | Purpose                                        | Auth Required          | Notes                                                                                                       |
| ------ | -------------- | ---------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/`            | Submit a review                                | Bearer                 | Body requires `target_type` (`listing` or `guide`) and `target_id`; one review per user per target enforced |
| PUT    | `/:id`         | Update own review                              | Bearer (review author) | —                                                                                                           |
| DELETE | `/:id`         | Delete a review                                | owner or admin         | Soft-delete (`is_active: false`)                                                                            |
| POST   | `/:id/helpful` | Mark review as helpful                         | Bearer                 | Increments `helpful_count`                                                                                  |
| GET    | `/mine`        | List all reviews submitted by the current user | Bearer                 | —                                                                                                           |
| POST   | `/:id/reply`   | Guide replies to a review on their own profile | Bearer (guide)         | Only applicable to guide reviews                                                                            |

**Note:** Reviews for specific targets are also accessible via the parent resource:

- `GET /listings/:id/reviews`
- `GET /guides/:id/reviews`
- `GET /guide/attractions/:id/reviews`

---

#### 1.2.3 Investments (Wadi Exchange)

**Route prefix:** `/api/v1/investments`

Investment endpoints are part of Market service (:8002). There is no standalone Investment service.

| Method | Path                  | Purpose                                              | Auth Required                                      | Notes                                              |
| ------ | --------------------- | ---------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| GET    | `/`                   | List investment opportunities (paginated + filtered) | None (list)                                        | Detail view requires investor role per RBAC matrix |
| GET    | `/:id`                | Get opportunity detail                               | Bearer (investor, merchant, admin)                 | —                                                  |
| GET    | `/sectors`            | Summary statistics per investment sector             | None                                               | —                                                  |
| GET    | `/featured`           | Featured/highlighted opportunities                   | None                                               | —                                                  |
| POST   | `/`                   | Create a new investment opportunity listing          | Bearer (admin, investor, merchant)                 | Starts in `draft` status                           |
| PUT    | `/:id`                | Full update of opportunity                           | owner or admin                                     | —                                                  |
| POST   | `/:id/interest`       | Submit expression of investment interest             | Bearer (investor, merchant)                        | One interest per user per opportunity              |
| GET    | `/:id/interests`      | List all interests expressed for an opportunity      | Bearer (admin)                                     | —                                                  |
| GET    | `/mine/interests`     | List my expressed interests                          | Bearer                                             | —                                                  |
| POST   | `/:id/documents`      | Request S3 presigned PUT URL for due-diligence docs  | Bearer (owner or investor with active application) | Returns presigned URL; browser uploads directly to S3 |
| GET    | `/market/price-index` | Wadi Exchange — current crop/commodity prices        | None                                               | The proposal's "Wadi Exchange" core feature        |

**GET / query parameters:**
`sector`, `area`, `min_investment`, `max_investment`, `status` (available/under_review/taken), `offset` (integer, default 0), `limit` (integer, default 20, max 100)

---

#### 1.2.4 Admin — Market

Admin endpoints for Market service (:8002).

| Method | Path                         | Purpose                                                    | Auth Required  | Notes                                        |
| ------ | ---------------------------- | ---------------------------------------------------------- | -------------- | -------------------------------------------- |
| GET    | `/admin/stats`               | Platform-wide statistics dashboard                         | Bearer (admin) | Users, listings, bookings, revenue summaries |
| GET    | `/admin/listings`            | All listings including unverified/suspended                | Bearer (admin) | —                                            |
| PATCH  | `/admin/listings/:id/verify`  | Approve/reject a listing                                  | Bearer (admin) | Sets `is_verified`; emits `listing.verified` |
| PATCH  | `/admin/listings/:id/feature` | Toggle featured status                                    | Bearer (admin) | —                                            |
| GET    | `/admin/investment/interests` | All expressed investment interests                        | Bearer (admin) | —                                            |
| GET    | `/admin/moderation/queue`    | Content moderation queue (listings, reviews flagged by AI) | Bearer (admin) | —                                            |

---

### 1.3 Guide-Booking Service (:8003)

#### 1.3.1 Bookings

**Route prefix:** `/api/v1/bookings`

| Method | Path            | Purpose                                | Auth Required                                      | Notes                                                          |
| ------ | --------------- | -------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| POST   | `/`             | Request a booking (tourist -> guide)   | Bearer (tourist, student, investor, local_citizen) | Triggers `booking.requested` event                             |
| GET    | `/:id`          | Get booking detail                     | Bearer (booking participant or admin)              | —                                                              |
| GET    | `/mine`         | List my bookings (as tourist or guide) | Bearer                                             | Filtered by caller's role                                      |
| PATCH  | `/:id/confirm`  | Guide confirms a booking request       | Bearer (guide)                                     | Triggers `booking.confirmed` event                             |
| PATCH  | `/:id/cancel`   | Cancel a booking                       | Bearer (participant or admin)                      | Triggers `booking.cancelled` event; refund eligibility checked |
| PATCH  | `/:id/complete` | Mark booking as completed              | Bearer (guide)                                     | Triggers `booking.completed` event; enables tourist review     |

---

#### 1.3.2 Guides & Tour Packages

**Route prefix:** `/api/v1/guides`

| Method | Path                       | Purpose                                 | Auth Required         | Notes                                        |
| ------ | -------------------------- | --------------------------------------- | --------------------- | -------------------------------------------- |
| GET    | `/guides`                  | Browse verified guide profiles          | None                  | Filters: languages, specialties, price range |
| GET    | `/guides/:id`              | Get guide profile detail + availability | None                  | —                                            |
| POST   | `/guides/:id/packages`     | Create a tour package                   | Bearer (guide)        | —                                            |
| GET    | `/guides/:id/packages`     | List tour packages by a guide           | None                  | —                                            |
| GET    | `/guides/:id/availability` | Get guide's blocked/available dates     | None                  | —                                            |
| PATCH  | `/guides/:id/availability` | Update guide's availability calendar    | Bearer (guide, owner) | —                                            |
| GET    | `/guides/:id/reviews`      | Reviews for a specific guide            | None                  | —                                            |

---

### 1.4 Map Service (:8004)

**Route prefix:** `/api/v1/map` and `/api/v1/carpool`

| Method | Path                    | Purpose                            | Auth Required                           | Notes                                   |
| ------ | ----------------------- | ---------------------------------- | --------------------------------------- | --------------------------------------- |
| GET    | `/map/pois`             | List / filter Points of Interest   | None                                    | Supports geo-proximity filter           |
| GET    | `/map/pois/:id`         | Get single POI detail              | None                                    | —                                       |
| POST   | `/map/pois`             | Suggest a new POI                  | Bearer (local_citizen, guide, merchant) | Starts in `pending` status              |
| PATCH  | `/map/pois/:id/approve` | Approve a POI suggestion           | Bearer (admin)                          | Emits `poi.approved` event              |
| GET    | `/map/route`            | Calculate route between two points | None                                    | Proxies Google Maps Directions API      |
| GET    | `/carpool`              | List open carpool rides            | None                                    | Filters: origin area, destination, date |
| POST   | `/carpool`              | Post a new carpool ride offer      | Bearer                                  | —                                       |
| POST   | `/carpool/:id/join`     | Join a carpool ride                | Bearer                                  | Decrements available seats              |
| PATCH  | `/carpool/:id/cancel`   | Cancel own carpool ride            | Bearer (ride owner)                     | —                                       |

---

### 1.5 AI Service (:8005)

**Route prefix:** `/api/v1/chat` (user-facing) or `/api/v1/ai` (internal AI sub-features)

| Method | Path                        | Purpose                                        | Auth Required   | Notes                                                  |
| ------ | --------------------------- | ---------------------------------------------- | --------------- | ------------------------------------------------------ |
| POST   | `/chat/message`             | Send message to AI assistant, receive response | Optional Bearer | Anonymous use allowed; session tracked by `session_id` |
| POST   | `/chat/session`             | Explicitly start a new chat session            | Optional Bearer | Returns a `session_id`                                 |
| GET    | `/chat/session/:session_id` | Get full message history for a session         | Optional Bearer | —                                                      |
| DELETE | `/chat/session/:session_id` | Delete a chat session                          | Bearer          | Authenticated users only                               |
| GET    | `/chat/sessions`            | List all chat sessions for current user        | Bearer          | —                                                      |
| GET    | `/chat/suggestions`         | Starter prompts tailored by user type          | None            | Query param: `user_type` (tourist/investor/student)    |
| GET    | `/ai/recommendations`       | Get personalised content recommendations       | Bearer          | Returns ranked listings, guides, POIs                  |

**Admin — AI Service (:8005):**

| Method | Path              | Purpose                                 | Auth Required        | Notes                  |
| ------ | ----------------- | --------------------------------------- | -------------------- | ---------------------- |
| POST   | `/admin/kb/rebuild` | Trigger RAG knowledge base re-index   | Bearer (admin)       | Emits `kb.rebuild.requested`; background job trigger |
| GET    | `/admin/audit-log`  | Full system audit log                 | Bearer (super_admin) | —                      |
| POST   | `/admin/feature-flags` | Manage feature flags               | Bearer (super_admin) | —                      |

---

### 1.6 Payments (DEFERRED)

> **All payment endpoints are deferred from MVP.** Payment integration (Paymob/Fawry), wallet, escrow, subscription billing, and payout flows will be designed and implemented post-MVP. Guide bookings and investment interest use contact-based flows (no payment processing) in the MVP.

**Route prefix:** `/api/v1/payments` and `/api/v1/wallet`

| Method | Path                           | Purpose                                              | Auth Required                     | Status   |
| ------ | ------------------------------ | ---------------------------------------------------- | --------------------------------- | -------- |
| GET    | `/wallet`                      | Get own wallet balance                               | Bearer                            | Deferred |
| POST   | `/wallet/topup`                | Initiate wallet top-up (redirect to payment gateway) | Bearer                            | Deferred |
| POST   | `/wallet/topup/callback`       | Payment gateway webhook callback                     | None (webhook signature required) | Deferred |
| GET    | `/wallet/transactions`         | Get paginated transaction history                    | Bearer                            | Deferred |
| POST   | `/payments/booking`            | Pay for a booking (escrow hold)                      | Bearer (tourist)                  | Deferred |
| POST   | `/payments/subscription`       | Pay for guide/merchant subscription plan             | Bearer (guide, merchant)          | Deferred |
| POST   | `/payments/payout/request`     | Request payout of earned balance                     | Bearer (guide, merchant)          | Deferred |
| GET    | `/payments/payout/requests`    | List all payout requests                             | Bearer (admin)                    | Deferred |
| PATCH  | `/payments/payout/:id/approve` | Approve a payout request                             | Bearer (admin)                    | Deferred |
| POST   | `/payments/refund`             | Issue refund on a transaction                        | Bearer (admin)                    | Deferred |
| GET    | `/payments/subscriptions`      | Get own active subscriptions                         | Bearer                            | Deferred |

---

### 1.7 Health / System

| Method | Path      | Purpose               | Auth Required | Notes                                    |
| ------ | --------- | --------------------- | ------------- | ---------------------------------------- |
| GET    | `/health` | Platform health check | None          | Returns status of all dependent services |

---

## 2. Internal Routes

### Internal Routes (Nginx-blocked from external access)

These routes are used for inter-service communication only. Nginx blocks them from external clients — they are never accessible via the public API gateway.

| Method | Path                      | Purpose                        | Called By                        |
| ------ | ------------------------- | ------------------------------ | -------------------------------- |
| GET    | `/internal/users/:id`     | Fetch user public profile      | Any service → Identity (:8001)   |
| GET    | `/internal/search?q=...`  | Per-service text search        | Unified Search → each service    |
| GET    | `/internal/validate-token` | JWT validation subrequest     | Gateway (:8000) → Identity (:8001) |

---

## 3. Redis Streams Events

All async inter-service communication uses Redis Streams. The complete canonical list of 11 events is below.

### 3.1 Event Registry

| Event                    | Producer          | Consumer(s)       | Purpose                                |
| ------------------------ | ----------------- | ----------------- | -------------------------------------- |
| `user.registered`        | Identity (:8001)  | AI (:8005)        | Personalization initialization         |
| `listing.created`        | Market (:8002)    | AI (:8005)        | Knowledge base update                  |
| `listing.verified`       | Market (:8002)    | AI (:8005)        | Knowledge base update                  |
| `booking.requested`      | Guide-Booking (:8003) | Identity (:8001) | Notification to guide                 |
| `booking.confirmed`      | Guide-Booking (:8003) | Identity (:8001) | Notification to tourist               |
| `booking.cancelled`      | Guide-Booking (:8003) | Identity (:8001) | Notification to participants          |
| `booking.completed`      | Guide-Booking (:8003) | Identity (:8001) | Notification + enables review         |
| `review.submitted`       | Market (:8002)    | Identity (:8001)  | Notification to reviewed party        |
| `opportunity.published`  | Market (:8002)    | AI (:8005)        | Knowledge base update                  |
| `poi.approved`           | Map (:8004)       | AI (:8005)        | Knowledge base update                  |
| `kb.rebuild.requested`   | AI (:8005) admin  | AI (:8005)        | Full knowledge base re-index           |

### 3.2 Event Payload Schemas

#### `user.registered`

| Field    | Type   |
| -------- | ------ |
| `userId` | string |
| `email`  | string |
| `role`   | string |

#### `listing.created`

| Field      | Type   |
| ---------- | ------ |
| `listingId` | string |
| `title`     | string |
| `category`  | string |
| `area`      | string |

#### `listing.verified`

| Field      | Type   |
| ---------- | ------ |
| `listingId` | string |

#### `booking.requested` / `booking.confirmed` / `booking.cancelled` / `booking.completed`

| Field       | Type   |
| ----------- | ------ |
| `bookingId`  | string |
| `touristId`  | string |
| `guideId`    | string |
| `packageId`  | string |

#### `review.submitted`

| Field        | Type                    |
| ------------ | ----------------------- |
| `reviewId`   | string                  |
| `targetType` | `"listing"` \| `"guide"` |
| `targetId`   | string                  |
| `rating`     | integer (1–5)           |

#### `opportunity.published`

| Field           | Type   |
| --------------- | ------ |
| `opportunityId` | string |
| `title`         | string |
| `sector`        | string |

#### `poi.approved`

| Field         | Type              |
| ------------- | ----------------- |
| `poiId`       | string            |
| `name`        | string            |
| `coordinates` | `{ lat, lng }`    |

#### `kb.rebuild.requested`

| Field         | Type            |
| ------------- | --------------- |
| `requestedBy` | string (userId) |
| `reason`      | string (optional) |

---

## 4. Auth Flows

> **MVP auth is email + password -> JWT only.** Phone OTP login and Google OAuth2 flows are deferred from MVP.

### 4.1 Standard Registration

1. Client sends `POST /auth/register` with `name`, `email`, `password`, and desired `role` (defaults to `tourist` if omitted).
2. Server validates that the email is not already registered and that the password meets minimum length.
3. Server hashes the password and stores the user record with `is_verified: false`.
4. Server issues an access token and a refresh token immediately (no email verification gate at MVP).
5. A `user.registered` event is emitted; the Notifications service sends a welcome email/push.
6. **If the role requires KYC** (`student`, `investor`, `guide`, `merchant`): the user gains base access but certain capabilities (e.g., posting investment opportunities, receiving bookings) remain locked until KYC is approved. The client should prompt a document upload via `POST /users/kyc`.

### 4.2 Phone OTP Login (DEFERRED)

> Deferred from MVP. SMS OTP provider selection and phone-based registration are post-MVP.

1. Client sends `POST /auth/otp/request` with `phone`.
2. Server generates a 6-digit code, hashes it, stores it with a 5-minute TTL (max 3 verify attempts).
3. Server sends the code via SMS.
4. Client sends `POST /auth/otp/verify` with `phone` and `code`.
5. Server validates code (hash comparison, not expired, attempt limit not exceeded). On success, issues access + refresh tokens.
6. If no user exists for the phone number, a new account is created with role `tourist`.

### 4.3 Standard Email/Password Login

1. Client sends `POST /auth/login` with `email` and `password`.
2. Server looks up user by email; returns `401` if not found.
3. Server compares submitted password against stored hash; returns `401` on mismatch.
4. Server issues: a short-lived JWT access token (RS256, 15-minute TTL) and an opaque refresh token (30-day TTL, stored as a hash in the database).
5. The refresh token is returned in both the response body (for mobile clients) and as an `HttpOnly` cookie (for web clients).
6. The access token payload includes: `sub` (user ID), `role`, `lang`, `jti` (unique token ID), `iat`, `exp`.

### 4.4 Token Refresh

1. Client sends `POST /auth/refresh` with the opaque refresh token (either from cookie or body).
2. Server looks up the hashed refresh token in the database.
3. Server verifies: token exists, not revoked (`revoked_at` is null), not expired.
4. Server issues a **new** access token. The old refresh token is invalidated and a **new** refresh token is issued (rotation). This limits the blast radius of a stolen refresh token.
5. If the refresh token is missing or invalid, the server returns `401` and the client must re-authenticate.

### 4.5 Password Reset

1. Client sends a password reset request to `POST /auth/password-reset/request` with `email`.
2. Server generates a time-limited reset token (HMAC-signed, 1-hour TTL) and emails it to the user.
3. Client extracts the token from the email link and sends `POST /auth/password-reset/confirm` with `token` and `new_password`.
4. Server validates the token, updates the password hash, and invalidates all existing refresh tokens for that user (forced re-login on all devices).

### 4.6 Google OAuth2 / Social Login (DEFERRED)

> Deferred from MVP. Google OAuth2 social login will be implemented post-MVP.

1. Client navigates to or redirects the browser to `GET /auth/google`.
2. Server redirects to Google's OAuth2 authorization endpoint with the platform's `client_id`, `redirect_uri`, and requested scopes (`profile`, `email`).
3. After user consents, Google redirects to `GET /auth/google/callback?code=...`.
4. Server exchanges the authorization code for a Google access token, fetches the user's profile from Google.
5. Server upserts the user (create if new, look up by Google-provided email if existing), then issues platform-native JWT + refresh tokens.
6. Server redirects the browser to the frontend with the tokens embedded in the URL fragment or sets the `HttpOnly` cookie.

---

## 5. Request / Response Contracts

### Pagination Model

All paginated endpoints use `offset` + `limit` query parameters and return a consistent response envelope.

**Query parameters:**

| Parameter | Type    | Required | Default | Max | Notes                     |
| --------- | ------- | -------- | ------- | --- | ------------------------- |
| `offset`  | integer | No       | 0       | —   | Number of records to skip |
| `limit`   | integer | No       | 20      | 100 | Records per page          |

**Response envelope (`PaginatedResponse<T>` from `@hena-wadeena/types`):**

```json
{
  "data": [],
  "total": 0,
  "hasMore": false
}
```

The request DTO type is `PaginationQueryDto` from `@hena-wadeena/types`.

> Note: `page`, `pages` query params and response fields do not exist — use `offset`/`limit` exclusively.

---

### 5.1 POST `/auth/register`

**Request body:**

| Field      | Type                  | Required | Notes                                                                                         |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `name`     | string                | Yes      | Display name                                                                                  |
| `email`    | string (email format) | Yes      | Must be unique, stored lowercase                                                              |
| `password` | string                | Yes      | Minimum 8 characters                                                                          |
| `role`     | string enum           | No       | `tourist`, `student`, `investor`, `local_citizen`, `guide`, `merchant`; defaults to `tourist` |

**Success response (201):**

| Field             | Type           | Notes                                    |
| ----------------- | -------------- | ---------------------------------------- |
| `access_token`    | string         | JWT, 15-minute TTL                       |
| `refresh_token`   | string         | Opaque, 30-day TTL                       |
| `token_type`      | string         | Always `"bearer"`                        |
| `expires_in`      | integer        | Seconds until access token expires (900) |
| `user.id`         | string         | Platform user ID                         |
| `user.name`       | string         | —                                        |
| `user.email`      | string         | —                                        |
| `user.role`       | string         | Assigned role                            |
| `user.avatar_url` | string or null | —                                        |

**Possible errors:**

| Status | Error code                 | Condition                                 |
| ------ | -------------------------- | ----------------------------------------- |
| 400    | `VALIDATION_ERROR`         | Missing required fields or invalid format |
| 400    | `PASSWORD_TOO_SHORT`       | Password under 8 characters               |
| 409    | `EMAIL_ALREADY_REGISTERED` | Email already in use                      |

---

### 5.2 POST `/auth/login`

**Request body:**

| Field      | Type   | Required |
| ---------- | ------ | -------- |
| `email`    | string | Yes      |
| `password` | string | Yes      |

**Success response (200):** Same shape as registration response.

**Possible errors:**

| Status | Error code            | Condition                                 |
| ------ | --------------------- | ----------------------------------------- |
| 401    | `INVALID_CREDENTIALS` | Email not found or password mismatch      |
| 403    | `ACCOUNT_SUSPENDED`   | User account has been suspended or banned |

---

### 5.3 GET `/listings` (list with filters)

**Query parameters:**

| Parameter      | Type                    | Required | Notes                                                                                                             |
| -------------- | ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `category`     | string enum             | No       | `place`, `accommodation`, `restaurant`, `service`, `activity`, `transport`, `education`, `healthcare`, `shopping` |
| `sub_category` | string                  | No       | E.g., `hotel`, `hostel`, `apartment`                                                                              |
| `area`         | string enum             | No       | `الخارجة`, `الداخلة`, `الفرافرة`, `باريس`, `بلاط`                                                                 |
| `tags`         | comma-separated strings | No       | Listings must have ALL listed tags                                                                                |
| `min_rating`   | float                   | No       | Minimum average rating (0-5)                                                                                      |
| `is_verified`  | boolean                 | No       | —                                                                                                                 |
| `is_featured`  | boolean                 | No       | —                                                                                                                 |
| `offset`       | integer                 | No       | Defaults to 0                                                                                                     |
| `limit`        | integer                 | No       | Defaults to 20, max 100                                                                                           |
| `sort`         | string                  | No       | Format: `field\|direction`, e.g., `rating_avg\|-1`                                                                |

**Success response (200) — `PaginatedResponse<Listing>`:**

| Field     | Type                     | Notes                             |
| --------- | ------------------------ | --------------------------------- |
| `data`    | array of listing objects | See below                         |
| `total`   | integer                  | Total matching records            |
| `hasMore` | boolean                  | Whether more records are available |

**Each listing object contains:**
`id`, `title`, `title_ar`, `description`, `description_ar`, `category`, `sub_category`, `location` (object: `area`, `address`, `coordinates`), `contact` (optional), `tags`, `thumbnail`, `images`, `price_range`, `amenities`, `rating_avg`, `review_count`, `is_verified`, `is_featured`, `created_at`, `created_by`

---

### 5.4 POST `/listings` (create listing)

**Request body:**

| Field                      | Type             | Required | Notes                                               |
| -------------------------- | ---------------- | -------- | --------------------------------------------------- |
| `title`                    | string           | Yes      | English title                                       |
| `title_ar`                 | string           | Yes      | Arabic title (primary)                              |
| `description`              | string           | No       | English description                                 |
| `description_ar`           | string           | No       | Arabic description                                  |
| `category`                 | string enum      | Yes      | See listing categories                              |
| `sub_category`             | string           | No       | —                                                   |
| `location.area`            | string enum      | Yes      | One of the five New Valley areas                    |
| `location.address`         | string           | Yes      | —                                                   |
| `location.address_ar`      | string           | No       | —                                                   |
| `location.coordinates.lat` | float            | No       | —                                                   |
| `location.coordinates.lng` | float            | No       | —                                                   |
| `contact`                  | object           | No       | `phone`, `whatsapp`, `email`, `website`, `facebook` |
| `tags`                     | array of strings | No       | —                                                   |
| `price_range`              | string           | No       | `"$"`, `"$$"`, or `"$$$"`                           |
| `amenities`                | array of strings | No       | For accommodation listings                          |

**Success response (201):**

| Field     | Type                        |
| --------- | --------------------------- |
| `message` | string                      |
| `id`      | string — the new listing ID |

**Possible errors:**

| Status | Error code         | Condition                             |
| ------ | ------------------ | ------------------------------------- |
| 400    | `VALIDATION_ERROR` | Missing required fields               |
| 401    | `UNAUTHORIZED`     | Not authenticated                     |
| 403    | `FORBIDDEN`        | Role not permitted to create listings |

---

### 5.5 POST `/chat/message`

**Request body:**

| Field               | Type          | Required | Notes                                                                                 |
| ------------------- | ------------- | -------- | ------------------------------------------------------------------------------------- |
| `message`           | string        | Yes      | The user's natural language query                                                     |
| `session_id`        | string (UUID) | No       | If provided, message is appended to existing session; if omitted, new session created |
| `area_filter`       | string        | No       | Constrains RAG retrieval to a specific area                                           |
| `user_type_context` | string        | No       | `tourist`, `investor`, or `student`; hints the response style                         |

**Success response (200):**

| Field         | Type    | Notes                                                                       |
| ------------- | ------- | --------------------------------------------------------------------------- |
| `session_id`  | string  | UUID of the conversation session                                            |
| `reply`       | string  | AI-generated response text (Arabic or English, matches query language)      |
| `sources`     | array   | Each source: `{title, type, id, score}` — provenance of retrieved knowledge |
| `tokens_used` | integer | LLM token consumption for this turn                                         |

**Possible errors:**

| Status | Error code               | Condition                                    |
| ------ | ------------------------ | -------------------------------------------- |
| 429    | `RATE_LIMIT_EXCEEDED`    | Daily message quota exhausted                |
| 503    | `AI_SERVICE_UNAVAILABLE` | LLM API unreachable and fallback also failed |

---

### 5.6 POST `/investments/:id/interest`

**Request body:**

| Field             | Type           | Required | Notes                             |
| ----------------- | -------------- | -------- | --------------------------------- |
| `message`         | string         | No       | Message to opportunity owner      |
| `contact_email`   | string (email) | Yes      | Investor's contact email          |
| `contact_phone`   | string         | No       | —                                 |
| `amount_proposed` | number         | No       | Proposed investment amount in EGP |

**Success response (201):**

| Field     | Type                            |
| --------- | ------------------------------- |
| `message` | string                          |
| `id`      | string — interest submission ID |

**Possible errors:**

| Status | Error code                   | Condition                                            |
| ------ | ---------------------------- | ---------------------------------------------------- |
| 403    | `ROLE_NOT_PERMITTED`         | Caller is not investor or merchant                   |
| 409    | `ALREADY_EXPRESSED_INTEREST` | User already submitted interest for this opportunity |
| 404    | `OPPORTUNITY_NOT_FOUND`      | —                                                    |

---

### 5.7 POST `/reviews`

**Request body:**

| Field         | Type        | Required | Notes                                     |
| ------------- | ----------- | -------- | ----------------------------------------- |
| `target_type` | string enum | Yes      | `listing` or `guide`                      |
| `target_id`   | string (ID) | Yes      | ID of the listing or guide being reviewed |
| `rating`      | integer     | Yes      | 1 to 5 inclusive                          |
| `body`        | string      | Yes      | Review text                               |
| `title`       | string      | No       | Optional short headline                   |

**Success response (201):** Returns the created review object including `id`, `user_name`, `rating`, `body`, `helpful_count`, `created_at`.

**Possible errors:**

| Status | Error code              | Condition                         |
| ------ | ----------------------- | --------------------------------- |
| 409    | `REVIEW_ALREADY_EXISTS` | User already reviewed this target |
| 404    | `TARGET_NOT_FOUND`      | Listing or guide does not exist   |

---

### 5.8 Common error envelope

All error responses share this shape:

```
{
  "error": "ERROR_CODE_SLUG",
  "details": [
    { "field": "email", "message": "must be a valid email address" }
  ]
}
```

`details` is optional and present only for validation errors. `field` within each detail item is omitted when the error is not field-specific.

---

## 6. API Design Issues

### 6.1 Naming Conventions — Canonical Paths

| Resource                            | Canonical Path                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Tourist attractions / guide content | `/attractions` for places, `/guides` for guide professionals                       |
| Investment opportunities            | `/investments` (plural, consistent with other resources)                           |
| Chat / AI assistant                 | `/chat` for user-facing, `/ai` for internal AI sub-features                        |
| Market listings                     | `/listings` for primary resource; `/market` only for aggregate/analytics sub-paths |
| My investment interests             | `GET /investments/mine/interests` (normalized to RESTful conventions)              |

---

### 6.2 Missing CRUD Operations

The following operations are not yet specified and require product decision before implementation:

| Resource                  | Missing operation               | Impact                                                                      |
| ------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Tourist guide attractions | `DELETE /guide/attractions/:id` | Cannot remove outdated content                                              |
| Tourist guide attractions | `PATCH /guide/attractions/:id`  | Only `PUT` (full replace) is planned; partial update needed                 |
| Chat sessions             | `PATCH /chat/session/:id`       | No way to rename or update session metadata                                 |
| Notifications             | `DELETE /:id`                   | Users cannot permanently remove notifications, only mark as read            |
| Reviews                   | `GET /reviews/:id`              | No direct fetch by ID — must go through parent resource                     |
| Admin: listings           | `DELETE /admin/listings/:id`    | Hard delete capability absent (only soft-delete through owner path)         |
| Users                     | `GET /users/me`                 | Absent from Users module; exists only under `/auth/me` — should be mirrored |

---

### 6.3 Redundant Round-Trip Patterns

| Pattern                                                                                                                               | Problem                                                                      | Recommendation                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| View tracking: `POST /listings/:id/views` is a separate call required after every `GET /listings/:id`                                 | Requires two requests to load a listing, with no transactional guarantee     | Increment view count server-side inside the `GET` handler (the client does not need to call it separately)                                |
| Creating a listing then uploading images via `POST /listings/:id/images`                                                              | Two required round trips before a listing is fully formed                    | Support `multipart/form-data` on `POST /listings` to accept images at creation time, keeping the upload endpoint for subsequent additions |
| Getting unread notification count via `GET /notifications/count` before listing notifications via `GET /notifications`                | Two requests to display the notification panel                               | Include `unread_count` in the paginated response envelope of `GET /notifications`                                                         |
| Booking a guide requires fetching guide list, then a specific guide's packages, then submitting a booking — three sequential requests | High latency on slower connections (target region has variable connectivity) | Add `GET /guides/:id/summary` that bundles profile, top packages, and availability in one response                                        |

---

### 6.4 Security Concerns

| Endpoint                         | Risk                                                                                                      | Recommendation                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /listings/:id/views`       | No auth required; could be abused to inflate view counts via scripts                                      | Require auth, or apply strict IP-based rate limiting regardless of auth state                                                                                               |
| `GET /investments/:id` (detail)  | RBAC matrix restricts detail to investors/merchants/admin, but endpoint table marks it as public          | Enforce role check; browsing summary is public, full detail (including contact info and documents) requires auth + role                                                     |
| `GET /chat/session/:session_id`  | Session IDs are UUIDs but marked "optional bearer" — unauthenticated users could enumerate sessions       | Session IDs must be cryptographically random; server should enforce that session belongs to the requesting user (or deny if no match)                                       |
| `GET /admin/*`                   | Admin endpoints require Bearer (admin) but no specification for how the gateway distinguishes admin roles | The gateway must validate the `role` claim inside the JWT for all `/admin/*` paths; services must not trust role solely from the `X-User-Role` header without re-validation |

---

## Open Decisions

- **`POST /listings/:id/views` auth requirement:** Decide whether to require authentication for view tracking or rely on IP-based rate limiting to prevent abuse.
- **`GET /investments/:id` access level:** The RBAC matrix restricts opportunity detail to investors/merchants/admin, but the endpoint table marks it as public. Decide which access level applies.
- **`GET /chat/session/:session_id` session ownership:** Decide whether unauthenticated sessions are retrievable at all, or whether all session access requires authentication and ownership verification.
- **Admin role validation at gateway level:** Decide whether the API gateway validates JWT `role` claims for `/admin/*` paths or whether individual services handle authorization.
- **Missing CRUD operations (Section 6.2):** Each missing operation requires a product decision on whether to implement, defer, or intentionally omit.
- **Redundant round-trip optimizations (Section 6.3):** Decide whether to implement the recommended consolidations (server-side view counting, multipart listing creation, bundled guide summary) at MVP or defer.

---

## Known Gaps

- **Bus/transport integration ("Wadeena Connects You"):** Intercity bus booking, seat reservation, and transport-to-New-Valley flow. No endpoints, no schema, and no operator data model exist. Deferred from MVP.
- **Wadi Exchange full B2B order/deal flow:** The seller offer -> buyer inquiry -> transaction flow for commodity trading has no endpoints. The MVP includes admin-curated crop prices (T10) but the full B2B commodity trading flow is deferred.
- **Phone OTP login:** Endpoint is defined but deferred from MVP. SMS provider selection is an open decision.
- **Google OAuth2 login:** Endpoint is defined but deferred from MVP.
- **Wallet and payments:** Full endpoint set defined but deferred from MVP. Payment integration (Paymob/Fawry) is post-MVP.
- **Notification broadcast/campaign:** Admin-only feature defined but deferred from MVP.
- **`GET /ai/recommendations`:** Personalized listing recommendations endpoint defined but absent from MVP implementation scope.
