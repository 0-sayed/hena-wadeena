# Technical Issues — Part 2

> **Purpose:** Detailed breakdown of additional technical problems requiring resolution. Each issue includes context, current behavior, expected behavior, and acceptance criteria to facilitate agent-driven development.

---

## Master Checklist

Use this checklist to track overall resolution progress across both issue files.

### Part 1 Issues
- [ ] **Issue 1** — Crops Page: Category Mismatch + Inline Forms + Price Change Calculation
- [ ] **Issue 2** — Homepage Role Boards: Cards Not Role-Aware
- [ ] **Issue 3** — Text Direction Not Language-Aware (RTL/LTR)
- [ ] **Issue 4** — Admin Dashboard: Missing Navigation Elements
- [ ] **Issue 5** — Logistics Page: Missing Tab for Local Transport Companies
- [ ] **Issue 6** — Marketplace Page: No Clear Way to Add a New Supplier
- [ ] **Issue 7** — Wallet Charging Page: Persistent Network Error on Recharge

### Part 2 Issues
- [ ] **Issue 8** — Search Result Click Navigates to Marketplace Instead of Ad Detail Page
- [ ] **Issue 9** — Tourist Guides Page: Guide Name Missing + Image Not Uniform
- [ ] **Issue 10** — Maps: No "Open in Google Maps" Option
- [ ] **Issue 11** — Student Dashboard: Housing Section Oversized — Replace with Compact Preview
- [ ] **Issue 12** — Top Navbar: Missing Accommodation Tab (`tourism/accommodation`)

---

## Issue 8 — Search Result Click Navigates to Marketplace Instead of Ad Detail Page

### Context
The application has a global search feature that returns results including specific marketplace ads/listings.

### Current Behavior
- When a user clicks on a specific ad from the search results, they are redirected to the **general Marketplace page** (`/marketplace` or similar) instead of the **individual ad's detail page**.

### Expected Behavior
- Clicking any ad in the search results must navigate directly to that ad's **dedicated detail page** (e.g., `/marketplace/ads/:id` or `/listings/:id`).
- The detail page should display full information about that specific listing.

### Suspected Cause
- The search result item link is likely pointing to a static route (`/marketplace`) instead of a dynamic route (`/marketplace/:adId`).
- The ad `id` may not be passed through or used in the navigation handler.

### Acceptance Criteria
- [ ] Clicking a search result ad navigates to the correct individual ad detail page.
- [ ] The URL includes the ad's unique identifier (e.g., `/marketplace/ads/123`).
- [ ] The detail page loads and displays the correct ad's full information.
- [ ] Back navigation from the detail page returns to the search results or previous page correctly.

---

## Issue 9 — Tourist Guides Page: Guide Name Missing + Non-Uniform Profile Image

### Context
The application has a **Tourist Guides** section displaying guide cards and individual guide profile pages.

### Current Behavior
- The **guide's name is not displayed** on the guide card (listing view).
- The **guide's name is also not displayed** on the guide's individual profile page.
- The guide's profile image is not uniformly styled — inconsistent sizing or cropping across profiles.

### Expected Behavior
1. **Guide name** must be clearly visible on:
   - The **card** in the listing/grid view.
   - The **profile page** header or hero section.
2. **Profile image** on the guide's individual page must use the following CSS classes (or equivalent styling):
   ```
   w-full h-full object-cover
   ```
   This ensures all guide images fill their container uniformly without distortion.

### Acceptance Criteria
- [ ] Guide name is displayed on the guide card in the listing view.
- [ ] Guide name is displayed prominently on the guide's individual profile page.
- [ ] Guide profile image uses `w-full h-full object-cover` (or equivalent) styling.
- [ ] No image distortion or inconsistency across different guide profiles.
- [ ] Changes are applied consistently across all existing guide records.

---

## Issue 10 — Maps: No "Open in Google Maps" Option

### Context
Maps are embedded in various parts of the application (e.g., location pins for listings, logistics, accommodation, etc.).

