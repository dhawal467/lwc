# Phase 4 — Micro-Task Prompts

## Sprint Structure
- **Sprint A** (Tasks 1–7): Order & Item Management (F1–F4)
- **Sprint B** (Tasks 8–10): FSM & Timeline (F5–F6)
- **Sprint C** (Tasks 11–17): Worker Attendance Overhaul (F7)

---

# SPRINT A — Order & Item Management

---

## Task 1: API — Accept `photo_url` in item PATCH endpoint

**Objective:** Allow updating `photo_url` via the existing `PATCH /api/order-items/[itemId]` route.

**PRD Ref:** F1

**Actionable Instructions:**
1. Open `src/app/api/order-items/[itemId]/route.ts`.
2. On line 17, add `photo_url` to the destructured fields:
   ```ts
   const { name, description, unit_price, photo_url } = body;
   ```
3. After line 22, add:
   ```ts
   if (photo_url !== undefined) updateData.photo_url = photo_url;
   ```

**Verification:** `npx tsc --noEmit` — zero errors.

**Git Commit:** `git commit -m "feat(api): accept photo_url in order-items PATCH endpoint"`

---

## Task 2: UI — Add/Change/Remove photo on OrderItemCard

**Objective:** Add photo management buttons to `OrderItemCard` header so managers can add, change, or remove item photos after creation.

**PRD Ref:** F1

**Actionable Instructions:**
1. Open `src/components/orders/OrderItemCard.tsx`.
2. Add imports: `compressAndUpload` from `@/lib/upload`, `createClient` from `@/lib/supabase/client`, `ImagePlus`, `Camera`, `Trash2` from `lucide-react`.
3. Add state: `photoUploading (boolean)`.
4. Add `handlePhotoUpload` function:
   - Accept file from `<input type="file">`.
   - If item already has `photo_url`, extract old storage path and delete it from `design-files` bucket.
   - Upload new file via `compressAndUpload(file, \`items/${orderId}/${Date.now()}_${safeName}\`, "design-files")`.
   - PATCH `/api/order-items/${item.id}` with `{ photo_url: newUrl }`.
   - Invalidate query keys `["order-items", orderId]`.
5. Add `handlePhotoRemove` function:
   - Delete file from storage bucket.
   - PATCH `/api/order-items/${item.id}` with `{ photo_url: null }`.
   - Invalidate query keys.
6. In the header section (after the existing thumbnail `<img>`), add:
   - If no `photo_url`: a small `<label>` with `ImagePlus` icon wrapping a hidden file input.
   - If `photo_url` exists: on hover over the thumbnail, show a small overlay with `Camera` (change) and `Trash2` (remove) icons.

**Verification:** `npx tsc --noEmit`. Open browser → order detail → verify Add/Change/Remove photo works on an item card.

**Git Commit:** `git commit -m "feat(ui): add/change/remove photo on OrderItemCard"`

---

## Task 3: API — Order PATCH endpoint for editable fields

**Objective:** Create or extend `PATCH /api/orders/[id]` to accept `description`, `materials_checklist`, `delivery_date`, `priority`, and `quoted_amount`.

**PRD Ref:** F2, F3

**Actionable Instructions:**
1. Check if `src/app/api/orders/[id]/route.ts` already has a PATCH handler. If yes, extend it. If no, create one.
2. The PATCH handler should:
   - Authenticate user, check role is `admin` or `manager`.
   - Fetch order, reject if `status` is `dispatched` or `completed` (except `delivery_date` and `priority` which are always editable).
   - Accept body fields: `description`, `materials_checklist`, `delivery_date`, `priority`, `quoted_amount`.
   - Build `updateData` object from provided fields only (skip undefined).
   - Execute `.update(updateData).eq("id", params.id).select().single()`.
   - Return updated order.

**Verification:** `npx tsc --noEmit`. Test with curl or browser: `PATCH /api/orders/{id}` with `{"quoted_amount": 15000}`.

**Git Commit:** `git commit -m "feat(api): PATCH endpoint for order detail fields"`

---

## Task 4: UI — Edit Order Details modal + Quoted Amount display

**Objective:** Add an "Edit Details" button and modal on the order detail page, plus display the quoted amount with balance calculation.

**PRD Ref:** F2, F3

