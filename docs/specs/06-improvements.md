# 06 — Hackathon Improvements Spec

> Technical specifications for all 12 improvements identified in `docs/improvements.md`.  
> Hackathon deadline: **April 18, 2026**. Theme: "Innovation from the Heart of the Desert."  
> Each improvement includes: motivation, service assignment, data model, API surface, state machines, events, and scope.

---

## Priority Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Core / Ship it | Must land before April 18 |
| ⚠️ Stretch | Ship if capacity allows |
| ❌ Post-hackathon | Designed here, not built yet |

---

## Improvement 1 — Local Employment Board ✅ Core

**Service:** Market Service (:8002), `market` schema  
**Impact:** Very High · **Effort:** Medium-High

### 1.1 Motivation

Youth unemployment in New Valley is 37% for women and 9.8% for men (World Bank). No local digital platform connects hirers with workers. A grassroots initiative ("Shaghlni Shukran") exists but is underfunded and not digital.

### 1.2 Data Model

**job_posts** — a single job or gig opportunity posted by a merchant, farmer, or guide.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `poster_id` | UUID | FK → identity.users.id (plain UUID, no cross-schema join) |
| `title` | text | Required |
| `description_ar` | text | Arabic description; required |
| `description_en` | text | Optional |
| `category` | `job_category` enum | `agriculture` \| `tourism` \| `skilled_trade` \| `domestic` \| `logistics` \| `handicraft` |
| `location` | geometry(Point) | PostGIS, SRID 4326 |
| `area` | text | Al-Kharga \| Al-Dakhla \| Al-Farafra \| Baris \| Balat |
| `compensation` | integer | Piasters; 0 = volunteer or barter |
| `compensation_type` | text | `fixed` \| `daily` \| `per_kg` \| `negotiable`; default `fixed` |
| `slots` | integer | Number of workers needed; default 1 |
| `status` | `job_status` enum | `open` \| `in_progress` \| `completed` \| `cancelled` \| `expired`; default `open` |
| `starts_at` | timestamptz | Optional start date |
| `ends_at` | timestamptz | Optional end date |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz | Soft delete |

Indexes: `location` (GiST), `status WHERE deleted_at IS NULL`, `category`.

**job_applications** — a worker's application to a job post.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `job_id` | UUID → job_posts | |
| `applicant_id` | UUID | FK → identity.users.id (plain UUID) |
| `note_ar` | text | Optional cover note |
| `status` | `application_status` enum | `pending` \| `accepted` \| `rejected` \| `withdrawn` \| `in_progress` \| `completed`; default `pending` |
| `applied_at` | timestamptz | |
| `resolved_at` | timestamptz | Set when accepted, rejected, withdrawn, or completed |

Unique on `(job_id, applicant_id)`. Index: `applicant_id`.

**job_reviews** — post-completion two-way review between poster and worker.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `job_id` | UUID → job_posts | |
| `application_id` | UUID → job_applications | |
| `reviewer_id` | UUID | Plain UUID |
| `reviewee_id` | UUID | Plain UUID |
| `direction` | `review_direction` enum | `worker_rates_poster` \| `poster_rates_worker` |
| `rating` | smallint | 1–5 |
| `comment` | text | Optional |
| `created_at` | timestamptz | |

Unique on `(application_id, direction)` — one review per direction per application.

### 1.3 Application State Machine

State transitions for `job_applications.status`:

- `open` → applicant submits → `pending`
- `pending` → poster accepts → `accepted`
- `pending` → applicant withdraws → `withdrawn`
- `pending` → poster rejects → `rejected`
- `accepted` → poster marks start → `in_progress`
- `in_progress` → poster marks done → `completed` → **wallet transfer executes automatically**

Wallet transfer fires on `completed`: Market service calls Identity `/internal/wallet/transfer` with `{ from: poster_id, to: applicant_id, amount: job.compensation, ref: job_id }`.

### 1.4 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/jobs` | Any authenticated | Create a job post |
| GET | `/jobs` | Public | List open jobs (filter: category, area, compensation_type) |
| GET | `/jobs/:id` | Public | Get job post detail |
| PATCH | `/jobs/:id` | Poster | Update a job post (open status only) |
| DELETE | `/jobs/:id` | Poster | Soft-delete (sets deleted_at) |
| POST | `/jobs/:id/apply` | Authenticated | Submit application |
| GET | `/jobs/:id/applications` | Poster | List applications for my job |
| PATCH | `/jobs/:id/applications/:appId` | Poster or Applicant | Update application status (accept/reject/start/complete) |
| DELETE | `/jobs/:id/applications/:appId` | Applicant | Withdraw application |
| POST | `/jobs/:id/applications/:appId/reviews` | Poster or Applicant | Submit post-completion review |
| GET | `/users/:userId/job-reviews` | Public | Aggregated job reviews for a user |

### 1.5 Redis Events

| Event | Emitter | Consumer | Purpose |
|-------|---------|----------|---------|
| `job.posted` | Market | Identity | Notify nearby workers (role-based broadcast) |
| `job.application.received` | Market | Identity | Notify poster |
| `job.application.accepted` | Market | Identity | Notify applicant |
| `job.completed` | Market | Identity | Trigger wallet transfer + review prompt |
| `job.review.submitted` | Market | Identity | Notify reviewee |

### 1.6 Scope Notes

- Arabic-first: `title` and `description_ar` are required; `description_en` is optional.
- The `student` role can apply; `merchant` and `farmer` (resident role) can post.
- Two-way reviews unlock only after `application_status = completed`.
- Wallet transfer is internal only — no Paymob/Fawry required. Uses Identity service's internal wallet ledger (see Cross-Cutting Concerns for wallet schema).

---

## Improvement 2 — Women Artisans Direct Market Access ⚠️ Stretch

**Service:** Market Service (:8002)  
**Impact:** Very High · **Effort:** Medium

### 2.1 Motivation

Women in Kharga and Dakhla produce palm-leaf qafas baskets, garra pottery, and kilims unique to New Valley. They sell through middlemen at a fraction of market price. Female youth unemployment is 37.1%. No online presence, no direct buyer channel exists.

