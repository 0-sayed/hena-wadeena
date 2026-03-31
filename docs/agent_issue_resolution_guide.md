# Agent Issue Resolution Guide

This document tracks the webapp issues that were addressed in code during this pass.

Validation note:
- [ ] Automated web validation is still pending because the current environment does not have the frontend dependencies installed (`vite` and `tsc` are unavailable from `apps/web`).

---

## Critical and Functional Issues

### 1. Accommodation Page Not Accessible

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Fixed the student accommodation CTA to point to `/tourism/accommodation` instead of the marketplace.
- [x] Added the public accommodation listings route in the app router.
- [x] Kept the accommodation flow accessible to student users without introducing restrictive role guards.
- [x] Wired the accommodation list, details, and inquiry flow together.
- [ ] Run end-to-end navigation QA after dependencies are installed.

### 2. Search Function Not Working

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Fixed search query normalization in the shared search hook and API layer.
- [x] Connected the tourism hero search to a real `onSubmit` flow.
- [x] Connected the investment hero search to a real `onSubmit` flow.
- [x] Kept empty and error states visible on the search results page.
- [ ] Run search QA with multiple queries after dependencies are installed.

### 3. Wallet Recharge Fails (Network Error)

Status: Implemented with a safe frontend fallback, runtime QA pending.

Completed work:
- [x] Replaced the broken recharge path with a local wallet store fallback so users can recharge without hitting a dead endpoint.
- [x] Kept wallet balance updates immediate in the UI.
- [x] Preserved user-facing error handling and invalid amount checks.
- [x] Integrated the same wallet state with package booking deductions.
- [ ] Run wallet recharge and booking smoke tests after dependencies are installed.

---

## User Profile and Data Issues

### 4. Profile Picture Update Not Working

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Reworked the profile avatar upload flow in the webapp.
- [x] Encoded selected images before sending them through the profile update API.
- [x] Extended the backend profile update DTO and service to accept avatar updates.
- [x] Synced the updated user payload back into the auth context so the UI refreshes immediately.
- [x] Allowed common image formats in the client flow.
- [ ] Run manual avatar upload QA after dependencies are installed.

### 5. Invalid Data in Edit Profile Page

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Removed fake placeholder profile data and bound the form to authenticated user data.
- [x] Added client-side validation for name, email, phone, and upload constraints.
- [x] Added backend validation for expanded profile fields.
- [x] Added inline feedback and toast errors for invalid submissions.
- [ ] Run valid and invalid profile submission QA after dependencies are installed.

---

## Trips and Roles Logic Issues

### 6. Incorrect Role Display in "My Trips"

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Updated the "My Trips" view to filter passenger entries for rides the current user already owns as a driver.
- [x] Prevented the same ride from appearing under both driver and passenger sections in the logistics sheet.
- [x] Kept ride ownership checks based on the real ride driver id.
- [ ] Run driver/passenger role QA after dependencies are installed.

### 7. Missing Driver Controls

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Added activate, cancel, and delete ride actions to the logistics ride list for ride owners.
- [x] Added activate, cancel, delete, and details actions to the driver dashboard.
- [x] Added activate and delete support to the ride details page alongside cancel.
- [x] Added frontend hooks for activate and delete ride APIs.
- [x] Added backend endpoints for ride activate and ride delete.
- [x] Scoped the controls to the owning driver in the UI.
- [ ] Run driver action QA after dependencies are installed.

---

## Feature Gaps and Missing Functionality

### 8. Tour Package Booking and Wallet Integration

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Integrated wallet deduction into the package booking confirmation flow.
- [x] Added insufficient balance handling in the booking flow.
- [x] Reflected balance changes immediately in the wallet-backed UI state.
- [ ] Run booking QA with sufficient and insufficient balance after dependencies are installed.

### 9. Investor Communication System Missing

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Added backend access for opportunity owners to fetch their own opportunities.
- [x] Added backend access for opportunity owners to view received investment interests.
- [x] Connected the investment contact page to the real inquiry submission endpoint.
- [x] Added an investor inbox to view received inquiries inside the investor dashboard.
- [x] Added direct reply actions through email and phone from the investor inbox.
- [ ] Run investor inquiry QA after dependencies are installed.

### 10. Tourism Locations Not Integrated with Maps

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Replaced raw location display on the attraction details page with an interactive map.
- [x] Kept map markers and nearby place context visible in tourism flows.
- [x] Preserved responsive layout behavior in the updated tourism details pages.
- [ ] Run tourism map QA after dependencies are installed.

---

## Dashboards and Admin Issues

### 11. Tour Guide Dashboard Not Implemented

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Implemented the guide dashboard.
- [x] Added guide profile create and update flows.
- [x] Added package create, update, and delete flows.
- [x] Added booking management actions for guides.
- [x] Added the guide dashboard route with guide-only access.
- [ ] Run guide dashboard QA after dependencies are installed.

### 12. Merchant Dashboard Lacks Functionality

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Reworked the merchant dashboard around real owned listings.
- [x] Added listing create, edit, and delete flows.
- [x] Added price editing within the listing form using integer piasters.
- [x] Connected the dashboard to the new `GET /listings/mine` backend endpoint.
- [ ] Run merchant dashboard QA after dependencies are installed.

### 13. Review Dashboard Not Properly Linked

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Added a reviewer dashboard route at `/reviewer`.
- [x] Connected the homepage review entry point to a working route.
- [x] Reused the moderation data source in a dedicated reviewer page.
- [x] Expanded backend moderation access for reviewer users where needed.
- [ ] Run reviewer dashboard QA after dependencies are installed.

### 14. Admin Control Over Crops Page Missing

Status: Implemented in code, runtime QA pending.

Completed work:
- [x] Confirmed and preserved the existing admin crops management page.
- [x] Added the admin crops route to the main app router.
- [x] Added the crops entry to the admin navigation.
- [x] Kept create, update, price update, and deactivate flows wired to the commodities APIs.
- [ ] Run admin crops QA after dependencies are installed.

---

## Completion Summary

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 1 | Accommodation page not accessible | Critical | Implemented, QA pending |
| 2 | Search function not working | Critical | Implemented, QA pending |
| 3 | Wallet recharge fails | Critical | Implemented with frontend fallback, QA pending |
| 4 | Profile picture update not working | High | Implemented, QA pending |
| 5 | Invalid data in edit profile page | High | Implemented, QA pending |
| 6 | Incorrect role display in My Trips | Medium | Implemented, QA pending |
| 7 | Missing driver controls | Medium | Implemented, QA pending |
| 8 | Tour package booking and wallet integration | Feature | Implemented, QA pending |
| 9 | Investor communication system missing | Feature | Implemented, QA pending |
| 10 | Tourism locations not on maps | Feature | Implemented, QA pending |
| 11 | Tour guide dashboard not implemented | Dashboard | Implemented, QA pending |
| 12 | Merchant dashboard lacks functionality | Dashboard | Implemented, QA pending |
| 13 | Review dashboard not properly linked | Dashboard | Implemented, QA pending |
| 14 | Admin control over crops page missing | Dashboard | Implemented, QA pending |