**Actionable Instructions:**
1. Create new component `src/components/orders/EditOrderModal.tsx`:
   - Props: `open`, `onOpenChange`, `order` (current order data).
   - Form fields: `description` (textarea), `materials_checklist` (textarea), `delivery_date` (date input), `priority` (toggle), `quoted_amount` (number input with ₹ prefix).
   - Pre-fill all fields from `order` prop.
   - On submit: `PATCH /api/orders/${order.id}` with changed fields.
   - On success: invalidate query key `["order", order.id]`, close modal, show toast.
2. Open `src/components/orders/OrderDetailView.tsx`:
   - Import `EditOrderModal`.
   - Add state: `editOrderOpen (boolean)`.
   - In the "Order Information" card (`OrderDetails` component), add a row showing:
     - `Quoted Amount: ₹ {order.quoted_amount?.toLocaleString() || "Not set"}`.
     - `Materials Checklist: {order.materials_checklist || "None"}`.
   - Add an "Edit Details" button (pencil icon) next to the "Order Information" heading. Only show for admin/manager roles.
   - Render `<EditOrderModal>` at the bottom of the component.

**Verification:** `npx tsc --noEmit`. Open browser → order page → click Edit Details → change quoted amount → save → verify it persists on reload.

**Git Commit:** `git commit -m "feat(ui): edit order details modal with quoted amount display"`

---

## Task 5: API — Delete design file endpoint

**Objective:** Create `DELETE /api/orders/[id]/design-files/[fileId]` that removes the DB row and the file from Supabase Storage.

**PRD Ref:** F4

**Actionable Instructions:**
1. Create directory `src/app/api/orders/[id]/design-files/[fileId]/`.
2. Create `route.ts` in that directory with a `DELETE` handler:
   - Auth check (admin or manager only).
   - Fetch `design_files` row by `fileId`, verify it belongs to order `id`.
   - Extract storage path from `file_url` (parse the URL to get the path after `/design-files/`).
   - Delete from Supabase Storage: `supabase.storage.from("design-files").remove([storagePath])`.
   - Delete DB row: `supabase.from("design_files").delete().eq("id", fileId)`.
   - Return `{ success: true }`.

**Verification:** `npx tsc --noEmit`.

**Git Commit:** `git commit -m "feat(api): DELETE endpoint for design files with storage cleanup"`

---

## Task 6: UI — Delete button on design file thumbnails

**Objective:** Add a trash icon overlay on each design file thumbnail in the order detail page.

**PRD Ref:** F4

**Actionable Instructions:**
1. Open `src/components/orders/OrderDetailView.tsx`.
2. In the `FilesAndPhotos` component, inside the `order.design_files.map()` loop (around line 103–112):
   - Add a `Trash2` icon button in the hover overlay (next to the existing "View Full" link).
   - On click: `window.confirm("Delete this design file?")` → if yes, `fetch(\`/api/orders/${order.id}/design-files/${file.id}\`, { method: "DELETE" })`.
   - On success: invalidate `["order", order.id]` query and call `router.refresh()`.
3. Import `Trash2` from `lucide-react`, `useQueryClient` from `@tanstack/react-query`, `useRouter` from `next/navigation`.
4. Since `OrderDetailView` is already `"use client"`, add needed hooks at the top of the component.

**Verification:** `npx tsc --noEmit`. Open browser → order with design files → hover → click trash → confirm file disappears.

**Git Commit:** `git commit -m "feat(ui): delete button on design file thumbnails"`

---

## Task 7: Sprint A — Lint fix & Push

**Objective:** Fix any lint errors from Tasks 1–6 and push to GitHub.

**Actionable Instructions:**
1. Run `npx tsc --noEmit` — fix any type errors.
2. Run `npx eslint src/app/api/order-items/ src/app/api/orders/ src/components/orders/OrderDetailView.tsx src/components/orders/OrderItemCard.tsx src/components/orders/EditOrderModal.tsx` — suppress any `@typescript-eslint/no-explicit-any` or `@next/next/no-img-element` warnings with inline comments.
3. `git add -A && git push origin main`.

**Verification:** Clean `tsc` and `eslint` output.

**Git Commit:** `git commit -m "fix(lint): sprint A cleanup"`

---

# SPRINT B — FSM & Timeline

---

## Task 8: UI — Add stage labels to ItemStageTimeline

**Objective:** Show human-readable text labels below each stage dot in `ItemStageTimeline.tsx`.

**PRD Ref:** F5

