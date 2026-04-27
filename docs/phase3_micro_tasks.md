# Phase 3 — High-Density Production & Admin Controls: Micro-Tasks

### Environment Context
- **Stack:** Next.js App Router, TailwindCSS, Supabase, React Query
- **Rule:** Every instruction must be atomic, precise, and verified before committing.
- **Design Direction:** Visual-First Grid (Option 3) — photo as card background, dark gradient overlay for metadata legibility.

---

## Feature 1: Kanban Board — Visual-First Grid Overhaul

---

### Task 1: DB Migration — Add `quantity` to `order_items`
**Objective:** The Kanban card needs to display "Item Name & Quantity". `quantity` does not currently exist on `order_items`.
**Actionable Instructions:**
1. Create a new file: `supabase/migrations/018_order_item_quantity.sql`.
2. Insert the following SQL:
   ```sql
   ALTER TABLE public.order_items
     ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);
   ```
3. Run `supabase db push` to apply the migration.
4. Update `src/app/api/order-items/route.ts` (the POST handler) to accept and save the `quantity` field from the request body.
5. Update the `AddItemModal` form in `src/components/orders/AddItemModal.tsx` to include a `quantity` number input field (min: 1, default: 1).
**Verification:** Confirm the column exists via Supabase Studio. Run `npx tsc --noEmit`.
**Git Commit:** `git commit -m "feat(db): add quantity column to order_items"`

---

### Task 2: Augment Kanban API — Include Design Photos & QC Photos
**Objective:** The Kanban API must return photo data so cards can display thumbnails.
**Actionable Instructions:**
1. Open `src/app/api/kanban/route.ts`.
2. For the **Phase 1 orders** query, extend the `.select()` to also fetch `design_files (file_url, uploaded_at)`.
3. For the **Phase 2 items** query, extend the `.select()` to also fetch the QC photo from the order's stage:
   - Join `order_stages ( *, qc_checks ( photo_url, passed ) )` in the item query.
4. In the card assembly logic, resolve a `thumbnail_url` with the following priority:
   - **If `stageKey === 'qc_check'`**: use `qc_checks[0]?.photo_url` (the most recent QC proof).
   - **Otherwise**: use the first `design_files[0]?.file_url` from the parent order.
5. Expose `thumbnail_url` and `quantity` in the final card object pushed to `groupedOrders`.
**Verification:** Hit `/api/kanban` in browser and confirm the JSON objects include `thumbnail_url` and `quantity`.
**Git Commit:** `git commit -m "feat(api): augment kanban endpoint with thumbnail and quantity fields"`

---

### Task 3: Redesign `KanbanCard` — Visual-First Photo Background
**Objective:** Rebuild `KanbanCard` to use the photo as the primary visual, with a bottom gradient overlay for high-contrast metadata.
**Actionable Instructions:**
1. Open `src/components/kanban/KanbanCard.tsx`.
2. Change the card's root structure to `relative overflow-hidden rounded-xl` with a fixed aspect ratio (e.g., `aspect-[4/3]` or `aspect-square`).
3. **Background Layer:** If `order.thumbnail_url` exists, render an `<img>` with `absolute inset-0 w-full h-full object-cover`. If no thumbnail, render a styled placeholder (e.g., a gradient using the stage color).
4. **Gradient Overlay:** Add an `absolute inset-0` element with `bg-gradient-to-t from-black/80 via-black/20 to-transparent`.
5. **Top-Left Badge:** Retain the `order_number` badge (small, semi-transparent `bg-black/40` pill) anchored top-left.
6. **Top-Right Badges:** Show Priority `⚡` and Stalled `⏰` icons if applicable (small, icon-only).
7. **Bottom Metadata Panel** (overlaid on gradient): Using `absolute bottom-0 left-0 right-0 p-3 text-white`, display:
   - **Line 1:** `{order.item_name} × {order.quantity}` — `font-semibold text-sm`
   - **Line 2:** `{order.customers?.name}` — `text-xs text-white/80`
   - **Line 3:** `📅 {delivery_date}` — `text-xs text-white/70`
8. Retain the stage-color top border (use `border-t-4`).
9. Keep the "Quick Advance" arrow button, but style it as a small `bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-md` button anchored bottom-right inside the panel.
10. Remove the `Track X` badge and the `stalling hours` text from the card body — this clutter is no longer needed on visual cards.
**Verification:** Run `npx tsc --noEmit`. Start dev server and navigate to `/dashboard/kanban`.
**Git Commit:** `git commit -m "feat(kanban): redesign KanbanCard as visual-first photo card"`