### 2.2 Data Model

**artisan_profiles** — public artisan identity linked to a platform user account.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `user_id` | UUID | Unique; FK → identity.users.id (plain UUID) |
| `display_name_ar` | text | Required public name |
| `bio_ar` | text | Optional |
| `craft_types` | text[] | e.g. `['palm_weaving', 'garra_pottery', 'kilim']` |
| `location` | geometry(Point) | PostGIS, SRID 4326 |
| `area` | text | One of the five oasis cities |
| `whatsapp_number` | text | E.164 format, e.g. `+20101234567` |
| `qr_code_url` | text | S3 URL for printed QR linking to profile; generated on create/update |
| `wholesale_inquiry_enabled` | boolean | Default false |
| `average_rating` | numeric(3,2) | Computed aggregate; default 0 |
| `created_at` | timestamptz | |

**artisan_products** — individual craft items listed by an artisan.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `artisan_id` | UUID → artisan_profiles | |
| `title_ar` | text | Required |
| `title_en` | text | Optional |
| `description_ar` | text | Optional |
| `craft_type` | text | |
| `price` | integer | Piasters |
| `price_unit` | text | `per_item` \| `per_kg` \| `negotiable`; default `per_item` |
| `photos` | text[] | S3 URLs |
| `available_qty` | integer | Optional |
| `is_available` | boolean | Default true |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz | Soft delete |

**wholesale_inquiries** — bulk purchase inquiries submitted to an artisan.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `artisan_id` | UUID → artisan_profiles | |
| `buyer_id` | UUID | Plain UUID |
| `message` | text | Required |
| `contact_email` | text | Optional |
| `contact_phone` | text | Optional |
| `status` | text | `pending` \| `responded` \| `closed`; default `pending` |
| `created_at` | timestamptz | |

### 2.3 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/artisans` | `resident` or `merchant` | Create artisan profile |
| GET | `/artisans` | Public | Browse artisan profiles (filter: area, craft_type) |
| GET | `/artisans/:id` | Public | Artisan profile + products |
| PATCH | `/artisans/:id` | Owner | Update profile |
| POST | `/artisans/:id/products` | Owner | Add product listing |
| PATCH | `/artisans/:id/products/:productId` | Owner | Update product |
| DELETE | `/artisans/:id/products/:productId` | Owner | Soft-delete product |
| POST | `/artisans/:id/wholesale` | Authenticated | Submit wholesale inquiry |
| GET | `/artisans/:id/wholesale` | Owner | View inquiries |

### 2.4 QR Code Flow

On artisan profile creation or update, the server generates a short URL pointing to `/artisans/:id` and encodes it as a QR PNG uploaded to S3. The `qr_code_url` field is returned in the profile response. Physical QR codes can be printed at the Handicraft Center.

### 2.5 WhatsApp Integration

The product detail page renders a "Contact via WhatsApp" button that deep-links to `https://wa.me/{whatsapp_number}?text=...` with a pre-filled Arabic message referencing the product. No server-side WhatsApp integration is required.

---

## Improvement 3 — Agricultural Price Alerts ✅ Ship it

**Service:** Market Service (:8002) — extends existing commodity module  
**Impact:** High · **Effort:** Low

### 3.1 Motivation

Farmers have no price signals and sell below market to middlemen. Electricity tariffs on well-water extraction are expensive; when harvest prices don't cover costs, farmers shut down. Price alerts give farmers the data needed to hold out for fair prices.

### 3.2 Data Model

**price_alert_subscriptions** — a farmer's threshold subscription on a commodity.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `user_id` | UUID | Plain UUID |
| `commodity_id` | UUID → commodities | |
| `threshold_price` | integer | Piasters per kg; alert fires when price crosses threshold |
| `direction` | text | `above` \| `below`; default `above` |
| `is_active` | boolean | Default true |
| `last_triggered_at` | timestamptz | Prevents duplicate alerts within the same price update batch |
| `created_at` | timestamptz | |

Unique on `(user_id, commodity_id, direction)`.

### 3.3 Alert Evaluation Logic

When a commodity price snapshot is written (existing scheduled job or admin update):

1. Query all active `price_alert_subscriptions` for that `commodity_id`.
2. For each subscription: check if the new price crosses the threshold in the subscribed direction.
3. If triggered: emit `price.alert.triggered` Redis event → Identity service sends in-app and email notification.
4. Set `last_triggered_at = now()` to prevent duplicate alerts within the same batch.

### 3.4 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/price-alerts` | Authenticated | Subscribe to a commodity price alert |
| GET | `/price-alerts` | Authenticated | List my active alerts |
| PATCH | `/price-alerts/:id` | Owner | Update threshold |
| DELETE | `/price-alerts/:id` | Owner | Remove alert subscription |

### 3.5 Redis Events

| Event | Emitter | Consumer | Payload |
|-------|---------|----------|---------|
| `price.alert.triggered` | Market | Identity | `{ user_id, commodity_name, threshold, actual_price, direction }` |

---

## Improvement 4 — Farmer Produce Listings ✅ Ship it

**Service:** Market Service (:8002) — extends existing listing infrastructure  
**Impact:** High · **Effort:** Medium

### 4.1 Motivation

Farmers cannot connect directly with buyers. Oasis dates are historically superior to Nile Valley dates but are captured by intermediaries. A direct produce listing breaks the middleman dependency.

### 4.2 Data Model

Reuses the existing `listings` table with a new `listing_category` enum value: `agricultural_produce`. A new auxiliary table holds produce-specific fields.

**produce_listing_details** — one-to-one extension of a `listings` row where `category = agricultural_produce`.

| Field | Type | Notes |
|-------|------|-------|
| `listing_id` | UUID → listings | Primary key (1:1) |
| `commodity_type` | text | `dates` \| `olives` \| `wheat` \| `other` |
| `quantity_kg` | numeric(10,2) | Optional |
| `harvest_date` | date | Optional |
| `storage_type` | text | `field` \| `warehouse` \| `cold_storage` |
| `certifications` | text[] | `organic` \| `gap` \| `other`; default `{}` |
| `preferred_buyer` | text | `any` \| `wholesaler` \| `exporter` \| `local` |
| `contact_phone` | text | Optional |
| `contact_whatsapp` | text | Optional |

