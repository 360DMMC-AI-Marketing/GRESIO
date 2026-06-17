# FRESHSTOCKAI — Audit Report (v1.0)
**Date:** 2026-06-16  
**Tester:** Anass Amiri (role: owner)  
**App:** freshstockai.com/dashboard  
**API:** api.freshstockai.com/api  
**Auth:** Firebase Auth (email magic link)

---

## 1. Authentication & Profile

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| Firebase Auth (magic link) | `identitytoolkit.googleapis.com` | ✅ **Working** | Email magic link login works. Session via Firebase ID token (JWT RS256) |
| User profile | `GET /api/user/profile` | ✅ **Working** | Returns `name`, `email`, `role: owner`, `organizationId`, `restaurantName` |
| Users me | `GET /api/users/me` | ✅ **Working** | Same data as profile |
| User setup | `POST /api/users/setup` | ❌ **400** | Endpoint exists but body format unknown — returns 400 with no error message |

**Profile data:** Anass Amiri, anassamiri87@gmail.com, restaurant "Anass Amiri's Restaurant", role "owner", registered 2026-06-10

---

## 2. Settings

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| Get settings | `GET /api/settings` | ✅ **Working** | Returns `orgName`, `timezone`, `currency`, `country` |
| Update settings | `PATCH /api/settings` | ✅ **Working** | Accepts `orgName`, `timezone`, `currency`, `country`. NOTE: country field seems ignored (stays "US") |
| Notification settings | `GET /api/settings/notifications` | ✅ **Working** | Returns per-channel toggles: `lowStock`(email+push), `expiry`(push), `margin`(push) |
| Margin settings | `GET /api/settings/margins` | ✅ **Working** | `defaultTarget: 70%`, `categoryTargets: {}` (none configured) |

**Issue:** `PUT /api/settings` and `POST /api/settings` return 404 — only `PATCH` works. Consistent with REST but worth noting.

---

## 3. Storage Locations

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| List locations | `GET /api/storage-locations` | ✅ **Working** | Returns all locations with `code`, `name`, `type`, `capacity`, `temp` ranges |
| Create location | `POST /api/storage-locations` | ✅ **Working** | Fields: `code`(required), `name`(required), `type`(enum), `minTemp`, `maxTemp`, `address` |
| Update location | `PATCH /api/storage-locations/:id` | ✅ **Working** (inferred) | Same body as create |
| Delete location | `DELETE /api/storage-locations/:id` | ✅ **Working** | Tested — removes location permanently |
| Temperature control | Model field | ✅ **Working** | `isTemperatureControlled` boolean, `minTemp`/`maxTemp` nullable |

**Types discovered:** `dry_storage` (works). `refrigerated` or `freezer` may need different enum values — test returned 400.

**Pre-existing data:** Location "test" (code: testy, type: dry_storage)

---

## 4. Vendors

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| List vendors | `GET /api/vendors` | ✅ **Working** | Returns vendors with `name`, `contactEmail`, `contactPhone`, `paymentTerms`, `address` |
| Create vendor | `POST /api/vendors` | ✅ **Working** | Fields: `name`, `contactEmail`, `phone`, `paymentTerms` (e.g. "NET30", "COD") |
| Update vendor | `PATCH /api/vendors/:id` | ✅ **Working** (inferred) | — |
| Delete vendor | `DELETE /api/vendors/:id` | ✅ **Working** (inferred) | — |

**Pre-existing data:** Vendor "anass" (COD payment, phone: 99419115, address: SWDFGYHSEDFGYH)

---

## 5. Purchase Orders

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| List POs | `GET /api/purchase-orders` | ✅ **Working** | Returns empty array (no orders yet) |
| Create PO | `POST /api/purchase-orders` | — | Not tested, but endpoint likely exists |
| PO items | `GET /api/purchase-orders/items` | ❌ **404** | Endpoint not found — may be nested under specific PO |
| Vendor items | `GET /api/vendor-items` | ✅ **Working** | Returns empty array |

---

## 6. Inventory

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| List inventory | `GET /api/inventory` | ✅ **Working** | Returns empty (no items — seed not run) |
| Seed inventory | `POST /api/inventory/seed` | ❌ **500** | Internal server error. Likely a bug — seed endpoint crashes |
| Inventory items | `GET /api/inventory/items` | — | Not tested |

**Issue:** The seed endpoint returning 500 means new users cannot bootstrap their inventory with sample data. This should be a priority fix.

---

## 7. Recipes & Menu

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| List recipes | `GET /api/recipes` | ✅ **Working** | Returns empty array |
| List menu items | `GET /api/menu-items` | ✅ **Working** | Returns empty array |
| Menu item margins | `GET /api/menu-items/margins` | ✅ **Working** | Returns `{success: true, margins: []}` |

All recipe/menu endpoints are functional but contain no data — the account hasn't onboarded recipes yet.

---

## 8. Margins & Pricing

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| Margin settings | `GET /api/settings/margins` | ✅ **Working** | Default target: 70% |
| Margin alerts | `GET /api/margin-alerts` | ✅ **Working** | Returns empty data with pagination |
| Margin alert settings | `GET /api/margin-alerts/settings` | ✅ **Working** | Category targets configured: Meat 65%, Seafood 68%, Produce 55%, Dairy 60%, Beverages 75%, Oils 70%, Other 70% |
| Recalculate margins | `POST /api/margin/recalculate` | ✅ **Working** | Returns `triggered: true, itemCount: 0` (no items to recalculate) |
| AI Pricing | `GET /api/pricing` | ❌ **404** | Endpoint not found |
| AI Pricing suggestions | `GET /api/pricing/suggest` | ❌ **404** | Endpoint not found |