---

### Task 4: Redesign Kanban Page — All-Departments Grid + Focus Mode
**Objective:** Remove the department dropdown filter. Show all 6 stages on one horizontal board. Add a "Focus Mode" pill selector.
**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/kanban/page.tsx`.
2. **Remove** the `activeDept` state and the department `<select>` dropdown from the header.
3. **Desktop board:** Remove `visibleStages` filtering. Always render all 6 stage columns.
4. **Reduce column width**: change `w-80` to `w-64` (or `min-w-[240px]`) so more columns fit on screen.
5. **Focus Mode Pill Bar:** Add a horizontal strip of pill buttons below the header (one pill per stage + an "All" pill). When a stage pill is active, the non-active column wrappers get `opacity-40 scale-[0.98] pointer-events-none` and the active column gets `ring-2 ring-primary`.
6. **Mobile Tabs:** Retain the existing mobile tabs (unchanged behaviour, just remove the "All Departments" option in the select, replace with the pill bar pattern).
7. **Last-Refreshed indicator:** Add a small `text-[10px] text-text-muted` label in the header showing `Last updated: {time}`, refreshed on the `refetchInterval`.
**Verification:** Navigate to `/dashboard/kanban` on desktop. Confirm all 6 columns are visible and horizontally scrollable. Test Focus Mode pills.
**Git Commit:** `git commit -m "feat(kanban): all-departments view with focus mode pills"`

---

## Feature 2: Workers Page — Attendance-First UX

---

### Task 5: Swap Workers Page Tab Order & Default
**Objective:** Make "Attendance" the first and default tab on the Workers page.
**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/workers/page.tsx`.
2. Line 69: Change `useState<"directory" | "attendance">("directory")` → `useState<"directory" | "attendance">("attendance")`.
3. Lines 176–188: Swap the order of the two tab `<button>` elements so "Attendance" renders first in the DOM and is the leftmost tab.
4. Line 167: Update the condition `activeTab === "directory"` that shows the "Add Worker" button — also show the button when `activeTab === "directory"` still (logic should be unchanged, just confirm it still works after reorder).
**Verification:** Navigate to `/dashboard/workers` and confirm the Attendance tab is visually selected by default. Run `npx tsc --noEmit`.
**Git Commit:** `git commit -m "fix(workers): set attendance as default tab and reorder tabs"`

---

## Feature 3: Completed Orders Archive

---

### Task 6: API Route — Completed Orders Endpoint
**Objective:** Create a dedicated endpoint for fetching only completed/cancelled orders, with pagination support.
**Actionable Instructions:**
1. Create a new file: `src/app/api/orders/completed/route.ts`.
2. Implement a `GET` handler that:
   - Authenticates the user (reject if unauthenticated).
   - Fetches from `orders` where `status IN ('completed', 'cancelled')` AND `deleted_at IS NULL`.
   - Joins `customers (name)` and `order_items (id, name, status)`.
   - Accepts `page` and `search` query params; implement offset-based pagination (20 per page).
   - Orders by `created_at DESC`.
   - Returns `{ data: orders[], count: number }`.
**Verification:** Hit `/api/orders/completed?page=1` and confirm a valid JSON response.
**Git Commit:** `git commit -m "feat(api): add completed orders endpoint with pagination"`

---

### Task 7: Build the Completed Orders Archive Page
**Objective:** Create a new page at `/dashboard/orders/completed` to browse historical orders.
**Actionable Instructions:**
1. Create `src/app/(dashboard)/dashboard/orders/completed/page.tsx`.
2. Add a `useCompletedOrders` hook in `src/hooks/useOrders.ts` that fetches from `/api/orders/completed`.
3. Build the page UI:
   - **Header:** "📦 Order Archive" with a subtitle "Completed & Cancelled Orders".
   - **Search Bar:** Filter by order number or customer name (client-side for loaded page, server-side via `search` param on new fetch).
   - **Table:** Columns — Order #, Customer, Status, Items, Completion Date.
   - **Pagination:** "Load More" button that increments the `page` param and appends results.
   - Use `StatusBadge` for the status column.
