# Project Status: Arzoni Local Discovery App

## Current Implementation (As of April 9, 2026)

### 1. Authentication & Roles
- **Provider**: Supabase Auth.
- **Methods**: Magic Link (Email) is the primary working method. Google OAuth is implemented but requires Client ID/Secret configuration in Supabase Dashboard.
- **Admin Role**: Hardcoded to `khazratkulovshokhzod@gmail.com` in `src/lib/AuthContext.tsx`.
- **Admin Access**: When logged in as the admin, a "Shield" icon appears in the Navbar leading to the Admin Center.

### 2. Admin Center UI (`src/components/AdminDashboard.tsx`)
- **Overview**: Shows stats for total listings, sponsored, and verified items.
- **Restaurant Management**: 
    - List of all restaurants with search.
    - **Promote (Sponsored)**: Toggles `is_sponsored` field. Sponsored items jump to the top of the main list.
    - **Verify**: Toggles `is_verified` field. Adds a blue checkmark badge.
- **Banner Manager**: 
    - Full CRUD for ad banners.
    - Image upload with compression.
    - Link banners to specific restaurants.
    - Set expiry dates.

### 3. Monetization Features
- **Sponsored Listings**: Implemented sorting logic in `App.tsx` that prioritizes `isSponsored: true` restaurants regardless of other filters/sorts.
- **Ad Banners (Billboard)**: Horizontal carousel at the top of the home screen displaying active promotions.
- **Visual Badges**: "Sponsored" and "Verified" badges appear on cards and in details modals.

### 4. Database Schema Updates
The Supabase database now includes:
- `restaurants` table: `is_sponsored`, `is_verified`.
- `banners` table: `id`, `image_url`, `restaurant_id`, `expiry_date`, `created_at`.

---

## Roadmap & Next Steps for the Next AI Agent

### Phase 3: Business Portal
- Allow restaurant owners to log in and see their own listing stats.
- Implement a "Request Promotion" flow where they can pay to be sponsored.

### Phase 4: Mobile Optimization
- Ensure the Admin Center is fully responsive for management via smartphone (APK/IPA).

---

## Critical Configuration Note
If you remix this app, you **MUST** update the **Site URL** in the Supabase Authentication settings to match the new project URL, otherwise Magic Links will redirect to `localhost:3000` and fail.