### Current Behavior
- Maps are displayed as embedded views with no external link or action.
- Users cannot open the location in a native maps application.

### Expected Behavior
- Every map instance across the application must include a clearly visible **"Open in Google Maps"** button or link.
- Clicking the button should open Google Maps in a **new browser tab** with the correct coordinates or place.

### Implementation Notes
Use the following URL format to open a location in Google Maps:
```
https://www.google.com/maps?q={latitude},{longitude}
```
Or for a named place:
```
https://www.google.com/maps/search/?api=1&query={encoded_place_name}
```

- The link must open in a **new tab** (`target="_blank"` with `rel="noopener noreferrer"`).
- Button/link should be placed visibly on or near the map (e.g., top-right corner overlay, or below the map).
- Must work on both desktop and mobile (on mobile, it will open the Google Maps app if installed).

### Acceptance Criteria
- [ ] All map instances in the app include an "Open in Google Maps" link/button.
- [ ] The link opens the correct geographic location in Google Maps.
- [ ] Link opens in a new tab on desktop / native Maps app on mobile.
- [ ] Button placement does not obstruct the map view.

---

## Issue 11 — Student Dashboard: Housing Section Oversized

### Context
The **Student Dashboard** has a section for browsing available student housing listings. This section currently takes up a disproportionately large area on the dashboard.

### Current Behavior
- A large portion of the student dashboard is dedicated to displaying all or many housing listings inline.
- This consumes excessive screen space without meaningful added value on the dashboard level.

### Expected Behavior
Replace the large housing section with a **compact preview widget**:

1. Display only the **3 cheapest available housing options** as summary cards (name, price, brief info).
2. Include a clearly labeled **"View All Housing"** button that navigates to the full housing page where all listings are available (e.g., `/housing` or `/tourism/accommodation`).
3. The widget should be appropriately sized — it should not dominate the dashboard layout.

### Suggested Card Fields (compact view)
| Field | Display |
|---|---|
| Place name | Bold title |
| Price | Highlighted (e.g., "150 EGP/night") |
| Location or type | Subtitle text |
| Thumbnail image | Small image on the side |

### Acceptance Criteria
- [ ] Housing section on student dashboard shows a maximum of 3 listings.
- [ ] The 3 listings displayed are the cheapest currently available options.
- [ ] A "View All" / "Browse Housing" button is present and navigates to the full housing page.
- [ ] The compact widget does not take excessive vertical or horizontal space.
- [ ] Full housing browsing experience remains intact on the dedicated housing page.

---

## Issue 12 — Top Navbar: Missing Accommodation Tab

### Context
The application's top navigation bar (main site header) provides links to key sections of the platform.

### Current Behavior
- There is no tab or link in the top navbar that leads to the **Accommodation page** (`/tourism/accommodation`).
- Users have no direct, visible navigation path to the accommodation section from the main header.

### Expected Behavior
- Add a **main navigation tab** in the top navbar (alongside existing tabs) labeled:
  - English: **"Accommodation"** (or "Housing")
  - Arabic: **"السكن"** (or "الإقامة")
- Clicking the tab navigates to `/tourism/accommodation`.
- The tab should be **highlighted/active** when the user is on that route or any of its sub-routes.

### Implementation Notes
- Follow the same visual style and behavior as existing navbar tabs.
- Ensure the tab is responsive and works in the mobile hamburger menu as well.
- Apply i18n/translation key for the label if internationalization is already in use.

### Acceptance Criteria
- [ ] Accommodation tab is visible in the top navbar on all pages.
- [ ] Clicking the tab navigates to `/tourism/accommodation`.
- [ ] Tab shows active/highlighted state when on the accommodation route.
- [ ] Tab label is correctly translated in both English and Arabic.
- [ ] Tab is accessible in the mobile responsive menu.

---

*Last updated: 2026-04-01 | Language: EN | Status: Open*
