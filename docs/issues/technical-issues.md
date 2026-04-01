# Technical Issues — Admin Dashboard

> **Purpose:** Detailed breakdown of technical problems requiring resolution. Each issue includes context, current behavior, expected behavior, and acceptance criteria to facilitate agent-driven development.

---

## Issue 1 — Crops Page: Category Mismatch + Inline Forms + Price Change Calculation

### Context
The admin dashboard has a dedicated **Crops** page for managing crop categories. There is also a **Marketplace** that uses its own crop/category list.

### Current Behavior
- The crop categories displayed on the Crops admin page are **different** from the ones used in the Marketplace — they are not in sync.
- The forms for **adding a new crop** and **editing an existing crop's price** are rendered **statically and always visible** on the page (inline), even when not in use.
- There is no automatic calculation of price change percentage.

### Expected Behavior
1. **Unified category list:** The Crops page and the Marketplace must reference the **exact same** list of crop categories. Any crop added/edited/deleted from the Crops admin page must be immediately reflected in the Marketplace.
2. **Pop-up modals instead of inline forms:**
   - An **"Add Crop"** button should open a dedicated modal/dialog.
   - An **"Edit"** button per crop row should open a separate modal/dialog pre-filled with current data.
   - The inline forms must be completely removed from the static page layout.
3. **Automatic price change calculation:**
   - When editing a crop price, the system must automatically compute and display the **percentage increase or decrease** relative to the previous saved price.
   - Formula: `change% = ((newPrice - oldPrice) / oldPrice) * 100`
   - Display with a visual indicator (e.g., green arrow ↑ for increase, red arrow ↓ for decrease).

### Acceptance Criteria
- [ ] One shared crop category data source used by both Crops admin page and Marketplace.
- [ ] No inline add/edit forms visible on the Crops page by default.
- [ ] Add modal opens on "Add" button click; closes on save or cancel.
- [ ] Edit modal opens on "Edit" button click with pre-filled values; closes on save or cancel.
- [ ] Price change percentage is calculated and displayed upon editing price.

---

## Issue 2 — Homepage Role Boards: Cards Visibility Not Role-Aware

### Context
The homepage of the dashboard displays multiple **role board cards** (e.g., Farmer, Supplier, Logistics, Admin, etc.).

### Current Behavior
- **All cards are visible to all users** regardless of their assigned role.

### Expected Behavior
- Each user should **only see the cards relevant to their role**.
- The card visibility must be driven by the authenticated user's `role` field from the backend/session.
- Example: A user with role `farmer` should only see farmer-specific cards, not admin or logistics cards.

### Acceptance Criteria
- [ ] Cards are conditionally rendered based on the current user's role.
- [ ] No role-irrelevant cards are visible to any user.
- [ ] Superadmin/admin role sees all cards (or a defined superset).
- [ ] Role data is sourced from the authenticated session/token — not hardcoded.

---

## Issue 3 — Text Direction Not Language-Aware (RTL/LTR)

### Context
The application supports multiple languages including **Arabic** and **English**.

### Current Behavior
- Text direction is likely set statically (always LTR or always RTL), regardless of the selected language.

### Expected Behavior
- When the user selects **Arabic**: the entire UI must switch to **RTL** (`dir="rtl"`).
- When the user selects **English**: the entire UI must switch to **LTR** (`dir="ltr"`).
- This must apply globally: layout, text alignment, icons placement, padding/margin direction.

### Implementation Notes
- Set `dir` attribute on `<html>` or root container dynamically on language change.
- CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.) are preferred over physical ones (`margin-left`, `padding-right`) to avoid manual overrides.
- If using a framework like Next.js or React, update the `lang` and `dir` attributes on language switch.

### Acceptance Criteria
- [ ] Switching to Arabic applies `dir="rtl"` globally.
- [ ] Switching to English applies `dir="ltr"` globally.
- [ ] Layout visually mirrors correctly (e.g., sidebar moves to right in RTL).
- [ ] No hardcoded directional styles that conflict with RTL.

---

## Issue 4 — Admin Dashboard: Missing Navigation Elements

### Context
The admin dashboard panel currently lacks standard navigation and user account controls.

### Current Behavior
- There is **no back-to-home button**, **no logout button**, and **no access to user profile/personal data** from within the dashboard.

### Expected Behavior
Add the following elements to the dashboard navigation (sidebar, topbar, or user menu):

