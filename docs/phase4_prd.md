# Phase 4 PRD — Order Management & Attendance Improvements

**Version:** 1.0  
**Date:** May 2026  
**Status:** Draft — Pending Approval

---

## 1. Background & Motivation

Phase 3 delivered item-specific photos on the Kanban board. This phase addresses the **day-to-day operational gaps** reported by workshop managers:

- Once an order is created, key fields (quote, description, materials) cannot be edited.
- Item photos can only be set at creation time; mistakes cannot be corrected.
- Workers' advance salary records are tracked manually (on paper) and not linked to their attendance history.
- The Kanban board's FSM is one-way only — there is no way to correct a stage that was accidentally advanced.
- The attendance system only retains recent records, has no advance tracking, and has no per-worker drill-down view.

---

## 2. Feature Scope

| # | Feature Area | Priority |
|---|---|---|
| F1 | Add/Edit item photos after creation | High |
| F2 | Set / edit order quotation amount | High |
| F3 | Edit order details after creation | High |
| F4 | Delete uploaded design files / photos | Medium |
| F5 | Item stage labels on Orders page | Medium |
| F6 | FSM stage demotion (go backward) | High |
| F7 | Worker Attendance Overhaul | High |

---

## 3. Detailed Requirements

---

### F1 — Add/Edit Item Photos After Creation

**Problem:** Currently, `photo_url` on `order_items` can only be set during item creation. There is no way to upload or replace the photo later.

**Solution:** Add a photo management section to the `OrderItemCard` on the order detail page.

**Behaviour:**
- If the item has no `photo_url`: show an "Add Photo" button (uses same `compressAndUpload` flow as `AddItemModal`).
- If the item already has a `photo_url`: show the existing thumbnail with "Change Photo" and "Remove Photo" options.
- "Change Photo" deletes the old file from storage and uploads the new one.
- "Remove Photo" deletes the file from storage and sets `photo_url = NULL` in DB.

**API change needed:** A `PATCH /api/order-items/[itemId]` endpoint that accepts `photo_url`.

---

### F2 — Quotation Amount

**Problem:** The `orders` table already has a `quoted_amount NUMERIC` column but there is no UI to set or display it.

**Solution:** 
- Add a "Quoted Amount" field to the order detail view in a non-editable "Overview" section.
- Show it as `₹ 12,500` with an edit (pencil) icon inline.
- Clicking the pencil opens an inline editable input; saving sends a `PATCH /api/orders/[id]` request.
- Show the quoted amount alongside the payment ledger summary (balance remaining = quoted − total paid).

---

### F3 — Edit Order Details

**Problem:** After an order is created, `description`, `materials_checklist`, `delivery_date`, and `priority` can only be changed by a developer. 

**Solution:** Add an "Edit Order" modal on the order detail page.

**Editable fields:**
| Field | Input Type |
|---|---|
| `description` | Textarea |
| `materials_checklist` | Textarea |
| `delivery_date` | Date picker |
| `priority` | Toggle (boolean) |
| `quoted_amount` | Number input (same as F2) |

**Behaviour:**
- A single "Edit Details" button opens a modal pre-filled with current values.
- On submit: `PATCH /api/orders/[id]` with the changed fields.
- Role restriction: Admin and Manager only.
- Lock edits once `status = 'dispatched'` or `'completed'`.

---

### F4 — Delete Uploaded Photos / Design Files

**Problem:** There is currently no way to delete a photo uploaded to an order by mistake. Files accumulate in storage permanently.

**Solution:**

**For design files (`design_files` table):**
- Each file row in the "Design Specs" section of the order detail view gets a trash icon button.
- On click: confirmation prompt → delete from `design_files` table AND from Supabase Storage.
- New API: `DELETE /api/orders/[id]/design-files/[fileId]`

**For item photos (`order_items.photo_url`):**
- Handled by F1's "Remove Photo" feature.

**For QC check photos:**
- Out of scope (QC photos are audit evidence).

---

### F5 — Item Stage Labels on Orders Page

