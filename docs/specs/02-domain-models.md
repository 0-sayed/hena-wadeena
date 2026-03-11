# Domain Models — Hena Wadeena

> Tech-agnostic domain reference for schema design. Items requiring confirmation are flagged with **[TBD]**.

---

## Table of Contents

0. [Data Type Conventions](#data-type-conventions)
0.5. [Service Ownership Mapping](#service-ownership-mapping)
1. [Entity Catalog](#1-entity-catalog)
2. [Entity Relationships](#2-entity-relationships)
3. [Enums and Domain Constants](#3-enums-and-domain-constants)
4. [Business Rules and Constraints](#4-business-rules-and-constraints)
5. [Open Decisions](#open-decisions)
6. [Known Gaps](#known-gaps)
7. [Deferred / Post-MVP Entities](#7-deferred--post-mvp-entities)

---

## Data Type Conventions

| Convention | Rule | Example |
|---|---|---|
| **Monetary values** | Store as `integer` in **piasters** (قروش). 1 EGP = 100 piasters. Never use `float` or `real`. | `price: 2550` = 25.50 EGP |
| **Multi-currency** | Each monetary field has a companion `currency` column (default `EGP`). Store in the smallest unit of that currency. | USD → cents, EGP → piasters |
| **Timestamps** | All timestamp fields use `timestamptz` (timestamp with time zone). Never use `datetime` or bare `timestamp`. | `created_at: timestamptz` |
| **Primary keys** | All PKs use **UUID v7** (time-ordered). Never use `bigint auto-increment` or UUID v4. | `id: uuid` (v7) |
| **Geo fields** | PostGIS `geometry(Point, 4326)` for all geographic coordinates. | `location: geometry(Point, 4326)` |
| **Soft deletes** | `deleted_at timestamptz` (nullable) on applicable entities. `NULL` = not deleted. | `deleted_at: timestamptz` |
| **ORM** | Drizzle ORM — schema definitions are the source of truth. Zod DTOs are generated automatically via `drizzle-zod`. | |

> All `decimal` types listed in entity tables below should be implemented as `integer` (piasters) in the actual Drizzle schema. The domain model uses `decimal` as a logical type to indicate "monetary value" — the physical storage type is always `integer`.

**Special case — `entry_fee` (Attraction §1.8):** The `{adults_egp, children_egp, foreigners_usd}` object stores each sub-field as integer in its respective smallest unit (piasters for EGP fields, cents for USD field).

---

## Service Ownership Mapping

> **Canonical reference.** Each entity belongs to exactly one service and one PostgreSQL schema. Services do not cross-join schemas. Cross-service data is resolved via API calls or events only.

| Service | Schema | Entities |
|---------|--------|----------|
| **Identity** | `identity` | User, UserKYC, UserPreferences, SavedItem, AuthToken, OTPCode, AuditEvent, Notification |
| **Market** | `market` | Listing, PriceSnapshot, BusinessDirectory, Review *(listing reviews)*, InvestmentOpportunity, InvestmentApplication |
| **Guide-Booking** | `guide_booking` | TouristGuide (Attraction), Guide, TourPackage, Booking, GuideAvailability, Review *(guide/booking reviews)* |
| **Map** | `map` | PointOfInterest, CarpoolRide, CarpoolPassenger |
| **AI** | `ai` | ChatSession, KnowledgeBaseDocument |

**Notes:**
- There is **no standalone Investment service**. InvestmentOpportunity and InvestmentApplication live in the **Market service / market schema**.
- Reviews are split into two separate tables — one per service. There is **no cross-service polymorphic `reviews` table** with `target_type` + `target_id` spanning services; that would violate multi-service schema isolation.
- Files are not managed by a centralized file service. Each service handles its own file uploads via **S3 presigned PUT URLs**. See §1.26 for details.

---

## 1. Entity Catalog

### 1.1 User

Core identity record. All platform actors share this base entity; role differentiates behavior. Managed by the **Identity service** (`identity` schema).

> **Soft delete:** User records use a `status` field (`active` / `suspended` / `banned`) rather than `deleted_at`. There is no `deleted_at` on User.

| Field           | Type              | Notes                                     |
| --------------- | ----------------- | ----------------------------------------- |
| `id`            | UUID v7           | Primary key                               |
| `email`         | string            | Unique, optional (phone-only users exist) |
| `phone`         | string            | Unique, optional (email-only users exist) |
| `full_name`     | string            | Required                                  |
| `display_name`  | string            | Optional public-facing name               |
| `avatar_url`    | string            | URL to stored image                       |
| `password_hash` | string            | Hashed password; not nullable             |
| `role`          | `UserRole` enum   | Single role per user; see §3.1            |
| `status`        | `UserStatus` enum | `active` / `suspended` / `banned`         |
| `language`      | string            | `ar` \| `en`                              |
| `verified_at`   | timestamptz       | Null until email/phone verified           |
| `created_at`    | timestamptz       |                                           |
| `updated_at`    | timestamptz       |                                           |

**Related child records:** UserKYC, UserPreferences, SavedItems, Wallet (DEFERRED — post-hackathon)

---

### 1.2 UserKYC

Stores identity verification documents submitted by users who require them (investors, guides, merchants, students). Managed by the **Identity service** (`identity` schema).

| Field              | Type              | Notes                                                                  |
| ------------------ | ----------------- | ---------------------------------------------------------------------- |
| `id`               | UUID v7           |                                                                        |
| `user_id`          | UUID → User       |                                                                        |
| `doc_type`         | `KYCDocType` enum | `national_id` / `student_id` / `guide_license` / `commercial_register` |
| `doc_url`          | string            | Stored file reference                                                  |
| `status`           | `KYCStatus` enum  | `pending` / `approved` / `rejected`                                    |
| `reviewed_by`      | UUID → User       | Admin who reviewed                                                     |
| `reviewed_at`      | timestamptz       |                                                                        |
| `rejection_reason` | string            | Optional                                                               |

---

### 1.3 UserPreferences

One-to-one with User. Notification and content preferences. Managed by the **Identity service** (`identity` schema).

| Field             | Type        | Notes                                    |
| ----------------- | ----------- | ---------------------------------------- |
| `user_id`         | UUID → User | PK and FK                                |
| `notify_push`     | boolean     | Default true                             |
| `notify_email`    | boolean     | Default true                             |
| `notify_sms`      | boolean     | Default false                            |
| `preferred_areas` | string[]    | Area slugs from `Area` enum              |
| `interests`       | string[]    | `tourism` / `investment` / `real_estate` |

---

### 1.4 SavedItem

Bookmarks. A user can save any content-type entity for later reference. Managed by the **Identity service** (`identity` schema).

> **Cross-service isolation:** SavedItem stores only `item_type` + `item_id` references. The Identity service does **not** perform cross-schema foreign key joins to other services. `item_id` is a loose UUID reference; resolution happens via API call to the owning service at read time.

| Field        | Type        | Notes                                                            |
| ------------ | ----------- | ---------------------------------------------------------------- |
| `id`         | UUID v7     |                                                                  |
| `user_id`    | UUID → User |                                                                  |
| `item_type`  | string enum | `listing` / `guide` / `poi` / `opportunity` (enum, not freeform) |
| `item_id`    | UUID        | Loose reference to entity in the owning service (no FK join)     |
| `created_at` | timestamptz |                                                                  |

**Constraint:** Unique on `(user_id, item_type, item_id)`.

---

### 1.5 Listing (Market / Real Estate)

A property, land plot, or business for sale or rent within New Valley. Managed by the **Market service** (`market` schema).

> **Soft delete:** `deleted_at timestamptz` (nullable). Applies to this entity.

| Field            | Type                   | Notes                                        |
| ---------------- | ---------------------- | -------------------------------------------- |
| `id`             | UUID v7                |                                              |
| `owner_id`       | UUID → User            | Merchant or investor                         |
| `listing_type`   | `ListingType` enum     | `real_estate` / `land` / `business`          |
| `transaction`    | `TransactionType` enum | `sale` / `rent`                              |
| `title_ar`       | string                 | Required                                     |
| `title_en`       | string                 | Optional                                     |
| `description`    | string                 |                                              |
| `category`       | `ListingCategory` enum | See §3.9                                     |
| `sub_category`   | string                 | Finer classification within category         |
| `price`          | decimal                | Required                                     |
| `price_unit`     | string                 | Default `EGP`                                |
| `price_range`    | string                 | `$` / `$$` / `$$$` — relative cost indicator |
| `area_sqm`       | decimal                | Optional                                     |
| `location`       | geometry(Point, 4326)  | PostGIS geo point                            |
| `address`        | string                 |                                              |
| `district`       | string                 | Sub-area within governorate                  |
| `images`         | string[]               | File URLs                                    |
| `features`       | object                 | Flexible: `{rooms, bathrooms, floor, ...}`   |
| `amenities`      | string[]               | Facility tags                                |
| `tags`           | string[]               | Freeform tags for search                     |
| `contact`        | object                 | `{phone, whatsapp, email, website}`          |
| `opening_hours`  | string                 | Human-readable hours of operation            |
| `slug`           | string                 | URL-friendly unique identifier               |
| `status`         | `ListingStatus` enum   | `draft` / `active` / `sold` / `suspended`    |
| `is_verified`    | boolean                | Admin-approved flag                          |
| `is_featured`    | boolean                | Promoted listing                             |
| `featured_until` | timestamptz            | Null if not promoted                         |
| `is_published`   | boolean                | Owner-toggled visibility                     |
| `approved_by`    | UUID → User            | Admin who verified                           |
| `approved_at`    | timestamptz            |                                              |
| `rating_avg`     | decimal                | Denormalized from reviews                    |
| `review_count`   | integer                | Denormalized                                 |
| `views_count`    | integer                | Denormalized analytics                       |
| `created_at`     | timestamptz            |                                              |
| `updated_at`     | timestamptz            |                                              |
| `deleted_at`     | timestamptz            | Null = not deleted (soft delete)             |

---

### 1.6 PriceSnapshot

Aggregated market price data per district and listing type, computed by background jobs. Managed by the **Market service** (`market` schema).

| Field           | Type               | Notes                          |
| --------------- | ------------------ | ------------------------------ |
| `id`            | UUID v7            |                                |
| `district`      | string             |                                |
| `listing_type`  | `ListingType` enum |                                |
| `avg_price`     | decimal            |                                |
| `min_price`     | decimal            |                                |
| `max_price`     | decimal            |                                |
| `sample_count`  | integer            | Number of listings in snapshot |
| `snapshot_date` | date               |                                |

**Constraint:** Unique on `(district, listing_type, snapshot_date)`.

---

### 1.7 BusinessDirectory

A merchant's business profile, distinct from real-estate listings. Used for the B2B exchange / Wadi Exchange directory. Managed by the **Market service** (`market` schema).

| Field         | Type        | Notes                                           |
| ------------- | ----------- | ----------------------------------------------- |
| `id`          | UUID v7     |                                                 |
| `owner_id`    | UUID → User |                                                 |
| `name_ar`     | string      |                                                 |
| `name_en`     | string      |                                                 |
| `category`    | string      | e.g. `agriculture` / `retail` / `manufacturing` |
| `description` | string      |                                                 |
| `location`    | geometry(Point, 4326) | PostGIS geo point                     |
| `phone`       | string      |                                                 |
| `website`     | string      |                                                 |
| `logo_url`    | string      |                                                 |
| `status`      | string      | `active` / `inactive`                           |
| `created_at`  | timestamptz |                                                 |

---

### 1.8 TouristGuide (Attraction / Guide Entry)

A curated entry for a tourist attraction, historical site, or natural area. Managed by the **Guide-Booking service** (`guide_booking` schema).

> **Naming note:** The frontend calls these entries "Attractions". In the database they are stored in the `guide_booking` schema. `TouristGuide` is the internal entity name; it is **not** the same as the `Guide` (human tour guide) entity in §1.9.

> **Soft delete:** `deleted_at timestamptz` (nullable). Applies to this entity.

| Field              | Type                  | Notes                                                              |
| ------------------ | --------------------- | ------------------------------------------------------------------ |
| `id`               | UUID v7               |                                                                    |
| `name_ar`          | string                |                                                                    |
| `name_en`          | string                |                                                                    |
| `slug`             | string                | URL-friendly, unique                                               |
| `type`             | `GuideType` enum      | `attraction` / `historical` / `natural` / `festival` / `adventure` |
| `area`             | `Area` enum           | Which city/oasis                                                   |
| `description_ar`   | string                |                                                                    |
| `description_en`   | string                |                                                                    |
| `history_ar`       | string                | Long-form background text                                          |
| `best_season`      | string                | `winter` / `summer` / `all_year` / `spring`                        |
| `best_time_of_day` | string                | `morning` / `evening` / `any`                                      |
| `entry_fee`        | object                | `{adults_egp, children_egp, foreigners_usd}`                       |
| `opening_hours`    | string                | Human-readable                                                     |
| `duration_hours`   | decimal               | Recommended visit length                                           |
| `difficulty`       | string                | `easy` / `moderate` / `hard`; for activities                       |
| `tips`             | string[]              | Practical visitor tips                                             |
| `nearby`           | string[]              | Slugs of nearby guide entries                                      |
| `coordinates`      | geometry(Point, 4326) | PostGIS geo point                                                  |
| `images`           | string[]              |                                                                    |
| `thumbnail`        | string                |                                                                    |
| `is_active`        | boolean               |                                                                    |
| `is_featured`      | boolean               |                                                                    |
| `rating_avg`       | decimal               | Denormalized from reviews                                          |
| `review_count`     | integer               | Denormalized                                                       |
| `created_at`       | timestamptz           |                                                                    |
| `updated_at`       | timestamptz           |                                                                    |
| `deleted_at`       | timestamptz           | Null = not deleted (soft delete)                                   |

---

### 1.9 Guide (Human Tour Guide)

A licensed local guide who offers tour packages and accepts bookings. Managed by the **Guide-Booking service** (`guide_booking` schema).

> **Soft delete:** `deleted_at timestamptz` (nullable). Applies to this entity.

| Field              | Type        | Notes                                       |
| ------------------ | ----------- | ------------------------------------------- |
| `id`               | UUID v7     |                                             |
| `user_id`          | UUID → User | One-to-one                                  |
| `bio_ar`           | string      |                                             |
| `bio_en`           | string      |                                             |
| `languages`        | string[]    | e.g. `['ar', 'en', 'fr']`                   |
| `specialties`      | string[]    | e.g. `['history', 'desert', 'archaeology']` |
| `license_number`   | string      | Unique government-issued number             |
| `license_verified` | boolean     | Set by admin after KYC check                |
| `base_price`       | decimal     | Starting price per session                  |
| `currency`         | string      | Default `EGP`                               |
| `rating_avg`       | decimal     | Denormalized                                |
| `rating_count`     | integer     | Denormalized                                |
| `active`           | boolean     | Whether accepting new bookings              |
| `deleted_at`       | timestamptz | Null = not deleted (soft delete)            |

---

### 1.10 TourPackage

A specific, priced tour offering created by a guide. Managed by the **Guide-Booking service** (`guide_booking` schema).

> **Soft delete:** `deleted_at timestamptz` (nullable). Applies to this entity.

| Field          | Type         | Notes                                                                                     |
| -------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `id`           | UUID v7      |                                                                                           |
| `guide_id`     | UUID → Guide |                                                                                           |
| `title_ar`     | string       |                                                                                           |
| `title_en`     | string       |                                                                                           |
| `description`  | string       |                                                                                           |
| `duration_hrs` | decimal      |                                                                                           |
| `max_people`   | integer      | Capacity limit                                                                            |
| `price`        | decimal      | Per booking (not per person) [TBD — confirm whether pricing is per-booking or per-person] |
| `includes`     | string[]     | What is covered (transport, meals, etc.)                                                  |
| `images`       | string[]     |                                                                                           |
| `status`       | string       | `active` / `inactive`                                                                     |
| `deleted_at`   | timestamptz  | Null = not deleted (soft delete)                                                          |

---

### 1.11 Booking / Reservation

A tourist's reservation of a guide tour package. Managed by the **Guide-Booking service** (`guide_booking` schema).

| Field           | Type                 | Notes                                       |
| --------------- | -------------------- | ------------------------------------------- |
| `id`            | UUID v7              |                                             |
| `package_id`    | UUID → TourPackage   |                                             |
| `guide_id`      | UUID → Guide         | Denormalized for direct lookup              |
| `tourist_id`    | UUID → User          |                                             |
| `booking_date`  | date                 | Date of the tour                            |
| `start_time`    | time                 |                                             |
| `people_count`  | integer              |                                             |
| `total_price`   | decimal              | Computed and locked at booking time         |
| `status`        | `BookingStatus` enum | See §3.5                                    |
| `payment_ref`   | UUID                 | DEFERRED — Reference to transaction in Payment service (post-hackathon) |
| `notes`         | string               | Tourist requests                            |
| `cancelled_at`  | timestamptz          |                                             |
| `cancel_reason` | string               |                                             |
| `created_at`    | timestamptz          |                                             |

---

### 1.12 GuideAvailability

Calendar of blocked dates for a guide (unavailable days). Managed by the **Guide-Booking service** (`guide_booking` schema).

| Field        | Type         | Notes           |
| ------------ | ------------ | --------------- |
| `id`         | UUID v7      |                 |
| `guide_id`   | UUID → Guide |                 |
| `date`       | date         |                 |
| `is_blocked` | boolean      |                 |
| `note`       | string       | Optional reason |

**Constraint:** Unique on `(guide_id, date)`.

---

### 1.13 Market Review (Listing Review)

A post-visit rating and comment on a **listing**. Managed by the **Market service** (`market` schema), stored in the `market.reviews` table.

> **No cross-service polymorphic table.** Reviews are split by service. There is no single `reviews` table with `target_type` + `target_id` that spans services — this would violate multi-service schema isolation. Listing reviews live in `market.reviews`; guide/booking reviews live in `guide_booking.reviews`.

| Field               | Type              | Notes                                        |
| ------------------- | ----------------- | -------------------------------------------- |
| `id`                | UUID v7           |                                              |
| `listing_id`        | UUID → Listing    | The listing being reviewed                   |
| `reviewer_id`       | UUID → User       | Author                                       |
| `rating`            | integer           | 1–5 inclusive                                |
| `title`             | string            | Optional headline                            |
| `comment`           | string            | Review body text                             |
| `helpful_count`     | integer           | Other users marking it helpful               |
| `is_verified_visit` | boolean           | Future: check-in confirmation                |
| `is_active`         | boolean           | Soft-deletable by admin                      |
| `images`            | string[]          | Review photos                                |
| `created_at`        | timestamptz       |                                              |
| `updated_at`        | timestamptz       |                                              |

**Constraint:** One review per user per listing — unique on `(reviewer_id, listing_id)`.

---

### 1.13b Guide-Booking Review (Guide / Tour Review)

A post-tour rating and comment on a completed booking. Managed by the **Guide-Booking service** (`guide_booking` schema), stored in the `guide_booking.reviews` table.

> **No cross-service polymorphic table.** See note in §1.13 above.

| Field           | Type           | Notes                                       |
| --------------- | -------------- | ------------------------------------------- |
| `id`            | UUID v7        |                                             |
| `booking_id`    | UUID → Booking | The completed booking being reviewed        |
| `guide_id`      | UUID → Guide   | Denormalized for direct guide lookup        |
| `reviewer_id`   | UUID → User    | Author (tourist)                            |
| `rating`        | integer        | 1–5 inclusive                               |
| `title`         | string         | Optional headline                           |
| `comment`       | string         | Review body text                            |
| `guide_reply`   | string         | Guide's response text                       |
| `helpful_count` | integer        | Other users marking it helpful              |
| `is_active`     | boolean        | Soft-deletable by admin                     |
| `images`        | string[]       | Review photos                               |
| `created_at`    | timestamptz    |                                             |
| `updated_at`    | timestamptz    |                                             |

**Constraint:** One review per booking — unique on `(booking_id)`. Reviews on guides are gated on the associated booking reaching `completed` status.

---

### 1.14 InvestmentOpportunity

A project, land plot, or business venture posted for investor interest. Managed by the **Market service** (`market` schema).

> **Service ownership:** InvestmentOpportunity belongs to the **Market service** (`market` schema). There is no standalone Investment service.

| Field                  | Type                     | Notes                                                 |
| ---------------------- | ------------------------ | ----------------------------------------------------- |
| `id`                   | UUID v7                  |                                                       |
| `owner_id`             | UUID → User              | Investor or merchant who posted it                    |
| `title_ar`             | string                   |                                                       |
| `title_en`             | string                   |                                                       |
| `description`          | string                   |                                                       |
| `sector`               | `InvestmentSector` enum  | See §3.3                                              |
| `area`                 | string                   | Geographic location / district                        |
| `land_area_sqm`        | decimal                  | Optional                                              |
| `min_investment`       | decimal                  |                                                       |
| `max_investment`       | decimal                  |                                                       |
| `currency`             | string                   | Default `EGP`                                         |
| `expected_return_pct`  | decimal                  | 0–100, optional                                       |
| `payback_period_years` | decimal                  | Optional                                              |
| `incentives`           | string[]                 | e.g. `tax_exemption`, `land_subsidy`                  |
| `infrastructure`       | object                   | `{water, electricity, road_access, telecom}` booleans |
| `contact`              | object                   | `{entity, person, phone, email}`                      |
| `documents`            | string[]                 | File URLs for brochures/PDFs                          |
| `images`               | string[]                 |                                                       |
| `status`               | `OpportunityStatus` enum | `draft` / `review` / `active` / `closed`              |
| `source`               | string                   | `GAFI` / `governorate` / `private`                    |
| `expires_at`           | date                     |                                                       |
| `is_verified`          | boolean                  |                                                       |
| `is_featured`          | boolean                  |                                                       |
| `interest_count`       | integer                  | Denormalized count of applications                    |
| `approved_by`          | UUID → User              | Admin who verified                                    |
| `approved_at`          | timestamptz              |                                                       |
| `created_at`           | timestamptz              |                                                       |
| `updated_at`           | timestamptz              |                                                       |

---

### 1.15 InvestmentApplication (Expression of Interest)

An investor's formal expression of interest in an opportunity. Managed by the **Market service** (`market` schema).

> **Service ownership:** InvestmentApplication belongs to the **Market service** (`market` schema). There is no standalone Investment service.

| Field             | Type                         | Notes                                                                                                                                   |
| ----------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | UUID v7                      |                                                                                                                                         |
| `opportunity_id`  | UUID → InvestmentOpportunity |                                                                                                                                         |
| `investor_id`     | UUID → User                  |                                                                                                                                         |
| `amount_proposed` | decimal                      | Optional                                                                                                                                |
| `message`         | string                       | Optional message to opportunity owner                                                                                                   |
| `contact_email`   | string                       |                                                                                                                                         |
| `contact_phone`   | string                       |                                                                                                                                         |
| `documents`       | string[]                     | Supporting documents                                                                                                                    |
| `status`          | `ApplicationStatus` enum     | `pending` / `reviewed` / `accepted` / `rejected` / `withdrawn` / `contacted` / `closed` [TBD — confirm `contacted` and `closed` values] |
| `created_at`      | timestamptz                  |                                                                                                                                         |

**Constraint:** Unique on `(investor_id, opportunity_id)`.

---

### 1.16 Notification

An in-app notification record. Also drives push, email, and SMS dispatch. Managed by the **Identity service** (`identity` schema).

| Field        | Type                    | Notes                                                     |
| ------------ | ----------------------- | --------------------------------------------------------- |
| `id`         | UUID v7                 |                                                           |
| `user_id`    | UUID → User             | Recipient                                                 |
| `type`       | `NotificationType` enum | See §3.8                                                  |
| `title_ar`   | string                  |                                                           |
| `title_en`   | string                  |                                                           |
| `body_ar`    | string                  |                                                           |
| `body_en`    | string                  |                                                           |
| `data`       | object                  | Flexible payload: `{booking_id, amount, guide_name, ...}` |
| `channel`    | string[]                | `push` / `email` / `sms` / `in_app`                       |
| `read_at`    | timestamptz             | Null = unread                                             |
| `sent_at`    | timestamptz             |                                                           |
| `created_at` | timestamptz             |                                                           |

---

### 1.17 NotificationCampaign

> **DEFERRED — not in roadmap.** NotificationCampaign is not part of the MVP roadmap. Retained here for future reference only. Do not implement for the hackathon.

An admin-created broadcast message targeting user segments.

| Field          | Type        | Notes                          |
| -------------- | ----------- | ------------------------------ |
| `id`           | UUID v7     |                                |
| `title`        | string      | Internal label                 |
| `body_ar`      | string      |                                |
| `body_en`      | string      |                                |
| `target_roles` | string[]    | Which roles receive it         |
| `channel`      | string[]    | Delivery channels              |
| `status`       | string      | `draft` / `scheduled` / `sent` |
| `scheduled_at` | timestamptz |                                |
| `sent_at`      | timestamptz |                                |
| `created_by`   | UUID → User | Admin                          |

---

### 1.18 PointOfInterest (POI)

A geographic location of interest on the map — hotels, restaurants, landmarks, government offices, etc. Broader scope than `TouristGuide` entries; includes everyday service locations. Managed by the **Map service** (`map` schema).

> **Soft delete:** `deleted_at timestamptz` (nullable). Applies to this entity.

| Field          | Type                  | Notes                                                                  |
| -------------- | --------------------- | ---------------------------------------------------------------------- |
| `id`           | UUID v7               |                                                                        |
| `name_ar`      | string                |                                                                        |
| `name_en`      | string                |                                                                        |
| `description`  | string                |                                                                        |
| `category`     | string                | `hotel` / `restaurant` / `landmark` / `government` / `pharmacy` / etc. |
| `location`     | geometry(Point, 4326) | PostGIS geo point                                                      |
| `address`      | string                |                                                                        |
| `phone`        | string                |                                                                        |
| `website`      | string                |                                                                        |
| `images`       | string[]              |                                                                        |
| `rating_avg`   | decimal               | Denormalized                                                           |
| `rating_count` | integer               | Denormalized                                                           |
| `status`       | `POIStatus` enum      | `pending` / `approved` / `rejected`                                    |
| `submitted_by` | UUID → User           |                                                                        |
| `approved_by`  | UUID → User           | Admin                                                                  |
| `created_at`   | timestamptz           |                                                                        |
| `deleted_at`   | timestamptz           | Null = not deleted (soft delete)                                       |

---

### 1.19 CarpoolRide

A shared-ride posting. A driver offers seats on a specific route and departure time. Managed by the **Map service** (`map` schema).

| Field              | Type                  | Notes                                                                   |
| ------------------ | --------------------- | ----------------------------------------------------------------------- |
| `id`               | UUID v7               |                                                                         |
| `driver_id`        | UUID → User           |                                                                         |
| `origin`           | geometry(Point, 4326) | PostGIS geo point                                                       |
| `destination`      | geometry(Point, 4326) | PostGIS geo point                                                       |
| `origin_name`      | string                | Human-readable                                                          |
| `destination_name` | string                |                                                                         |
| `departure_time`   | timestamptz           |                                                                         |
| `seats_total`      | integer               |                                                                         |
| `seats_taken`      | integer               | Updated as passengers join                                              |
| `price_per_seat`   | decimal               | Optional — free rides allowed. MVP is free/cash only (no payment integration) |
| `notes`            | string                |                                                                         |
| `status`           | `RideStatus` enum     | `open` / `full` / `cancelled` / `completed`                             |
| `created_at`       | timestamptz           |                                                                         |

---

### 1.20 CarpoolPassenger

A user's booking of a seat on a carpool ride. Managed by the **Map service** (`map` schema).

| Field       | Type                   | Notes                                 |
| ----------- | ---------------------- | ------------------------------------- |
| `id`        | UUID v7                |                                       |
| `ride_id`   | UUID → CarpoolRide     |                                       |
| `user_id`   | UUID → User            |                                       |
| `seats`     | integer                | Number of seats requested             |
| `status`    | `PassengerStatus` enum | `pending` / `confirmed` / `cancelled` |
| `joined_at` | timestamptz            |                                       |

---

### 1.21 FileReference (Media)

> **No centralized file service.** There is no dedicated File service. Files are uploaded directly to S3 via **presigned PUT URLs** issued by whichever service owns the entity (Market service for listing images, Guide-Booking service for guide/tour images, Identity service for KYC documents, etc.). This entity represents optional metadata that a service may persist locally — it is not a shared cross-service registry.

Metadata record for every uploaded file (images, PDFs, brochures).

| Field           | Type        | Notes                                                               |
| --------------- | ----------- | ------------------------------------------------------------------- |
| `id`            | UUID v7     |                                                                     |
| `original_name` | string      | As uploaded by user                                                 |
| `stored_name`   | string      | UUID-based filename                                                 |
| `file_path`     | string      | AWS S3 bucket path                                                  |
| `url`           | string      | Public-facing URL                                                   |
| `mime_type`     | string      | e.g. `image/jpeg`, `application/pdf`                                |
| `size_bytes`    | integer     |                                                                     |
| `category`      | string      | `listing_image` / `guide_image` / `document` / `avatar` / `kyc_doc` |
| `ref_id`        | UUID        | Polymorphic reference to owning entity within the same service      |
| `uploaded_by`   | UUID → User |                                                                     |
| `created_at`    | timestamptz |                                                                     |

---

### 1.22 ChatSession

A conversation session with the AI assistant (Imagine chatbot). Sessions have a TTL and expire after 30 days of inactivity. Managed by the **AI service** (`ai` schema).

| Field               | Type        | Notes                                              |
| ------------------- | ----------- | -------------------------------------------------- |
| `id`                | UUID v7     |                                                    |
| `session_id`        | string      | Public-facing UUID, indexed                        |
| `user_id`           | UUID → User | Null for anonymous users                           |
| `messages`          | array       | Embedded message objects (see below)               |
| `area_context`      | string      | Active area filter for RAG retrieval               |
| `user_type_context` | string      | `tourist` / `investor` / `student` — hints for LLM |
| `metadata`          | object      | `{total_tokens, message_count}`                    |
| `created_at`        | timestamptz |                                                    |
| `updated_at`        | timestamptz |                                                    |
| `expires_at`        | timestamptz | TTL-based expiry (30 days)                         |

**Embedded message object:**

| Field       | Type        | Notes                                               |
| ----------- | ----------- | --------------------------------------------------- |
| `role`      | string      | `user` / `assistant` / `system`                     |
| `content`   | string      | Message text                                        |
| `sources`   | array       | On assistant messages: `[{title, type, id, score}]` |
| `timestamp` | timestamptz |                                                     |

---

### 1.23 KnowledgeBaseDocument

A text chunk ingested into the RAG vector index. Bridges PostgreSQL (ai schema) and Qdrant. Managed by the **AI service** (`ai` schema).

> **Soft delete:** `deleted_at timestamptz` (nullable). Applies to this entity.

| Field             | Type        | Notes                                                          |
| ----------------- | ----------- | -------------------------------------------------------------- |
| `id`              | UUID v7     |                                                                |
| `source_type`     | string      | `guide` / `listing` / `investment` / `general` / `poi` / `faq` |
| `source_ref_id`   | UUID        | FK back to the originating entity                              |
| `chunk_index`     | integer     | Position within the parent document                            |
| `content`         | string      | Text chunk (max ~400 tokens)                                   |
| `content_ar`      | string      | Arabic version if available                                    |
| `metadata`        | object      | `{title, area, category, source_name}`                         |
| `vector_store_id` | string      | UUID used in the external vector store                         |
| `embedded_model`  | string      | Which model produced the vector                                |
| `embedded_at`     | timestamptz |                                                                |
| `content_hash`    | string      | MD5 for deduplication                                          |
| `deleted_at`      | timestamptz | Null = not deleted (soft delete)                               |

---

### 1.24 AuthToken (Session / Refresh Token)

Tracks issued refresh tokens for revocation and auditing. Managed by the **Identity service** (`identity` schema).

| Field        | Type        | Notes                       |
| ------------ | ----------- | --------------------------- |
| `id`         | UUID v7     |                             |
| `user_id`    | UUID → User |                             |
| `token_hash` | string      | Hashed token value, unique  |
| `device_id`  | string      | Optional device fingerprint |
| `ip_address` | string      |                             |
| `expires_at` | timestamptz |                             |
| `revoked_at` | timestamptz | Null if still valid         |
| `created_at` | timestamptz |                             |

---

### 1.25 OTPCode

Short-lived one-time passwords for login, password reset, and phone/email verification. Managed by the **Identity service** (`identity` schema).

| Field        | Type        | Notes                         |
| ------------ | ----------- | ----------------------------- |
| `id`         | UUID v7     |                               |
| `target`     | string      | Phone number or email address |
| `purpose`    | string      | `login` / `reset` / `verify`  |
| `code_hash`  | string      | Hashed code value             |
| `expires_at` | timestamptz |                               |
| `used_at`    | timestamptz | Null until consumed           |
| `attempts`   | integer     | Failed attempt counter        |

---

### 1.26 AuditEvent (Auth Event Log)

Immutable security log of authentication actions. Managed by the **Identity service** (`identity` schema).

| Field        | Type        | Notes                                              |
| ------------ | ----------- | -------------------------------------------------- |
| `id`         | UUID v7     | Primary key — UUID v7, not bigint auto             |
| `user_id`    | UUID → User | Nullable (failed logins may have no user)          |
| `event_type` | string      | `login` / `logout` / `failed` / `password_changed` |
| `ip_address` | string      |                                                    |
| `user_agent` | string      |                                                    |
| `created_at` | timestamptz |                                                    |

---

## 2. Entity Relationships

### 2.1 Core Relationship Map

```
User 1────< UserKYC           (one user, many KYC documents)
User 1────1 UserPreferences   (one-to-one)
User 1────< SavedItem         (one user, many saved items)
User 1────1 Wallet            (one-to-one, role-conditional) [DEFERRED]
User 1────< AuthToken         (one user, many refresh tokens)
User 1────< AuditEvent        (one user, many auth log entries)
User 1────1 Guide             (one-to-one: user becomes a guide)
Guide 1────< TourPackage      (one guide, many packages)
Guide 1────< Booking          (one guide, many bookings)
Guide 1────< GuideAvailability(one guide, many blocked dates)
TourPackage 1────< Booking    (one package, many bookings)
Booking 1────1 Review         (one booking produces at most one guide/booking review)
Booking 1────1 Escrow         (one booking has one escrow record) [DEFERRED]

User 1────< Listing           (owner creates many listings)
User 1────< BusinessDirectory (owner has many business entries)
Listing 1────< Review         (market.reviews: listing receives reviews)

User 1────< InvestmentOpportunity  (owner posts opportunities — Market service)
InvestmentOpportunity 1────< InvestmentApplication
User 1────< InvestmentApplication  (investor applies to many)

User 1────< CarpoolRide       (driver posts rides)
CarpoolRide 1────< CarpoolPassenger
User 1────< CarpoolPassenger  (passenger joins rides)

User 1────< Notification      (one user, many notifications)
User 1────< ChatSession       (one user, many sessions; also anonymous)
ChatSession 1────< KnowledgeBaseDocument (via source citations in messages)

Wallet 1────< Transaction     (one wallet, many transactions) [DEFERRED]
User 1────< PayoutRequest     (one user, many payout requests) [DEFERRED]
User 1────< Subscription      (one user, many subscriptions over time) [DEFERRED]
```

### 2.2 Cross-Service Relationship Table

Services do not join databases directly. The following cross-service links are maintained via events or API calls:

| Originating Service  | Field / Event                  | References              | Resolution Method       |
| -------------------- | ------------------------------ | ----------------------- | ----------------------- |
| Notification Service | `notification.data.booking_id` | Guide Service booking   | Deep-link; no join      |
| AI Service           | `source_ref_id` in KB doc      | Any content entity      | PostgreSQL lookup       |

---

## 3. Enums and Domain Constants

### 3.1 UserRole

All 8 roles are in MVP.

| Value      | Arabic      | Description                       |           Requires KYC           | Has Wallet |
| ---------- | ----------- | --------------------------------- | :------------------------------: | :--------: |
| `tourist`  | سائح        | Default; visitors and travelers   |                No                |     No     |
| `resident` | مواطن محلي  | New Valley residents              |                No                |     No     |
| `student`  | طالب        | Students seeking housing/services |         Yes (student_id)         |     No     |
| `merchant` | تاجر        | Business owners with listings     |    Yes (commercial register)     |    Yes     |
| `driver`   | سائق        | Carpool and transport drivers     |                No                |     No     |
| `guide`    | دليل سياحي  | Licensed tour guides              |        Yes (license + ID)        |    Yes     |
| `investor` | مستثمر      | Business/real-estate investors    | Yes (national_id + business doc) |    Yes     |
| `admin`    | مشرف        | Platform operations team          |               Yes                |     No     |

**Role Hierarchy:**

```
admin > {merchant, guide, investor, student, tourist, resident, driver}
resident and tourist share the same permission level
```

---

### 3.2 UserStatus

| Value       | Meaning                               |
| ----------- | ------------------------------------- |
| `active`    | Normal account                        |
| `suspended` | Temporarily restricted (admin action) |
| `banned`    | Permanently blocked                   |

---

### 3.3 InvestmentSector

| Value         | Arabic    |
| ------------- | --------- |
| `agriculture` | زراعة     |
| `tourism`     | سياحة     |
| `industry`    | صناعة     |
| `real_estate` | عقارات    |
| `services`    | خدمات     |
| `technology`  | تكنولوجيا |
| `energy`      | طاقة      |

---

### 3.4 Area (Geographic Zones)

| Value (Arabic) | English Name | Coordinates          |
| -------------- | ------------ | -------------------- |
| `الخارجة`      | Al-Kharga    | 25.4397°N, 30.5490°E |
| `الداخلة`      | Al-Dakhla    | 25.4895°N, 28.9818°E |
| `الفرافرة`     | Al-Farafra   | 27.0603°N, 27.9723°E |
| `باريس`        | Baris        | 24.7006°N, 30.7058°E |
| `بلاط`         | Balat        | 25.6055°N, 29.0620°E |

---

### 3.5 BookingStatus

| Value         | Meaning                                            |
| ------------- | -------------------------------------------------- |
| `pending`     | Tourist has requested; awaiting guide confirmation |
| `confirmed`   | Guide accepted the booking                         |
| `in_progress` | Tour is currently happening                        |
| `completed`   | Tour finished                                      |
| `cancelled`   | Cancelled by either party                          |

---

### 3.6 ListingStatus

| Value       | Meaning                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| `draft`     | Created but not yet published                                                                |
| `active`    | Visible and searchable                                                                       |
| `sold`      | Sale completed                                                                               |
| `rented`    | Rental transaction completed [TBD — confirm whether `rented` is needed as a distinct status] |
| `suspended` | Hidden by admin or owner                                                                     |

---

### 3.7 OpportunityStatus

| Value    | Meaning                            |
| -------- | ---------------------------------- |
| `draft`  | Owner working on it; not published |
| `review` | Awaiting admin approval            |
| `active` | Visible to investors               |
| `closed` | No longer accepting applications   |
| `taken`  | Opportunity is claimed             |

---

### 3.8 NotificationType

| Value               | Trigger                                                 |
| ------------------- | ------------------------------------------------------- |
| `booking_confirmed` | Guide accepts a booking request                         |
| `booking_requested` | New booking request arrives for guide                   |
| `booking_cancelled` | Booking cancelled by either party                       |
| `payment_received`  | Wallet credited                                         |
| `payout_processed`  | Payout sent to guide/merchant                           |
| `kyc_approved`      | KYC document verified by admin                          |
| `kyc_rejected`      | KYC document rejected with reason                       |
| `listing_featured`  | Listing promoted to featured status                     |
| `new_review`        | Guide receives a review                                 |
| `carpool_match`     | Matching carpool ride found                             |
| `investment_update` | Update on an opportunity the user expressed interest in |
| `review_reply`      | Guide replied to user's review                          |
| `system`            | General platform announcements                          |
| `otp`               | Authentication or verification code                     |

---

### 3.9 ListingCategory

| Value           | Meaning                                 |
| --------------- | --------------------------------------- |
| `place`         | General place of interest               |
| `accommodation` | Hotels, hostels, apartments             |
| `restaurant`    | Dining and cafes                        |
| `service`       | General services (pharmacy, bank, etc.) |
| `activity`      | Activities and entertainment            |
| `transport`     | Transportation services                 |
| `education`     | Schools, universities                   |
| `healthcare`    | Hospitals, clinics                      |
| `shopping`      | Retail                                  |

---

### 3.10 GuideType (Attraction Type)

| Value        | Meaning                                 |
| ------------ | --------------------------------------- |
| `attraction` | General tourist attraction              |
| `historical` | Ancient or heritage site                |
| `natural`    | Desert, oasis, geological feature       |
| `festival`   | Seasonal cultural events                |
| `adventure`  | Activity-based (dune bashing, trekking) |

---

### 3.11 TransactionType (Payment)

| Value            | Direction | Meaning                                  |
| ---------------- | --------- | ---------------------------------------- |
| `topup`          | credit    | User adds funds to wallet                |
| `booking_pay`    | debit     | Tourist pays for a tour                  |
| `escrow_hold`    | debit     | Funds frozen pending tour completion     |
| `escrow_release` | credit    | Funds released to guide after completion |
| `payout`         | debit     | Guide/merchant withdraws earnings        |
| `refund`         | credit    | Refund to tourist's wallet               |
| `subscription`   | debit     | Recurring plan payment                   |

---

### 3.12 KYCDocType

| Value                 | Used By            |
| --------------------- | ------------------ |
| `national_id`         | All verified roles |
| `student_id`          | Students           |
| `guide_license`       | Guides             |
| `commercial_register` | Merchants          |
| `business_doc`        | Investors          |

---

### 3.13 KYCStatus

| Value      | Meaning                    |
| ---------- | -------------------------- |
| `pending`  | Submitted, awaiting review |
| `approved` | Verified by admin          |
| `rejected` | Rejected with reason       |

---

### 3.14 POIStatus

| Value      | Meaning                                |
| ---------- | -------------------------------------- |
| `pending`  | Submitted by user; awaiting moderation |
| `approved` | Visible on map                         |
| `rejected` | Rejected by admin                      |

---

### 3.15 CarpoolRideStatus

| Value       | Meaning                  |
| ----------- | ------------------------ |
| `open`      | Accepting passengers     |
| `full`      | No seats available       |
| `cancelled` | Ride cancelled by driver |
| `completed` | Ride has occurred        |

---

### 3.16 SubscriptionPlan

| Value               | For Role | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `guide_basic`       | guide    | Basic visibility and booking features |
| `guide_pro`         | guide    | Premium placement and analytics       |
| `merchant_featured` | merchant | Featured listing promotion            |

---

## 4. Business Rules and Constraints

### 4.1 What Makes a Listing Valid / Publishable?

A listing moves from `draft` to `active` status only when:

1. `title_ar` is present and non-empty.
2. `price` is a positive number.
3. `listing_type` and `transaction` are set to valid enum values.
4. `location` coordinates are provided (geo point must be within Egypt bounds) [TBD — confirm geographic validation bounds].
5. `owner_id` belongs to a user with role `merchant`, `investor`, or `resident`.
6. At least one image is uploaded [TBD — confirm whether images are required for publishing].

`is_verified` is an independent admin-approval flag. It is distinct from the `active` status transition — a listing may be `active` (owner-toggled) but still `is_verified: false` pending admin review [TBD — confirm whether `is_verified` is required before public visibility].

For **TouristGuide/Attraction** entries, admin must create them directly — they are not user-submitted.

For **InvestmentOpportunity**, an admin must approve it (status `review` → `active`). Auto-publish is not allowed.

---

### 4.2 What Makes a Booking Confirmed?

1. `tourist_id` maps to a real, active user.
2. `guide_id` maps to a guide with `active = true` and `license_verified = true`.
3. `booking_date` is not in a guide's `GuideAvailability.is_blocked` dates.
4. `people_count` does not exceed `TourPackage.max_people`.
5. Guide explicitly accepts the request (status changes from `pending` → `confirmed`). MVP booking is direct guide acceptance — no payment or escrow hold required.

---

### 4.3 Cancellation Rules

**Tourist cancels:**

- Before confirmation: Booking deleted; no financial impact (escrow not yet created).
- After confirmation but before tour: Refund policy applies [TBD — confirm partial refund rules and time-based refund tiers]. The `Escrow` record would transition to `refunded`.
- After tour starts (`in_progress`): No refund [TBD — confirm no-refund policy once tour begins].

**Guide cancels:**

- Full refund to tourist's wallet at any point.
- Guide's `GuideAvailability` should be updated to block the affected date.

**Admin can cancel any booking** and issue a refund via the payment service.

---

### 4.4 Review Constraints

1. A guide/booking review may only be written after the associated `Booking` reaches `completed` status (`guide_booking.reviews`). Listing reviews do not require a booking (`market.reviews`).
2. Guide/booking reviews: one per booking — unique on `(booking_id)` in `guide_booking.reviews`. Listing reviews: one per user per listing — unique on `(reviewer_id, listing_id)` in `market.reviews`.
3. Rating must be an integer between 1 and 5 inclusive.
4. `rating_avg` and `review_count` on the parent entity (`Listing`, `TouristGuide`, `Guide`) must be recomputed after every review create/update/soft-delete.
5. Reviews can be soft-deleted by admins (`is_active = false`) but the rating recalculation excludes inactive reviews.

---

### 4.5 Ownership and Permission Constraints

| Entity                | Create                            | Update                                      | Delete                       |
| --------------------- | --------------------------------- | ------------------------------------------- | ---------------------------- |
| Listing               | Owner (merchant/investor/resident)| Owner or admin                              | Owner or admin (soft delete) |
| TouristGuide entry    | Admin only                        | Admin only                                  | Admin only                   |
| TourPackage           | Guide (own)                       | Guide (own) or admin                        | Guide (own) or admin         |
| Booking               | Tourist                           | Guide (confirm/complete/cancel)             | Admin only                   |
| Review                | Reviewer (own)                    | Reviewer (own)                              | Reviewer (own) or admin      |
| InvestmentOpportunity | Investor or merchant              | Owner or admin                              | Owner or admin               |
| InvestmentApplication | Investor (own)                    | Owner (status change) / investor (withdraw) | Investor (own)               |
| POI                   | Any authenticated user (pending)  | Admin only (post-approval)                  | Admin only                   |
| CarpoolRide           | Driver (own)                      | Driver (own)                                | Driver (own)                 |
| Notification          | System / admin                    | Recipient (mark read)                       | N/A                          |
| User                  | Self-register                     | Self or admin                               | Self or admin                |

---

### 4.6 KYC and Verification Rules

1. Roles requiring verification (`student`, `investor`, `guide`, `merchant`) must upload at least one KYC document before they gain elevated permissions.
2. KYC approval is a manual admin action — no auto-approval.
3. A rejected KYC allows resubmission [TBD — confirm whether there is a limit on resubmission count].
4. A guide must have `license_verified = true` (a subset of KYC approval specific to the guide profile) before their tour packages appear in search results.

---

### 4.7 Wallet and Payment Constraints

> **DEFERRED — post-hackathon.** Payment integration (Paymob/Fawry), wallets, escrow, and subscriptions are not in the MVP scope. Retained for future reference.

1. A wallet debit must never result in a negative balance — the operation must be rejected if `balance < amount`.
2. `balance_after` in Transaction is a snapshot at time of write; it must equal the wallet's `balance` after the operation completes.
3. Escrow `released` events trigger payout to guide's wallet, not direct bank transfer. Bank transfer happens only via an explicit `PayoutRequest`.
4. Idempotency: Payment initiations use an idempotency key (stored in Redis) to prevent duplicate charges on network retries.
5. Subscriptions grant elevated features; a subscription cancellation does not immediately revoke access — access continues until `current_period_end`.

---

### 4.8 Data Freshness and Caching Rules

1. Listing `rating_avg` and `review_count` are **denormalized** and must be updated on every review event.
2. `PriceSnapshot` records are generated by a background cron job and are aggregated views, not source data.
3. Cache layer keys carry TTLs: listing detail (10 min), guide list (30 min), investment list (10 min). Cache must be invalidated on update.
4. `ChatSession` records expire after 30 days via a TTL index.
5. `KnowledgeBaseDocument` records are updated by a nightly re-indexing job. Live content changes may be stale in the RAG index for up to 24 hours.

---

### 4.9 Search and Indexing Rules

1. Only `active` listings, `approved` POIs, `active` investment opportunities, and `active` guides are searchable.
2. `draft`, `suspended`, `sold`, and `rejected` records are excluded from search results.
3. Search is implemented via PostgreSQL full-text search + pg_trgm within each service — there is no separate search service.
4. Arabic text requires language-aware tokenization. Text search must support partial matches and Arabic-to-English transliteration.

---

## Open Decisions

- **Review gating model:** RESOLVED — Guide/booking reviews are per-booking (unique on `booking_id` in `guide_booking.reviews`). Listing reviews are per-user-per-listing (unique on `reviewer_id` + `listing_id` in `market.reviews`).
- **Listing visibility gate:** Does `is_verified: true` (admin approval) need to be set before a listing becomes publicly visible, or is owner-toggled `active` status sufficient?
- **Refund policy tiers:** DEFERRED — Refund policy deferred with payment integration (post-hackathon).
- **KYC resubmission limits:** No cap on how many times a user can resubmit rejected KYC documents. Decide whether to enforce a maximum.
- **TourPackage pricing unit:** Confirm whether `price` is per-booking or per-person.
- **Free carpool rides:** RESOLVED — Free and cash rides are supported for MVP (`price_per_seat = 0` allowed). No payment integration for carpool.
- **OpportunityStatus `taken`:** Confirm whether `taken` is needed as a distinct status or if `closed` suffices.
- **ListingStatus `rented`:** Confirm whether `rented` is needed as a separate status from `sold`.
- **Subscription cancellation grace:** DEFERRED — Subscription billing deferred (post-hackathon).
- **Geographic validation bounds:** Confirm the bounding box for listing location coordinates (Egypt / New Valley only).
- **Image requirement for listing publish:** Confirm whether at least one image is mandatory for a listing to go active.

---

## Known Gaps

- **Wadi Exchange / Commodity Pricing:** T10 covers the price reference MVP — admin-curated crop prices (dates, olives) as a price index within the Market Service. No entities are defined for `CommodityPrice` (crop_type, price_per_unit, unit, date, source, district) or `B2BInquiry` / `TradeLead` for direct farmer-to-factory linkage. Full B2B matching is deferred.

- **Bus / Transport Booking:** The "Wadeena Connects You" module mentions integration with bus companies and a booking flow for intercity transport. No entity is defined for `BusRoute` (origin, destination, operator, schedule), `TransportBooking` (distinct from guide `Booking`), or bus operator as a user role or external partner entity.

- **Dispute Resolution / Support Tickets:** Trust mechanisms and dispute resolution are referenced but no entities model `SupportTicket` or `Dispute` with status tracking, escalation paths, or resolution outcomes affecting bookings or transactions.

- **Carpooling Payment:** Carpool is free or cash-only for MVP — no payment integration. `price_per_seat` field is informational (drivers and passengers settle directly).

- **Guide Earnings Ledger:** A guide earnings ledger is referenced but no dedicated entity is modeled. The current `Wallet + Transaction` model covers this, but a guide-side view (earnings per booking, total earnings, platform commission) has no explicit entity. A `GuideEarning` or `EarningsLedger` view may be needed, or the transaction history suffices with proper filtering [TBD — confirm whether a dedicated entity is needed].

- **Platform Commission / Fee Structure:** The business model relies on commissions and subscription fees, but no entity captures commission rate per transaction type, whether a `platform_fee` is deducted from escrow release, or the recipient of commission funds.

- **Content Moderation Queue:** A content moderation queue is referenced but no entity or workflow is defined for queued content items (listings, reviews, POI suggestions) awaiting review, moderation decisions and reasons, or auto-flagging rules.

- **Feature Flags:** Feature flags management is referenced but no `FeatureFlag` entity is defined.

- **Offline / Weak-Connectivity Mode:** AI chatbot support under weak network conditions and offline map tile caching are mentioned. No caching strategy or data synchronization entity is defined for the offline case.

- **Student Housing as a Distinct Entity:** Verified student accommodation is referenced. Currently covered by the `Listing` entity with `category = accommodation`, but verification and housing-specific fields (proximity to university, availability dates, landlord responsiveness rating) are not modeled. A `StudentHousing` specialization may be warranted.

- **ListingView:** An analytics event entity tracking per-listing view events (viewer_id, ip, viewed_at, source) is referenced but absent from this domain model.

- **PriceHistory:** A per-listing price change log entity (listing_id, price, changed_at, changed_by) is referenced but absent from this domain model.

- **DueDiligenceRoom:** A virtual document room per opportunity+investor pair (with uploaded documents and last_accessed tracking) is referenced but absent from this domain model.

---

## 7. Deferred / Post-MVP Entities

> The following entities are **not in scope for the hackathon MVP**. They are retained here for future reference only. Do not implement these for the hackathon.

---

### 7.1 Wallet

Financial balance store for users who can transact (guides, merchants, investors, and all paying users).

| Field        | Type        | Notes                     |
| ------------ | ----------- | ------------------------- |
| `id`         | UUID v7     |                           |
| `user_id`    | UUID → User | Unique per user           |
| `balance`    | decimal     | Current available balance |
| `currency`   | string      | Default `EGP`             |
| `updated_at` | timestamptz |                           |

---

### 7.2 Transaction

An immutable ledger entry for every financial movement.

| Field            | Type                     | Notes                                                                                             |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `id`             | UUID v7                  |                                                                                                   |
| `wallet_id`      | UUID → Wallet            |                                                                                                   |
| `type`           | `TransactionType` enum   | `topup` / `booking_pay` / `payout` / `refund` / `subscription` / `escrow_hold` / `escrow_release` |
| `amount`         | decimal                  |                                                                                                   |
| `direction`      | string                   | `credit` / `debit`                                                                                |
| `balance_after`  | decimal                  | Snapshot of balance post-transaction                                                              |
| `reference_type` | string                   | `booking` / `subscription` / `topup`                                                              |
| `reference_id`   | UUID                     | ID in the referenced domain entity                                                                |
| `gateway_ref`    | string                   | Paymob / Fawry external transaction ID                                                            |
| `status`         | `TransactionStatus` enum | `pending` / `completed` / `failed` / `reversed`                                                   |
| `description`    | string                   |                                                                                                   |
| `created_at`     | timestamptz              |                                                                                                   |

---

### 7.3 Escrow

Holds funds between a payer and payee until a booking/deal is completed or cancelled.

| Field            | Type                | Notes                            |
| ---------------- | ------------------- | -------------------------------- |
| `id`             | UUID v7             |                                  |
| `payer_id`       | UUID → User         | Tourist paying                   |
| `payee_id`       | UUID → User         | Guide receiving                  |
| `amount`         | decimal             |                                  |
| `reference_type` | string              | `booking`                        |
| `reference_id`   | UUID                |                                  |
| `status`         | `EscrowStatus` enum | `held` / `released` / `refunded` |
| `held_at`        | timestamptz         |                                  |
| `released_at`    | timestamptz         |                                  |

---

### 7.4 Subscription

A recurring billing plan for guides and merchants to access premium features.

| Field                  | Type                    | Notes                                             |
| ---------------------- | ----------------------- | ------------------------------------------------- |
| `id`                   | UUID v7                 |                                                   |
| `user_id`              | UUID → User             |                                                   |
| `plan_type`            | `SubscriptionPlan` enum | `guide_basic` / `guide_pro` / `merchant_featured` |
| `price`                | decimal                 |                                                   |
| `status`               | string                  | `active` / `cancelled` / `expired`                |
| `current_period_start` | date                    |                                                   |
| `current_period_end`   | date                    |                                                   |
| `cancelled_at`         | timestamptz             |                                                   |

---

### 7.5 PayoutRequest

A guide or merchant requesting withdrawal of their earned wallet balance.

| Field            | Type                | Notes                                        |
| ---------------- | ------------------- | -------------------------------------------- |
| `id`             | UUID v7             |                                              |
| `user_id`        | UUID → User         |                                              |
| `amount`         | decimal             |                                              |
| `bank_account`   | string              | Optional                                     |
| `instapay_phone` | string              | Optional (Egyptian mobile payment)           |
| `status`         | `PayoutStatus` enum | `pending` / `approved` / `paid` / `rejected` |
| `processed_by`   | UUID → User         | Admin                                        |
| `processed_at`   | timestamptz         |                                              |
| `created_at`     | timestamptz         |                                              |

---

_Document: Hena Wadeena — Domain Models v2.1 | Team: Dev-X | Date: 2026-03-10_