| Element | Behavior |
|---|---|
| **Back to Homepage** | Navigates user to the public-facing homepage |
| **Logout** | Clears session/token and redirects to login page |
| **Profile / Personal Data** | Opens a page or modal showing editable user info (name, email, phone, avatar, password change) |

### Acceptance Criteria
- [ ] A clearly visible "Back to Home" link/button is present in the dashboard.
- [ ] A "Logout" button is present; clicking it destroys the session and redirects to `/login`.
- [ ] A "Profile" section is accessible showing current user's data and allowing edits.
- [ ] All three elements are accessible from any page within the dashboard.

---

## Issue 5 — Logistics Page: Missing Tab for Local Transport Companies

### Context
The Logistics page manages shipping and transport options. Currently there is no section for local bus/transport companies operating in **Al-Wadi Al-Jadid** (الوادي الجديد) governorate.

### Current Behavior
- No tab or section dedicated to local transport (bus) companies in Al-Wadi Al-Jadid.

### Expected Behavior
1. Add a new **Tab** on the Logistics page labeled (e.g., "Local Transport" / "شركات النقل المحلية").
2. Inside the tab, display a list of transport companies with their details.
3. Admin must be able to **Add / Edit / Delete** companies from this tab.

### Company Data Fields (per company)
| Field | Type | Notes |
|---|---|---|
| `name` | Text | Company name |
| `logo` | Image upload | Company logo |
| `headquarters` | Text | Physical location/address |
| `booking_link` | URL | Link for online booking |
| `contact_info` | Text/Phone | Phone number or contact method |
| `general_info` | Long Text | General description / notes about the company |

### Acceptance Criteria
- [ ] New tab is visible on the Logistics page.
- [ ] Admin can add a new transport company with all fields listed above.
- [ ] Admin can edit an existing company's details.
- [ ] Admin can delete a company.
- [ ] Company logo is uploadable and displayed in the company card/list.
- [ ] Booking link is clickable and opens in a new tab.

---

## Issue 6 — Marketplace Page: No Clear Way to Add a New Supplier

### Context
The Marketplace page manages suppliers/vendors. Currently there is no obvious UI affordance to add a new supplier.

### Current Behavior
- No visible "Add Supplier" button or entry point on the Marketplace page.
- It is unclear to admin users how to create a new supplier record.

### Expected Behavior
- A clearly labeled **"Add Supplier"** button should be present (e.g., top-right of the Marketplace page).
- Clicking it should open a form (modal or dedicated page) to input supplier details.
- Suggested supplier fields: Name, Category, Contact Info, Location, Logo, Description, Status (active/inactive).

### Acceptance Criteria
- [ ] "Add Supplier" button is visible and accessible on the Marketplace page.
- [ ] Clicking the button opens an add-supplier form.
- [ ] Form validates required fields before submission.
- [ ] Newly added supplier appears immediately in the Marketplace list.
- [ ] Success/error feedback is shown after submission.

---

## Issue 7 — Wallet Charging Page: Persistent Network Error on Recharge

### Context
Users can recharge their wallet balance via the **Wallet Charging** page.

### Current Behavior
- Every attempt to submit a wallet recharge results in a **Network Error**.
- The operation fails consistently — no successful charges are going through.

### Steps to Reproduce
1. Log in as any user with access to the wallet page.
2. Navigate to the Wallet Charging page.
3. Enter a recharge amount and submit.
4. Observe: Network Error is returned.

### Suspected Causes (to investigate)
- API endpoint URL is incorrect or not reachable (wrong base URL / env variable mismatch).
- Missing or malformed authentication headers in the request.
- CORS policy blocking the request from the frontend origin.
- Payment gateway credentials not configured in the environment.
- Request payload format does not match what the backend expects.

### Expected Behavior
- The recharge request should complete successfully.
- User should see a confirmation message and updated wallet balance.
- If the payment fails for a legitimate reason (e.g., insufficient funds), a clear user-friendly error message is shown — **not** a generic network error.

### Acceptance Criteria
- [ ] Wallet recharge API call succeeds in staging and production environments.
- [ ] Network error is resolved (root cause identified and fixed).
- [ ] Success state: balance updates immediately after successful recharge.
- [ ] Error state: meaningful error messages shown for failed transactions.
- [ ] All API calls include proper auth headers and correct payload structure.

---

*Last updated: 2026-04-01 | Language: EN | Status: Open*