Index: `commodity_type`.

### 4.3 API Surface

No new endpoints — reuses existing listing CRUD with `category = agricultural_produce`. The `POST /listings` body accepts a `produce_details` nested object when the category is `agricultural_produce`; the service maps it to `produce_listing_details`.

Additional filters on the existing `GET /listings` endpoint:
- `?category=agricultural_produce`
- `?commodity_type=dates`
- `?area=Al-Dakhla`

### 4.4 Integration with Commodity Module

From the commodity detail page, a farmer-facing CTA ("List your harvest") pre-fills `commodity_type` based on the viewed commodity and links to the listing creation flow.

---

## Improvement 5 — Oasis Products Cold Chain & B2B Market Access ❌ Post-hackathon

**Service:** Market Service (:8002) — new module  
**Impact:** High · **Effort:** High

### 5.1 Motivation

Oasis dates and Dakhla olive oil are premium products but cannot reach premium markets. Refrigerated transport doesn't exist for small farmers. Organic certifications required for export premiums are inaccessible to small producers.

### 5.2 Scope (Designed, Not Built)

**Supply calendar:** Table `supply_calendar` — fields: `farmer_id`, `commodity_type`, `available_from`, `available_until`, `volume_kg`, `price_per_kg`, `location`. Buyers see harvest windows and available volumes.

**Cooperative cold-chain booking:** Table `cold_chain_slots` — fields: `id`, `route`, `departure_at`, `total_capacity_kg`, `cost_per_kg`, `bookings[]`. Multiple small farmers share a refrigerated truck.

**Certification tracking:** Table `certification_records` — fields: `farmer_id`, `cert_type`, `issued_by`, `issued_at`, `expires_at`, `doc_url`. Tracks organic and food-safety certification journey.

**B2B buyer matching:** Extends existing `investment_opportunities` model with `opportunity_type = 'agricultural_supply'`. Hotel chains and Cairo specialty food markets post procurement needs; farmers apply.

**Price benchmarking:** Extends price snapshots to include export-grade reference prices from commodity exchange feeds.

### 5.3 Dependency

Builds directly on Improvement 4 (Farmer Produce Listings) and Improvement 3 (Price Alerts). Complete those first.

---

## Improvement 6 — Heritage Site Community Early Warning ⚠️ Stretch

**Service:** Map Service (:8004), `map` schema  
**Impact:** High · **Effort:** Medium

### 6.1 Motivation

El-Bagawat Cemetery and El-Nadura Temple are deteriorating above 45% of their original fabric (MDPI 2023). Kharga is on UNESCO's Tentative World Heritage List — inscription requires demonstrated preservation management. No community monitoring mechanism currently exists.

### 6.2 Data Model

**heritage_sites** — catalogue of monitored heritage sites.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `name_ar` | text | Required |
| `name_en` | text | Optional |
| `site_type` | text | `cemetery` \| `temple` \| `church` \| `fortress` \| `other` |
| `location` | geometry(Point) | PostGIS, SRID 4326 |
| `area` | text | Oasis city |
| `description_ar` | text | Optional |
| `unesco_ref` | text | UNESCO Tentative List reference number |
| `created_at` | timestamptz | |

**heritage_damage_reports** — citizen-submitted damage observations.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `site_id` | UUID → heritage_sites | |
| `reporter_id` | UUID | Plain UUID; tourist or resident |
| `damage_type` | `damage_type_enum` | `vandalism` \| `vehicle_damage` \| `water_damage` \| `salt_crystallization` \| `structural_collapse` \| `graffiti` \| `unauthorized_access` \| `other` |
| `description_ar` | text | Required |
| `photos` | text[] | S3 URLs; minimum 1 required |
| `location` | geometry(Point) | Exact spot within the site |
| `status` | `report_status` | `pending` \| `acknowledged` \| `escalated` \| `resolved` \| `dismissed`; default `pending` |
| `reviewed_by` | UUID | Admin plain UUID |
| `reviewed_at` | timestamptz | |
| `admin_note` | text | Optional |
| `created_at` | timestamptz | |

Indexes: `site_id`, `status`.

**groundwater_alerts** — periodic water level readings linked to a heritage site.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `site_id` | UUID → heritage_sites | |
| `level_cm` | integer | Centimetres above baseline |
| `threshold_cm` | integer | Alert threshold; default 30 cm |
| `measured_at` | timestamptz | |
| `alert_sent` | boolean | Default false |
| `created_at` | timestamptz | |

**monument_pledges** — diaspora/international patronage pledges (no actual payment in MVP).

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `site_id` | UUID → heritage_sites | |
| `user_id` | UUID | Plain UUID |
| `amount_egp` | integer | Informational pledge only, not a payment |
| `message` | text | Optional |
| `created_at` | timestamptz | |

### 6.3 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/heritage-sites` | Public | List heritage sites |
| GET | `/heritage-sites/:id` | Public | Site detail + recent reports |
| POST | `/heritage-sites/:id/reports` | Authenticated | Submit damage report with photos |
| GET | `/heritage-sites/:id/reports` | Admin | Manage reports for a site |
| PATCH | `/heritage-sites/:id/reports/:reportId` | Admin | Update report status |
| POST | `/heritage-sites/:id/groundwater` | Admin | Record groundwater measurement |

### 6.4 Redis Events

| Event | Emitter | Consumer | Purpose |
|-------|---------|----------|---------|
| `heritage.damage.reported` | Map | Identity | Notify admin queue |
| `heritage.groundwater.alert` | Map | Identity | Broadcast alert to site stewards |

### 6.5 Adopt-a-Monument (Stretch within Stretch)

A micro-patronage model: users make a pledge acknowledgement (no actual payment in MVP — purely a pledge record) linked to a heritage site. Shows international diaspora engagement in the demo. Uses the `monument_pledges` table above.

---

## Improvement 7 — Skills Training Employment Pipeline ⚠️ Stretch

**Service:** Identity Service (:8001), `identity` schema  
**Impact:** High · **Effort:** Medium