4. Add a link to this page from `src/app/(dashboard)/dashboard/orders/page.tsx` — add an "Archive" button next to "Recycle Bin" in the page header (visible to all authenticated users, not just admin).
**Verification:** Navigate to `/dashboard/orders/completed`. Confirm orders with `completed` or `cancelled` status are listed.
**Git Commit:** `git commit -m "feat(orders): build completed orders archive page"`

---

## Feature 4: Financial Reporting & Dynamic CSV Export

---

### Task 8: Fix the Financial Report Download
**Objective:** The "Export CSV" button on the Finance page links to `/api/export?type=finance` but may fail silently in browser due to auth cookie issues with `<Link target="_blank">`. Fix it to use a programmatic fetch.
**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/finance/page.tsx`.
2. Remove the `<Link href="/api/export?type=finance">` wrapper around the Export CSV button.
3. Replace it with an `onClick` handler that uses `window.fetch('/api/export?type=finance')`, then creates a Blob from the response and triggers a download via `URL.createObjectURL` and a temporary `<a>` element click.
4. Add a loading state (`isExporting`) to the button — show "Generating..." while the fetch is in flight.
5. On error, show a `toast.error("Failed to generate report")`.
**Verification:** Click the button and confirm a `.csv` file is downloaded with the correct finance data.
**Git Commit:** `git commit -m "fix(finance): fix CSV export using programmatic fetch+blob download"`

---

### Task 9: Dynamic Export Modal & Updated API
**Objective:** Replace the direct export link with an "Export Data" modal that lets the user choose what to include.
**Actionable Instructions:**
1. **New Component:** Create `src/components/shared/ExportModal.tsx` with the following UI:
   - A Dialog (using existing `<Dialog>` component).
   - **Section checkboxes** (all checked by default):
     - ☑ Core Order Data (Order #, Date, Status, Priority)
     - ☑ Customer Info (Name, Phone)
     - ☑ Financial Data (Quoted, Paid, Balance Due)
     - ☑ Production Data (Current Stage)
   - A "Download CSV" button that calls the API with the selected fields.
2. **Update API:** Open `src/app/api/export/route.ts`. Accept a `fields` query param (comma-separated list, e.g. `fields=order,customer,finance`). Conditionally include columns in the CSV header and data rows based on the selected fields.
3. **Wire up:** Open `src/app/(dashboard)/dashboard/finance/page.tsx` (and optionally `orders/page.tsx`). Replace the existing export button/link with a button that opens the `ExportModal`.
**Verification:** Open modal, deselect "Financial Data", download CSV — confirm financial columns are absent. Run `npx tsc --noEmit`.
**Git Commit:** `git commit -m "feat(export): dynamic field selection modal and updated API"`

---

## Task Complexity Summary

| # | Task | Feature | Complexity | Estimated Effort |
|---|------|---------|------------|-----------------|
| 1 | DB Migration: Add `quantity` to `order_items` | Kanban Overhaul | 🟢 Low | ~30 min |
| 2 | Augment Kanban API with thumbnails & quantity | Kanban Overhaul | 🟡 Medium | ~1 hour |
| 3 | Redesign `KanbanCard` — Visual-First Photo Background | Kanban Overhaul | 🔴 High | ~2–3 hours |
| 4 | Redesign Kanban Page — All-Depts Grid + Focus Mode | Kanban Overhaul | 🟡 Medium | ~1.5 hours |
| 5 | Swap Workers Page Tab Order & Default | Workers UX | 🟢 Low | ~15 min |
| 6 | API Route — Completed Orders Endpoint | Order Archive | 🟢 Low | ~30 min |
| 7 | Build Completed Orders Archive Page | Order Archive | 🟡 Medium | ~1.5 hours |
| 8 | Fix Financial Report CSV Download | Finance & Export | 🟢 Low | ~30 min |
| 9 | Dynamic Export Modal & Updated API | Finance & Export | 🔴 High | ~2 hours |

**Total Estimated Effort: ~10–11 hours**

### Complexity Legend
- 🟢 **Low** — Isolated change, minimal risk, straightforward implementation.
- 🟡 **Medium** — Multi-file change, some design decisions needed, moderate risk.
- 🔴 **High** — Deep architectural change, many files, requires careful testing and visual review.

### Recommended Execution Order
Tasks 5 → 8 first (quick wins). Then 1 → 6 → 2 → 4 → 7 → 3 → 9 (dependencies resolved in order).