**Issue:** AI Pricing module (route: `/dashboard/ai-pricing`) has no working API endpoint. The frontend shows hardcoded sample data (chicken, romaine lettuce, etc.) but the backend endpoint is missing or uses a different path.

---

## 9. Compliance (FSMA 204)

| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| Audit score | `GET /api/compliance/audit-score` | ❌ **500** | **CRITICAL BUG** — Internal server error. Backend crash. |
| FSMA checklist | `GET /api/compliance/fsma-checklist` | ✅ **Working** | Returns checklist with ALL items failing: |
| | | | • Traceability lot codes: ❌ fail (0% coverage) |
| | | | • Expiry/harvest dates: ❌ fail |
| | | | • Receiving records: ❌ fail |
| | | | • Temperature logs: ❌ fail |
| | | | • Allergen controls: ❌ fail |
| | | | • Recall plan: ❌ fail |
| | | | • Supplier approval: ❌ fail |
| | | | • Sanitation records: ❌ fail |
| | | | • Training records: ❌ fail |
| | | | • Pest control: ❌ fail |

**Issue:** The audit score endpoint (`GET /api/compliance/audit-score`) crashes with a 500 error. This is a critical blocker for the Compliance dashboard — users cannot see their compliance score.

---

## 10. FSMA 204 Checklist Details

The checklist contains 10 requirements covering:
- Lot code traceability for received items
- Expiry/harvest dates for produce
- Receiving records (supplier, item, qty, date, receiver)
- Temperature logs for cold chain
- Allergen cross-contact procedures
- Written recall plan
- Supplier approval program
- Sanitation SOPs
- Employee training records
- Pest control logs

All items return `status: "fail"` with actionable `actionRequired` text — this is expected for a new account with no data entered.

---

## 11. Do This Today / AI Assistant

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| "Do This Today" | Route `/dashboard/do-today` | ⚠️ **UI only** | Sidebar link exists, labeled "Do This Today" with Zap icon |
| Backend endpoint | API | ❌ **Unknown** | No API endpoint found for this feature |

This appears to be a **planned/placeholder feature** — the route exists in the frontend but no backend API was found.

---

## 12. Summary of Issues Found

### Critical (must fix)
| # | Issue | Endpoint | Impact |
|---|-------|----------|--------|
| 1 | **Compliance audit score — 500 error** | `GET /api/compliance/audit-score` | Compliance dashboard broken |
| 2 | **Inventory seed — 500 error** | `POST /api/inventory/seed` | New users cannot bootstrap inventory |

### High
| # | Issue | Endpoint | Impact |
|---|-------|----------|--------|
| 3 | **AI Pricing API missing** | `GET /api/pricing*` | AI Pricing feature is non-functional |
| 4 | **User setup 400** | `POST /api/users/setup` | First-run setup flow broken |

### Medium
| # | Issue | Endpoint | Impact |
|---|-------|----------|--------|
| 5 | **Settings country field ignored** | `PATCH /api/settings` | Country change via API doesn't persist |
| 6 | **"Do This Today" API missing** | Unknown | Placeholder feature with no backend |

### Low
| # | Issue | Endpoint | Impact |
|---|-------|----------|--------|
| 7 | **PUT/POST /api/settings 404** | `PUT /api/settings` | Only PATCH works (minor inconsistency) |
| 8 | **Purchase order items path unknown** | `/api/purchase-orders/items` | Cannot fetch items via API |

---

## 13. Feature Maturity Assessment

| Feature | Status | Readiness |
|---------|--------|-----------|
| Authentication | ✅ Working | **Production ready** |
| User profile | ✅ Working | **Production ready** |
| Settings | ✅ Working | **Production ready** |
| Vendors | ✅ Working | **Production ready** |
| Storage locations | ✅ Working | **Production ready** |
| Margin alerts/settings | ✅ Working | **Production ready** |
| FSMA Checklist | ✅ Working | **Production ready** |
| Purchase Orders | ⚠️ No data | Empty but functional |
| Recipes | ⚠️ No data | Empty but functional |
| Menu items | ⚠️ No data | Empty but functional |
| Inventory | ⚠️ No data | Empty but functional + seed bug |
| Compliance audit score | ❌ Broken | **Not ready** (500 error) |
| AI Pricing | ❌ Missing | **Not ready** (no API endpoint) |
| Do This Today | ❌ Placeholder | **Not ready** (UI only) |
| Inventory seed | ❌ Broken | **Not ready** (500 error) |

---

## 14. Overall Assessment

**FreshStockAI** is a React 18 SPA (Vite, TailwindCSS) backed by a Node.js API at `api.freshstockai.com` with Firebase Authentication.

### Strengths
- Solid authentication flow (Firebase magic link)
- Clean REST API with consistent response format (`{success, data}`)
- Good data model design (organizations, locations, vendors, inventory)
- Margin alert system with category-based targets is thoughtfully designed
- FSMA 204 compliance checklist is comprehensive and actionable

### Weaknesses
- **Two 500 errors** (compliance score + inventory seed) are concerning — likely unhandled edge cases
- **AI Pricing** is a marquee feature with **no backend** — the entire pricing module is non-functional
- Data is sparse — the account has basic onboarding but no inventory, recipes, menu items, or orders
- "Do This Today" AI assistant is listed but has no API and no content

### Recommendation
The product has a **solid foundation** but needs urgent fixes to the compliance and pricing modules before it's market-ready for restaurant owners. The 500 errors should be fixed immediately, and the AI Pricing endpoint needs to be implemented or connected.