### 7.1 Motivation

Ministry of Labor runs free vocational training in New Valley. CISS ran a Business Incubator training at the Kharga Handicraft Center. Structural gap: no persistent skills record, no pathway from training to employment, no alumni network. Training certificates aren't recognized by employers.

### 7.2 Data Model

**training_programs** — catalogue of available vocational training programs.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `name_ar` | text | Required |
| `name_en` | text | Optional |
| `provider` | text | `Ministry of Labor` \| `CISS` \| `MSMEDA` \| `Other` |
| `category` | text | `handicraft` \| `business` \| `agriculture` \| `technology` \| `tourism` |
| `duration_days` | integer | Optional |
| `location` | text | Free text |
| `area` | text | Oasis city |
| `is_active` | boolean | Default true |
| `created_at` | timestamptz | |

**user_training_records** — a user's enrollment and completion record for a program.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `user_id` | UUID → users | |
| `program_id` | UUID → training_programs | |
| `enrolled_at` | date | |
| `completed_at` | date | Null if not yet completed |
| `certificate_url` | text | S3 URL for uploaded certificate scan |
| `verified` | boolean | Default false |
| `verified_by` | UUID | Admin user_id |
| `verified_at` | timestamptz | |

Unique on `(user_id, program_id)`.

**user_skills** — individual skills on a user's portfolio.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `user_id` | UUID → users | |
| `skill_name` | text | |
| `proficiency` | text | `beginner` \| `intermediate` \| `advanced` \| `expert`; default `beginner` |
| `source` | text | `training` \| `self` \| `employment` |
| `created_at` | timestamptz | |

Unique on `(user_id, skill_name)`.

**mentorship_matches** — a pairing between a mentor (returned migrant with business experience) and a mentee.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `mentor_id` | UUID → users | |
| `mentee_id` | UUID → users | Must differ from `mentor_id` |
| `category` | text | Skill area being mentored |
| `status` | text | `pending` \| `active` \| `completed` \| `declined`; default `pending` |
| `created_at` | timestamptz | |

### 7.3 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/training-programs` | Public | Browse available programs |
| POST | `/training-programs` | Admin | Create training program |
| POST | `/me/training` | Authenticated | Add training record (with cert upload) |
| GET | `/me/training` | Authenticated | My training portfolio |
| GET | `/users/:id/skills` | Public | View user's public skills portfolio |
| POST | `/me/skills` | Authenticated | Add a skill |
| POST | `/mentorship/request` | Authenticated | Request a mentor match |
| GET | `/mentorship` | Admin | Manage mentorship queue |

### 7.4 Employment Board Integration

Skills portfolio fields are included in the job application payload. A job poster can see the applicant's `user_skills` and `user_training_records` as part of their application. No cross-schema join — Market service calls Identity `/internal/users/:id/skills` to enrich the application view.

---

## Improvement 8 — Ecotourism Real-Time Site Status ✅ Ship it

**Service:** Map Service (:8004), `map` schema — extends existing POI model  
**Impact:** Medium-High · **Effort:** Low

### 8.1 Motivation

Tourists make 10–12 hour journeys from Cairo and find sites closed, no signage, no guides available. Wikivoyage explicitly flags "irregular opening hours" for museums along Dakhla routes. No real-time site status information exists anywhere.

### 8.2 Data Model

**site_status_updates** — a timestamped status record pushed by a local steward for a POI.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `poi_id` | UUID | Plain UUID → map.pois.id |
| `steward_id` | UUID | Plain UUID; verified local steward user |
| `status` | `site_status` enum | `open` \| `closed` \| `closed_temporarily` \| `limited_access` \| `under_restoration` |
| `note_ar` | text | Optional Arabic context note |
| `note_en` | text | Optional English context note |
| `valid_until` | timestamptz | Null = indefinite until next update |
| `created_at` | timestamptz | |

Index: `(poi_id, created_at DESC)` for fast latest-status lookup.

**site_stewards** — users with permission to post status updates for a specific POI.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `poi_id` | UUID | Plain UUID → map.pois.id |
| `user_id` | UUID | Plain UUID; identity role = `resident` or `guide` |
| `granted_by` | UUID | Admin UUID |
| `granted_at` | timestamptz | |

Unique on `(poi_id, user_id)`.

### 8.3 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pois/:id/status` | Public | Latest status for a site |
| POST | `/pois/:id/status` | Steward or Admin | Post a status update |
| GET | `/sites/status-board` | Public | All tracked sites with latest status (homepage dashboard) |
| POST | `/pois/:id/stewards` | Admin | Grant steward access to a user |
| DELETE | `/pois/:id/stewards/:userId` | Admin | Revoke steward access |

### 8.4 Offline Map Support

For offline-capable trail guides: POI detail exports a GeoJSON bundle (coordinates + description + status) that the frontend caches via the Cache API or local storage. No new backend endpoint is needed — GeoJSON is derivable from the existing `/pois/:id` response.

---

## Improvement 9 — Unlicensed Guide Safety & Verification ✅ Ship it

**Service:** Guide-Booking Service (:8003), `guide_booking` schema — extends existing guide KYC  
**Impact:** Medium-High · **Effort:** Low

### 9.1 Motivation

The Egyptian Competition Authority fined 127 businesses for tourist fraud in 2025. Desert safari problems: no archaeological knowledge, uninsured vehicles, forced shopping stops. In the Western Desert, a breakdown or getting lost is life-threatening. The ETAA guide registry exists but is not tourist-facing.

### 9.2 Data Model

**guides table extensions** — additional columns on the existing `guides` table.

| Field | Type | Notes |
|-------|------|-------|
| `etaa_license_number` | text | ETAA-issued guide license number |
| `etaa_verified` | boolean | Default false; set by admin after manual ETAA lookup |
| `etaa_verified_at` | timestamptz | |
| `insurance_policy_url` | text | S3 URL for policy document |
| `insurance_valid_until` | date | |
| `vehicle_plate` | text | Optional |
| `vehicle_type` | text | `4WD` \| `minibus` \| `motorcycle` |