**Actionable Instructions:**
1. Open `src/components/orders/ItemStageTimeline.tsx`.
2. The `label` variable already exists on line 16: `const label = STAGE_LABELS[stage.stage_key] || stage.stage_key;`.
3. Below the dot `<div>` (after line 50), add a label element:
   ```tsx
   <span className={cn(
     "text-[9px] sm:text-[10px] font-medium mt-1 text-center leading-tight block max-w-[60px] truncate",
     stage.status === 'complete' ? 'text-green-600' :
     stage.status === 'in_progress' ? 'text-blue-600 font-bold' :
     'text-gray-400'
   )}>
     {label.replace(/^[^\w]*/, '')} {/* Strip leading emoji */}
   </span>
   ```
4. Wrap the dot + label in a `flex flex-col items-center` container.
5. Import `cn` from `@/lib/utils`.

**Verification:** `npx tsc --noEmit`. Open browser → order detail with items → verify labels appear below stage dots.

**Git Commit:** `git commit -m "feat(ui): add text labels to ItemStageTimeline stages"`

---

## Task 9: FSM Engine — Add `demoteOrderItemStage` function

**Objective:** Add a server-side FSM function that reverts an item to its previous production stage.

**PRD Ref:** F6

**Actionable Instructions:**
1. Open `src/lib/fsm/engine.ts`.
2. Add a new exported function `demoteOrderItemStage(itemId: string)`:
   - Fetch item with `order_stages` (filtered by `order_item_id`).
   - Find the `in_progress` stage.
   - Guard: item must be `in_production`; current stage must NOT be the first stage in its track.
   - Determine previous stage key using `TRACK_A_STAGES` or `TRACK_B_STAGES` array index.
   - Mark current stage as `reverted` (update status + `completed_at = now()`).
   - Find the previous stage row (by `stage_key` match). Update it: `status = 'in_progress'`, `started_at = now()`, `completed_at = null`, `sanding_complete = false`.
   - Update `order_items.current_stage_key` to the previous stage key.
   - Call `recalculateOrderStatus(item.order_id)`.
3. Note: The `order_stages.status` CHECK constraint may need updating. The `status` column currently has no CHECK in the migration (003), so `'reverted'` should work without a migration. Verify this.

**Verification:** `npx tsc --noEmit`.

**Git Commit:** `git commit -m "feat(fsm): add demoteOrderItemStage function"`

---

## Task 10: API + UI — Demote stage endpoint and button

**Objective:** Wire up the demote function to an API route and add a "← Demote" button on `OrderItemCard`.

**PRD Ref:** F6

**Actionable Instructions:**
1. Create `src/app/api/order-items/[itemId]/demote/route.ts`:
   - Auth check.
   - Role check: must be `admin` or `manager`.
   - Call `demoteOrderItemStage(params.itemId)`.
   - Return `{ success: true }`.
2. Open `src/hooks/useOrderItems.ts`:
   - Add `useDemoteOrderItem(orderId)` hook — mirrors `useAdvanceOrderItem` but POSTs to `/api/order-items/${itemId}/demote`.
3. Open `src/components/orders/OrderItemCard.tsx`:
   - Import `useDemoteOrderItem`.
   - Add `const { mutate: demoteItem, isPending: demoting } = useDemoteOrderItem(orderId);`.
   - In the `in_production` footer actions section (around line 147), add a "← Demote" button:
     - Only show if `currentStage` is NOT the first stage of the item's track.
     - Determine first stage: `item.track === 'A' ? 'carpentry' : 'frame_making'`.
     - On click: `window.confirm("Demote to previous stage?")` → `demoteItem(item.id)`.
     - Styled as `variant="secondary"` with a left-arrow icon.

**Verification:** `npx tsc --noEmit`. Open browser → order with in-production item at stage 2+ → click Demote → verify stage goes backward.

**Git Commit:** `git commit -m "feat(fsm): demote stage API route and UI button"`

---

# SPRINT C — Worker Attendance Overhaul

---

## Task 11: DB Migration — `worker_advances` table

**Objective:** Create the `worker_advances` table for tracking salary advances.

**PRD Ref:** F7.2

**Actionable Instructions:**
1. Create `supabase/migrations/021_worker_advances.sql`:
   ```sql
   CREATE TABLE public.worker_advances (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
     date DATE NOT NULL,
     amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
     notes TEXT,
     recorded_by UUID REFERENCES public.users(id),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE public.worker_advances ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Admin and Manager full access on worker_advances"
     ON public.worker_advances FOR ALL
     TO authenticated
     USING (public.get_role() IN ('admin', 'manager'))
     WITH CHECK (public.get_role() IN ('admin', 'manager'));
   ```