**Problem:** On the order detail page, the `ItemStageTimeline` component displays stages using only icons. Labels are missing, making it impossible for a manager to understand the pipeline at a glance.

**Solution:**
- Add a text label below each stage icon in `ItemStageTimeline.tsx`.
- Use the human-readable stage names from `STAGE_COLORS` in `design-constants.ts` (e.g., "Carpentry", "Polish", "QC Check").
- Active stage: label in the stage's accent colour.
- Completed stages: label in muted green. Future stages: label in muted gray.

---

### F6 — FSM Stage Demotion (Go Backward)

**Problem:** The FSM in `order_stages` is strictly forward. If a manager accidentally advances a stage, there is no way to revert.

**Solution:** Add a "← Demote Stage" action on the `OrderItemCard`.

**Behaviour:**
- Only visible to Admin and Manager roles.
- Only available if the item is `in_production` AND is not at the first stage of its track.
- On click: confirmation prompt → API call → mark the current `order_stages` row as `reverted`, create a new `order_stages` row for the previous stage with `status = 'in_progress'`, update `order_items.current_stage_key`.
- Audit log entry is written.

**New API endpoint:** `POST /api/order-items/[itemId]/demote`

**FSM demotion chains:**
```
Track A:  carpentry ← polish ← qc_check ← dispatch
Track B:  frame_making ← polish ← upholstery ← qc_check ← dispatch
```

**DB change:** Add `'reverted'` to the `status` CHECK constraint on `order_stages`.

---

## 4. Database Changes Summary

| Migration File | Change |
|---|---|
| `021_worker_advances.sql` | New `worker_advances` table + RLS |
| `022_attendance_archive.sql` | New `attendance_archive` table + `pg_cron` daily archival job |
| `023_order_stages_reverted.sql` | Add `'reverted'` to `order_stages.status` CHECK constraint |

---

## 5. API Changes Summary

| Method | Endpoint | Feature |
|---|---|---|
| `PATCH` | `/api/order-items/[itemId]` | F1 — Update item photo |
| `PATCH` | `/api/orders/[id]` | F2, F3 — Edit order fields |
| `DELETE` | `/api/orders/[id]/design-files/[fileId]` | F4 — Delete design file |
| `POST` | `/api/order-items/[itemId]/demote` | F6 — Demote FSM stage |
| `GET` | `/api/workers/[id]/advances` | F7.2 — List advances |
| `POST` | `/api/workers/[id]/advances` | F7.2 — Record advance |
| `GET` | `/api/workers/[id]/attendance-summary` | F7.3 — Monthly attendance + advances |

---

## 6. UI Components Summary

| Component | Change |
|---|---|
| `OrderItemCard.tsx` | F1: photo edit/remove; F6: demote button |
| `OrderDetailView.tsx` | F2: quoted amount display; F3: Edit Details modal; F4: delete design files |
| `ItemStageTimeline.tsx` | F5: add text labels under each stage icon |
| `WorkerAttendanceModal.tsx` | **NEW** — F7.3 per-worker drill-down with calendar + advances |
| `AttendancePage` | F7.3: make worker names/rows clickable |

---

## 7. Out of Scope

- Deleting QC check photos (audit evidence, must be preserved).
- Payroll calculation from advances/shifts.
- Editing archived attendance records (older than 30 days).
- Push/email notifications.

---

## 8. Open Questions for Your Review

> [!IMPORTANT]
> **F6 — What happens to QC check data on demotion?**  
> If a `qc_check` stage row is demoted (marked `reverted`), its associated `qc_checks` rows become orphaned. Should we **soft-delete them** on demotion, or **preserve them** as historical evidence?

> [!IMPORTANT]
> **F7 — Who can view archived attendance (records > 30 days)?**  
> Recommend: Archive read-only for Admin only. Manager sees only live 30-day window. Confirm?

> [!NOTE]
> **F3 — Edit lock on dispatched/completed orders?**  
> Recommend locking `description`, `materials_checklist` edits once `status = 'dispatched'` or `'completed'`. `delivery_date` and `priority` may still need to be editable even then (e.g., for rescheduled deliveries). Confirm the lock rules.