**desert_trip_check_ins** — safety plan registered before a desert tour.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `booking_id` | UUID → bookings | |
| `expected_arrival_at` | timestamptz | Deadline for check-in before overdue alert fires |
| `destination_name` | text | |
| `emergency_contact` | text | Phone number |
| `ranger_station_id` | UUID | Plain UUID → map.pois.id (ranger stations are POIs) |
| `checked_in_at` | timestamptz | Set when guide marks arrival; clears overdue timer |
| `alert_triggered_at` | timestamptz | Set when overdue alert fires |
| `gps_breadcrumbs` | jsonb | Array of `{lat, lng, ts}` pushed periodically by the guide |
| `status` | text | `pending` \| `checked_in` \| `overdue` \| `alert_sent` \| `resolved`; default `pending` |
| `created_at` | timestamptz | |

Indexes: `booking_id`; partial index on `status` filtering for `pending` and `overdue` rows.

**packages table extensions** — transparent pricing additions.

| Field | Type | Notes |
|-------|------|-------|
| `price_breakdown` | jsonb | Array of `{label, amount_piasters}` itemising the total price |
| `no_hidden_fees` | boolean | Default false; publicly displayed on package card |

### 9.3 ETAA Verification Flow

1. Guide uploads ETAA license number during profile creation.
2. Admin looks up the ETAA registry (currently manual — no public API exists) and toggles `etaa_verified = true` and sets `etaa_verified_at`.
3. Verified guides display an "ETAA Verified" badge on their profile.
4. Future: automated ETAA API integration when the registry becomes digitally accessible.

### 9.4 Desert Trip Safety API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bookings/:id/desert-trip` | Guide | Register desert trip safety plan |
| POST | `/bookings/:id/desert-trip/breadcrumb` | Guide | Push GPS breadcrumb |
| POST | `/bookings/:id/desert-trip/check-in` | Guide | Mark arrival (clears overdue timer) |
| GET | `/bookings/:id/desert-trip` | Guide + Tourist | View trip status and breadcrumbs |

### 9.5 Overdue Alert Logic

A scheduled job runs every 15 minutes. For each trip where `status = 'pending'` and `expected_arrival_at` is more than 30 minutes in the past and `alert_triggered_at` is null: set `status = 'overdue'`, set `alert_triggered_at = now()`, emit `desert_trip.overdue` Redis event → Identity sends alert to emergency contact and admin.

---

## Improvement 10 — Price Trend Visualization ✅ Ship it

**Service:** Market Service (:8002) — primarily a frontend addition  
**Impact:** Medium · **Effort:** Low

### 10.1 Motivation

Farmers and traders have no historical price reference to know whether today's price is fair. Data already exists in commodity price snapshots — this is primarily a frontend addition.

### 10.2 Backend (Minimal Change)

One new query endpoint on the existing price snapshots table, returning daily average prices over a rolling window:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/commodities/:id/price-history` | Public | Daily average prices for 30/60/90 days; returns `[{date, price_piasters}]` |

Query logic: aggregate `price_snapshots` by day for the given `commodity_id` over the requested window, grouped by `date_trunc('day', recorded_at)`, returning average `price_per_kg`.

### 10.3 Frontend

Render a line chart per commodity using the price history endpoint. Library: any lightweight charting lib already in the frontend bundle (if none, use native SVG — no new dependency). Show:

- 30-day default view
- Min/max/average annotations
- "Fair price range" band (avg ± 1 std dev)

---

## Improvement 11 — Traditional Craft Knowledge Apprenticeship Archive ❌ Post-hackathon

**Service:** AI Service (:8005) or a new Content service  
**Impact:** Medium · **Effort:** Medium

### 11.1 Motivation

Dakhla palm-leaf weaving and garra pottery face extinction. UNESCO is documenting New Valley's intangible heritage but documentation is not transmission. A GIS database of handicraft centers exists in academic archives — inaccessible to artisans or learners.

### 11.2 Scope (Designed, Not Built)

**Video library:** Table `craft_videos` — fields: `id`, `artisan_id`, `title_ar`, `description_ar`, `craft_type`, `duration_s`, `hls_url`, `thumbnail_url`, `offline_cached`, `heritage_tags`. Videos hosted via S3 + HLS for low-bandwidth streaming. `heritage_tags` maps to UNESCO intangible heritage taxonomy for international discovery.

**Apprenticeship matching:** Table `apprenticeship_offers` — fields: `id`, `master_artisan_id`, `capacity`, `compensation_type`, `duration_weeks`, `location`. Application flow mirrors Improvement 1 (Employment Board).

**Content seeding:** Partner with CISS/MSEI to film 10–15 craft process videos in Arabic before launch.

### 11.3 Dependency

Builds on Improvement 2 (Women Artisans Market Access) — artisan profiles provide the master artisan identity layer.

---

## Improvement 12 — White Desert Environmental Incident Reporting ⚠️ Stretch

**Service:** Map Service (:8004), `map` schema  
**Impact:** Medium · **Effort:** Low

### 12.1 Motivation

Guides bypass ticket booths and drive over brittle chalk formations. EEAA fines up to LE 400 exist but enforcement is "weak at best." 1.1 million desert-oriented visitors per year. No community feedback mechanism for residents or citizens.

### 12.2 Data Model

**environmental_incidents** — GPS-tagged incident reports submitted by residents, tourists, or guides.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `reporter_id` | UUID | Plain UUID |
| `incident_type` | `env_incident_type` enum | `vehicle_on_formations` \| `ticket_bypass` \| `littering` \| `campfire_damage` \| `wildlife_disturbance` \| `other` |
| `description_ar` | text | Required |
| `photos` | text[] | S3 URLs; minimum 1 required |
| `location` | geometry(Point) | PostGIS, SRID 4326; required |
| `area` | text | Default `White Desert` |
| `status` | text | `pending` \| `forwarded` \| `resolved` \| `dismissed`; default `pending` |
| `eeaa_ref` | text | EEAA ticket number if escalated |
| `forwarded_at` | timestamptz | |
| `created_at` | timestamptz | |

Indexes: `location` (GiST), `status`.

**eco_pledges** — voluntary public commitment by tour operators to eco-responsible practices.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `operator_id` | UUID | Plain UUID; guide or merchant role |
| `pledge_text_ar` | text | Required |
| `is_public` | boolean | Default true |
| `signed_at` | timestamptz | |

**site_capacity_alerts** — logged capacity threshold breaches at a site.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `area` | text | Site or zone name |
| `current_count` | integer | Reported visitor count |
| `threshold` | integer | Configured maximum |
| `alert_sent_at` | timestamptz | |

### 12.3 API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/environmental-incidents` | Authenticated | Report an incident with photos + GPS |
| GET | `/environmental-incidents` | Admin | View incident queue |
| PATCH | `/environmental-incidents/:id` | Admin | Update status / add EEAA ref |
| POST | `/eco-pledges` | Guide or Merchant | Sign eco-pledge |
| GET | `/eco-pledges` | Public | List signed eco-pledges (shown on guide profile) |