2. Run `supabase migration up` to apply locally.
3. Run `supabase db push` to apply remotely.

**Verification:** Query `SELECT column_name FROM information_schema.columns WHERE table_name = 'worker_advances';` — confirm columns exist.

**Git Commit:** `git commit -m "feat(db): create worker_advances table with RLS"`

---

## Task 12: DB Migration — `attendance_archive` table + cron job

**Objective:** Create archive table and daily cron job to move records older than 30 days.

**PRD Ref:** F7.1

**Actionable Instructions:**
1. Create `supabase/migrations/022_attendance_archive.sql`:
   ```sql
   CREATE TABLE public.attendance_archive (
     LIKE public.attendance INCLUDING ALL,
     archived_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE public.attendance_archive ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Admin read access on attendance_archive"
     ON public.attendance_archive FOR SELECT
     TO authenticated
     USING (public.get_role() = 'admin');

   -- Daily cron: archive attendance older than 30 days
   SELECT cron.schedule(
     'archive-old-attendance',
     '0 2 * * *',
     $$
     INSERT INTO public.attendance_archive
       SELECT *, NOW() as archived_at FROM public.attendance
       WHERE date < CURRENT_DATE - INTERVAL '30 days';
     DELETE FROM public.attendance
       WHERE date < CURRENT_DATE - INTERVAL '30 days';
     $$
   );
   ```
2. Run `supabase migration up` and `supabase db push`.

**Verification:** Confirm table exists and cron job is scheduled.

**Git Commit:** `git commit -m "feat(db): attendance_archive table with daily cron archival"`

---

## Task 13: API — Worker advances endpoints

**Objective:** Create GET and POST endpoints for worker advances.

**PRD Ref:** F7.2

**Actionable Instructions:**
1. Create `src/app/api/workers/[id]/advances/route.ts`:
   - **GET**: Auth check. Accept optional `?month=YYYY-MM` query param. Query `worker_advances` filtered by `worker_id = params.id`. If month provided, filter by date range. Return array.
   - **POST**: Auth check + role check (admin/manager). Accept `{ date, amount, notes }`. Insert into `worker_advances` with `recorded_by = user.id`. Return created row.

**Verification:** `npx tsc --noEmit`.

**Git Commit:** `git commit -m "feat(api): worker advances GET and POST endpoints"`

---

## Task 14: API — Worker attendance summary endpoint

**Objective:** Create `GET /api/workers/[id]/attendance-summary` that returns monthly attendance + advances for a specific worker.

**PRD Ref:** F7.3

**Actionable Instructions:**
1. Create `src/app/api/workers/[id]/attendance-summary/route.ts`:
   - Accept `?month=YYYY-MM` (default: current month).
   - Compute `startDate` (1st of month) and `endDate` (last day of month).
   - Query `attendance` table for this worker in date range.
   - Query `worker_advances` table for this worker in date range.
   - Compute `totalShifts` (sum of `shifts_worked`) and `totalAdvances` (sum of `amount`).
   - Return: `{ attendance: [...], advances: [...], summary: { totalShifts, totalAdvances, month } }`.

**Verification:** `npx tsc --noEmit`.

**Git Commit:** `git commit -m "feat(api): worker attendance summary endpoint"`

---

## Task 15: Hook — `useWorkerAttendanceSummary`

**Objective:** Create a React Query hook to fetch the attendance summary for a worker.

**PRD Ref:** F7.3

**Actionable Instructions:**
1. Open `src/hooks/useWorkers.ts`.
2. Add new hook `useWorkerAttendanceSummary(workerId: string | null, month: string)`:
   - Query key: `["worker-attendance-summary", workerId, month]`.
   - Fetch: `GET /api/workers/${workerId}/attendance-summary?month=${month}`.
   - Enabled only when `workerId` is truthy.
3. Add new mutation hook `useAddWorkerAdvance(workerId: string)`:
   - POST to `/api/workers/${workerId}/advances`.
   - On success: invalidate `["worker-attendance-summary", workerId]`.

**Verification:** `npx tsc --noEmit`.

**Git Commit:** `git commit -m "feat(hooks): useWorkerAttendanceSummary and useAddWorkerAdvance"`

---

## Task 16: UI — WorkerAttendanceModal component