### 12.4 Capacity Alert Logic

If a ranger or admin posts a footfall count exceeding the configured threshold for an area, the platform emits `site.capacity.exceeded` → Identity service sends a broadcast notification to guides with active bookings in that area, suggesting alternative sites.

### 12.5 Eco-Certification and Booking Placement

Guides who have signed an `eco_pledge` and have no unresolved incident reports against them are marked `eco_certified = true` on their guide profile. Two additional columns on the `guides` table:

| Field | Type | Notes |
|-------|------|-------|
| `eco_certified` | boolean | Default false |
| `eco_certified_at` | timestamptz | |

The `GET /guides` endpoint supports `?eco_certified=true` for preferential placement in search results.

---

## Cross-Cutting Concerns

### Service Assignment Summary

| Improvement | Service | New Schema Objects |
|-------------|---------|-------------------|
| 1 — Employment Board | Market (:8002) | `job_posts`, `job_applications`, `job_reviews` |
| 2 — Women Artisans | Market (:8002) | `artisan_profiles`, `artisan_products`, `wholesale_inquiries` |
| 3 — Price Alerts | Market (:8002) | `price_alert_subscriptions` |
| 4 — Farmer Listings | Market (:8002) | `produce_listing_details` + enum value |
| 5 — Cold Chain B2B | Market (:8002) | `supply_calendar`, `cold_chain_slots`, `certification_records` |
| 6 — Heritage Warning | Map (:8004) | `heritage_sites`, `heritage_damage_reports`, `groundwater_alerts` |
| 7 — Skills Pipeline | Identity (:8001) | `training_programs`, `user_training_records`, `user_skills`, `mentorship_matches` |
| 8 — Site Status | Map (:8004) | `site_status_updates`, `site_stewards` |
| 9 — Guide Safety | Guide-Booking (:8003) | `desert_trip_check_ins` + columns on `guides` and `packages` |
| 10 — Price Charts | Market (:8002) | No new tables — new query endpoint |
| 11 — Craft Archive | AI (:8005) | `craft_videos`, `apprenticeship_offers` |
| 12 — White Desert | Map (:8004) | `environmental_incidents`, `eco_pledges`, `site_capacity_alerts` |

### Connectivity Reality

All features for the April 18 deadline must:
- Return meaningful data on first HTTP request without requiring app install (PWA-compatible)
- Fall back to WhatsApp-linked actions for critical flows (price alerts → WhatsApp, job applications → WhatsApp fallback number)
- Not require real-time WebSocket connections for core functionality — polling is acceptable

### Wallet Dependency (Improvement 1)

Improvement 1 requires wallet-to-wallet transfer. The Identity service must expose a wallet ledger. Required additions to the `identity` schema:

**users table extension:**

| Field | Type | Notes |
|-------|------|-------|
| `wallet_balance` | integer | Piasters; default 0 |

**wallet_transactions** — immutable ledger of all wallet movements.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `user_id` | UUID → users | |
| `amount` | integer | Positive = credit, negative = debit; piasters |
| `balance_after` | integer | Snapshot of balance after this transaction |
| `ref_type` | text | `job` \| `booking` \| `topup` \| `refund` |
| `ref_id` | UUID | Reference entity ID |
| `note_ar` | text | Optional Arabic description |
| `created_at` | timestamptz | |

Index: `user_id`.

Internal transfer endpoint: `POST /internal/wallet/transfer` — atomic debit + credit: debit `from_user`, credit `to_user`, insert two ledger rows. Returns 400 if `from_user` has insufficient balance.

---

## Improvement 13 — Government Benefits Navigator ✅ Core

**Service:** React frontend only (static content, no new backend)  
**Impact:** Very High · **Effort:** Low · **Hackathon domain:** Community Services

### 13.1 Motivation

Egypt's Takaful wa Karama cash-transfer program has documented low take-up in New Valley despite high eligibility rates. Residents in Dakhla and Farafra must travel 4–7 hours to Kharga to inquire at the Social Affairs office — often to be turned away for missing a single document. Bread subsidy card corrections, disability allowances, and pension enrollment share the same information gap.

### 13.2 Eligibility Wizard

A 6–8 question frontend flow matching users to programs they qualify for. Questions: household size, monthly household income, age of head of household, disability (self or family member), employment status, land ownership. Programs evaluated:

| Program | Ministry | Qualifying signal |
|---------|----------|------------------|
| Takaful wa Karama | Social Solidarity | Low income + children or elderly |
| Sakan Karim housing grant | Housing | Renter, low income |
| Tamween bread subsidy | Supply | Household registration |
| Disability allowance | Social Solidarity | Disability flag |
| Pension (non-contributory) | Social Solidarity | Age ≥ 65, no formal pension |
| Agricultural solar pump grant | NREA | Farmer role, land ownership |

### 13.3 Content Model

Results are static content served from the React app. Admin can update contact details and document lists via a single CMS record in the Market service.

**benefit_info** — one record per government benefit program (managed by admin in Market service).

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `slug` | text | Stable identifier, e.g. `takaful-wa-karama` |
| `name_ar` | text | Arabic program name |
| `name_en` | text | English name |
| `ministry_ar` | text | Responsible ministry |
| `documents_ar` | text[] | Required documents in Arabic |
| `office_name_ar` | text | Local office name |
| `office_phone` | text | Phone number |
| `office_address_ar` | text | Address |
| `enrollment_notes_ar` | text | Plain-Arabic instructions |
| `updated_at` | timestamptz | Admin updates this |

### 13.4 API Surface

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/benefits` | Public | List all benefit records |
| GET | `/api/v1/benefits/:slug` | Public | Single benefit detail |
| PUT | `/api/v1/benefits/:slug` | Admin | Update contact/document info |

### 13.5 Frontend Flow

1. User opens "خدمات حكومية" (Government Services) from the resident dashboard.
2. Wizard asks 6–8 Arabic questions; skips irrelevant branches.
3. Results page lists matched programs with document checklist and office contact.
4. "Remind me when enrollment opens" — stores a notification subscription tag; admin sends a broadcast via existing notification system when a window opens.

---

## Improvement 14 — Groundwater & Well Cost Monitor ✅ Core

**Service:** Market Service (:8002), `market` schema  
**Impact:** High · **Effort:** Low · **Hackathon domains:** Smart Agriculture & Water, Solar Energy & Environment

### 14.1 Motivation

Electricity tariffs on well-pump extraction are documented by CAPMAS as "prohibitively expensive" in New Valley. Without per-farm tracking, farmers cannot build the evidence needed to claim NREA solar-pump subsidies. The data also feeds the groundwater depletion alert from Improvement 6.

### 14.2 Data Model

**well_logs** — a farmer's pump operation record for a single session.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `farmer_id` | UUID | FK → identity.users.id |
| `location` | geometry(Point) | PostGIS, SRID 4326 |
| `area` | text | Al-Kharga \| Al-Dakhla \| Al-Farafra \| Baris \| Balat |
| `pump_hours` | numeric(6,2) | Hours pump ran |
| `kwh_consumed` | numeric(8,2) | Electricity consumed (kWh); farmer reads from meter |
| `cost_piasters` | integer | Actual electricity cost paid (piasters) |
| `water_m3_est` | numeric(8,2) | Optional estimated water volume drawn |
| `depth_to_water_m` | numeric(6,1) | Optional: depth to water table (meters) |
| `logged_at` | date | Date of the pump session |
| `created_at` | timestamptz | |

Index: `farmer_id`, `area`, `logged_at`.

**well_monthly_summaries** — materialized view updated nightly.

| Column | Notes |
|--------|-------|
| `farmer_id` | |
| `year_month` | `YYYY-MM` |
| `total_pump_hours` | |
| `total_kwh` | |
| `total_cost_piasters` | |
| `avg_cost_per_m3_piasters` | |
| `avg_depth_to_water_m` | |

### 14.3 Solar Savings Estimator

Given a farmer's trailing 12-month average monthly cost, the platform computes:
- Estimated kWh saved by solar pump
- Estimated monthly saving at current tariff
- NREA subsidy break-even year (assuming 70% subsidy on 5 kW system at published NREA rates)

Displayed as a simple card on the farmer dashboard. Links directly to NREA subsidy application form.

### 14.4 API Surface

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/well-logs` | Farmer | Log a pump session |
| GET | `/api/v1/well-logs` | Farmer | Own logs, paginated |
| GET | `/api/v1/well-logs/summary` | Farmer | Monthly summary + solar estimator |
| GET | `/internal/well-logs/area-summary` | Internal | Aggregated by area for heritage groundwater feed |

---

## Improvement 15 — Public Transport Tracker ⚠️ Stretch

**Service:** Map Service (:8004), `map` schema  
**Impact:** High · **Effort:** Medium · **Hackathon domain:** Transportation & Logistics

### 15.1 Motivation

Upper Egypt Bus Company (CTA) operates the only intercity bus routes in New Valley (Kharga–Dakhla–Farafra–Bahariya–Cairo). Schedules are paper-only at depots. Missing a bus in New Valley means a 24–48 hour wait for the next one. The "Wadeena Connects You" module was the platform's originally named first feature but was never designed.

### 15.2 Data Model

**bus_routes** — a named CTA service line.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `name_ar` | text | e.g. "الخارجة – الداخلة – الفرافرة" |
| `name_en` | text | |
| `operator` | text | e.g. "CTA" |
| `active` | boolean | Default true |
| `created_at` | timestamptz | |

**bus_stops** — individual stops on a route.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `route_id` | UUID → bus_routes | |
| `sequence` | integer | 1-based stop order |
| `name_ar` | text | |
| `location` | geometry(Point) | PostGIS, SRID 4326 |
| `scheduled_duration_min` | integer | Minutes from previous stop |

**bus_departures** — a single recorded departure event from the terminus.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `route_id` | UUID → bus_routes | |
| `departed_at` | timestamptz | Actual departure time stamped by steward |
| `steward_id` | UUID | FK → identity.users.id (driver or coordinator role) |
| `notes_ar` | text | Optional delay reason |
| `created_at` | timestamptz | |

Indexes: `route_id, departed_at DESC`.

### 15.3 ETA Logic

ETA for stop N = `departed_at + SUM(scheduled_duration_min for stops 1..N)`. A simple backend calculation — no real-time GPS required. Accuracy is sufficient for passengers deciding whether to travel to the station.

### 15.4 State Machine

- Terminus steward taps "Bus Departed" → `bus_departures` row created → ETA board updates for all downstream stops
- Passengers subscribed to the route receive a push/SMS notification via existing notification system