**Objective:** Build the full per-worker attendance drill-down modal with calendar grid, advances list, and "Add Advance" form.

**PRD Ref:** F7.3, F7.4

**Actionable Instructions:**
1. Create `src/components/workers/WorkerAttendanceModal.tsx`:
   - Props: `worker: Worker | null`, `onClose: () => void`.
   - State: `currentMonth` (string `YYYY-MM`, default current month).
   - Use `useWorkerAttendanceSummary(worker?.id, currentMonth)`.
   - **Header**: Worker name, department, phone. Month selector with ← → arrows.
   - **Summary badges**: "X shifts" pill, "₹ Y advances" pill.
   - **Calendar grid**: 7 columns (Mon–Sun). Each day cell shows:
     - Day number.
     - Status badge: coloured dot (green=present, gray=absent, yellow=half_day).
     - Shifts count.
     - If advance exists on that day: small `₹` badge in corner.
   - **Advances section**: Table listing Date | Amount | Notes. "Add Advance" button that toggles an inline form (date + amount + notes + submit).
   - Use the `useAddWorkerAdvance` hook for the form submission.
2. Style: Use existing design tokens (`bg-surface`, `border-border`, `text-text-primary`, etc.). Mobile-friendly with max-w-lg.

**Verification:** `npx tsc --noEmit`.

**Git Commit:** `git commit -m "feat(ui): WorkerAttendanceModal with calendar and advances"`

---

## Task 17: UI — Replace WorkerSummaryModal + Push

**Objective:** Replace the old `WorkerSummaryModal` in the workers page with the new `WorkerAttendanceModal`, fix all lint errors, and push everything to GitHub.

**PRD Ref:** F7.3

**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/workers/page.tsx`.
2. Delete the old `WorkerSummaryModal` function (lines 30–66).
3. Import `WorkerAttendanceModal` from `@/components/workers/WorkerAttendanceModal`.
4. Replace line 377: `<WorkerSummaryModal worker={summaryWorker} onClose={() => setSummaryWorker(null)} />` with:
   ```tsx
   <WorkerAttendanceModal worker={summaryWorker} onClose={() => setSummaryWorker(null)} />
   ```
5. Run full lint + type checks across all modified files. Fix any errors.
6. `git add -A`
7. `git push origin main`

**Verification:** `npx tsc --noEmit` and `npx eslint` clean. Open browser → Workers page → click worker name → verify new modal opens with calendar + advances.

**Git Commit:** `git commit -m "feat(ui): replace WorkerSummaryModal with WorkerAttendanceModal"`

---

# Summary Table

| # | Task | Sprint | PRD | Complexity | Importance (1-10) | Expert Risk (1-10) |
|---|------|--------|-----|------------|--------------------|--------------------|
| 1 | API: photo_url in item PATCH | A | F1 | Low | 7 | 2 |
| 2 | UI: Add/Change/Remove photo on OrderItemCard | A | F1 | Medium | 8 | 5 |
| 3 | API: Order PATCH for editable fields | A | F2,F3 | Low | 9 | 3 |
| 4 | UI: Edit Order modal + Quoted Amount | A | F2,F3 | Medium | 9 | 4 |
| 5 | API: Delete design file endpoint | A | F4 | Low | 6 | 3 |
| 6 | UI: Delete button on design files | A | F4 | Low | 6 | 3 |
| 7 | Sprint A lint fix & push | A | — | Low | 5 | 1 |
| 8 | UI: Stage labels on ItemStageTimeline | B | F5 | Low | 7 | 2 |
| 9 | FSM: `demoteOrderItemStage` engine function | B | F6 | High | 9 | 7 |
| 10 | API+UI: Demote endpoint and button | B | F6 | Medium | 9 | 5 |
| 11 | DB: `worker_advances` table | C | F7.2 | Low | 8 | 2 |
| 12 | DB: `attendance_archive` + cron | C | F7.1 | Medium | 7 | 5 |
| 13 | API: Worker advances endpoints | C | F7.2 | Low | 8 | 3 |
| 14 | API: Worker attendance summary | C | F7.3 | Low | 8 | 3 |
| 15 | Hook: useWorkerAttendanceSummary | C | F7.3 | Low | 7 | 2 |
| 16 | UI: WorkerAttendanceModal | C | F7.3,4 | High | 9 | 6 |
| 17 | UI: Replace old modal + push | C | F7.3 | Low | 8 | 2 |