### 15.5 API Surface

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/bus/routes` | Public | List routes |
| GET | `/api/v1/bus/routes/:id/board` | Public | Latest departure + ETAs for all stops |
| POST | `/api/v1/bus/routes/:id/depart` | Driver/Steward role | Record a departure |
| POST | `/api/v1/bus/subscriptions` | Auth | Subscribe to route departure notifications |

---

## Improvement 16 — Desert Emergency Dispatch ⚠️ Stretch

**Service:** Map Service (:8004), `map` schema  
**Impact:** High · **Effort:** Medium · **Hackathon domain:** Community Services

### 16.1 Motivation

New Valley's desert terrain makes emergencies life-threatening. There is no single digital channel to reach the right responder (ranger station, hospital, caravan operator) based on location. Improvement 9 covers registered guide trips; this extends safety infrastructure to all users.

### 16.2 Data Model

**emergency_resources** — hospitals, ranger stations, petrol stations, water points.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `resource_type` | enum | `hospital` \| `ranger_station` \| `petrol` \| `water_point` \| `police` |
| `name_ar` | text | |
| `phone` | text | |
| `location` | geometry(Point) | PostGIS, SRID 4326 |
| `area` | text | |
| `offline_tile_priority` | boolean | If true, include in offline map bundle |
| `active` | boolean | |
| `created_at` | timestamptz | |

Index: `location` (GiST), `resource_type`.

**sos_incidents** — a distress event raised by a user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | Primary key |
| `reporter_id` | UUID | FK → identity.users.id |
| `location` | geometry(Point) | GPS at time of SOS |
| `nearest_resource_id` | UUID → emergency_resources | Auto-resolved at creation |
| `contact_phone` | text | Emergency contact phone number (user-configured) |
| `status` | enum | `active` \| `responded` \| `closed` |
| `created_at` | timestamptz | |
| `closed_at` | timestamptz | |

### 16.3 SOS Flow

1. User taps "SOS" button → POST `/api/v1/sos` with current GPS coordinates.
2. Server resolves nearest `emergency_resources` row using PostGIS `ST_DWithin`.
3. Notification dispatched to user's emergency contact (stored in user profile extension).
4. Response includes nearest resource name, phone, and distance.
5. Ranger station (if configured) receives an internal notification via Redis Stream event `sos.created`.

### 16.4 API Surface

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/emergency/resources` | Public | All emergency resources (offline-cacheable) |
| POST | `/api/v1/sos` | Auth | Raise an SOS incident |
| PATCH | `/api/v1/sos/:id/close` | Auth | Close own incident |
| GET | `/internal/sos/active` | Internal | Ranger dashboard: active incidents |

### 16.5 Breadcrumb Trail

Extends the guide desert trip model from Improvement 9. Any authenticated user can start a breadcrumb session: location is stored every N minutes via client poll. If no update arrives within 2× the expected interval, the server emits `sos.overdue` event → notification to emergency contact.

**trip_breadcrumbs** table extends the `desert_trips` model from Improvement 9:

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | |
| `trip_id` | UUID → desert_trips | |
| `location` | geometry(Point) | |
| `recorded_at` | timestamptz | |

---

## Improvement 17 — Solar Energy Community Map ⚠️ Stretch

**Service:** Market Service (:8002) for installer directory; Map Service (:8004) for map layer  
**Impact:** Medium · **Effort:** Low · **Hackathon domain:** Solar Energy & Environment

### 17.1 Motivation

New Valley has Egypt's highest solar irradiance (2,600–2,800 kWh/m²/year) but near-zero residential and commercial uptake. NREA subsidies and EBRD financing exist but are unknown to residents. This improvement covers the only hackathon judging domain not yet represented on the platform.

### 17.2 Data Model

No new tables required. Two existing mechanisms are extended:

**Market service listings** — solar installers register as `merchant` role listings with `category = 'solar_installer'` (add to `ListingCategory` enum). Their listing profile includes NREA certification number in the `metadata` JSON field.

**Map service POIs** — community solar installations (opt-in by residents) are stored as POIs with `poi_category = 'solar_installation'`. The POI `metadata` field stores `{ capacity_kw, monthly_kwh_savings, install_year }`.

### 17.3 Subsidy Information Cards

Static content (same pattern as Improvement 13). A small `solar_subsidies` record set in Market service with the same `benefit_info` table pattern: NREA residential subsidy, NREA agricultural pump grant, net-metering tariff explainer.

### 17.4 Solar Irradiance Overlay

A static GeoJSON file of New Valley's solar irradiance zones (from published NREA data) served as a map overlay. No new database columns. Frontend renders it as a semi-transparent choropleth layer on the Map page.

### 17.5 API Surface

Reuses existing endpoints:

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/listings?category=solar_installer` | Solar installer directory |
| GET | `/api/v1/pois?category=solar_installation` | Community solar map pins |
| GET | `/api/v1/benefits?tag=solar` | Solar subsidy info cards |
| GET | `/static/solar-irradiance-nv.geojson` | Nginx-served static file |

---

## Demo Narrative (Hackathon Judging)

The following sequence demonstrates economic impact in a single linear story:

1. **Farmer** (resident role) posts a produce listing for 2 tonnes of oasis dates via Improvement 4.
2. Farmer sets a price alert on the dates commodity via Improvement 3 — "notify me when dates hit 8 EGP/kg."
3. Farmer checks his well log — Improvement 14 shows electricity cost is 0.42 EGP/m³; the solar savings estimator shows an NREA subsidy would pay back in 3.1 years.
4. **Young woman** (student role) sees a job post for "harvest sorting, 3 days, Al-Dakhla" via Improvement 1.
5. She applies. Farmer accepts. Job moves to `in_progress`.
6. Farmer marks the job complete. Wallet transfer executes — money moves from farmer to worker, visible on both dashboards.
7. Both leave reviews. Worker's rating increases her employability on the platform.
8. **Resident** (student role, in Dakhla) checks the bus departure board — Improvement 15 shows the Kharga–Dakhla bus departed at 09:15, ETA Dakhla at 13:40. She decides to travel.
9. **Tourist** books a local guide (existing flow). Guide has an ETAA badge and eco-pledge signature visible via Improvements 9 and 12.
10. Guide registers a desert trip safety plan via Improvement 9. Emergency contact is set; SOS button is active via Improvement 16 for the entire journey.
11. Tourist checks heritage site status before visiting El-Bagawat via Improvement 8 — it shows "Open, limited access until 14:00."
12. **Low-income resident** opens the Government Services navigator — Improvement 13 shows she qualifies for Takaful wa Karama and lists the three documents to bring to the Kharga Social Affairs office.
13. All money flows through the platform. New Valley keeps its economy local.
