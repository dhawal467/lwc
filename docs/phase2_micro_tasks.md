# Phase 2 — Micro-Task Prompts
### FurnitureMFG · Sequential Execution Guide
### Generated: 23 Apr 2026

> Feed each task below as a standalone prompt. Each is designed for single-pass execution: code → verify → commit.

---

# ═══════════════════════════════════════════════════
# SPRINT 2A — Database Foundation
# ═══════════════════════════════════════════════════

---

## Task 1: Prerequisite — Add Missing Status Badges

**Objective:** Fix the Phase 1 gap where `dispatched` and `partial_dispatch` order statuses have no visual styling in the UI, and add corresponding TypeScript type updates.

**Actionable Instructions:**

1. **Open `src/lib/design-constants.ts`.**
   - In the `STATUS_CONFIG` object (around line 58), add two new entries **before the closing brace**:
     ```ts
     dispatched: { color: 'success', icon: '🚚', label: 'Dispatched' },
     partial_dispatch: { color: 'warning', icon: '📦', label: 'Partial Dispatch' },
     ```

2. **Open `src/components/shared/Badges.tsx`.**
   - In the `STATUS_STYLE` object (around line 8), add two new entries:
     ```ts
     dispatched:       { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200" },
     partial_dispatch: { bg: "bg-orange-50",  text: "text-orange-600", border: "border-orange-200" },
     ```

3. **No other files need changes.**

**Verification:**

- Run `npx tsc --noEmit` — confirm no new TypeScript errors.
- Inspect the `StatusBadge` component: verify it now returns a styled badge for `status="dispatched"` and `status="partial_dispatch"` instead of the grey fallback.

**Git Commit:**
```
git add src/lib/design-constants.ts src/components/shared/Badges.tsx
git commit -m "fix(ui): add dispatched + partial_dispatch to StatusBadge and design-constants [prerequisite]"
git push origin main
```

---

## Task 2: Database Migration — `order_items` Table

**Objective:** Create Migration 015 that establishes the `order_items` table, links it to `order_stages`, makes `orders.track` nullable, and adds an orders status CHECK constraint.

**Actionable Instructions:**

1. **Create file `supabase/migrations/015_order_items.sql`.**
2. Write the full SQL from TIP section 2A.1 (verbatim). Key elements:
   - `CREATE TABLE public.order_items` with columns: `id`, `order_id` (FK → orders), `name`, `description`, `track` (CHECK A/B), `unit_price`, `status` (CHECK including `cancelled`), `current_stage_key`, `deleted_at`, `created_at`.
   - Indexes on `order_id` and `status`.
   - `ALTER TABLE public.order_stages ADD COLUMN order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE;` with index.
   - `ALTER TABLE public.orders ALTER COLUMN track DROP NOT NULL;`
   - `ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('draft','confirmed','in_production','on_hold','partial_dispatch','dispatched','qc_passed','completed','cancelled'));`
   - Audit trigger: `CREATE TRIGGER audit_order_items AFTER INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();`
   - RLS: Enable RLS, add Admin full access + Manager full access policies.

**Verification:**

- Review the SQL file for syntax correctness.
- Run `npx tsc --noEmit` — no TypeScript changes expected; just confirm SQL file exists.
- **Note:** Do NOT run `supabase db push` yet — that happens in Task 4.

**Git Commit:**
```
(Do NOT commit yet — bundle with Task 3 in Task 4)
```

---

## Task 3: Database Migration — `payment_ledger` Table + Financials View

**Objective:** Create Migration 016 that establishes the `payment_ledger` table and the `order_financials` database view with `item_count`.

**Actionable Instructions:**

1. **Create file `supabase/migrations/016_payment_ledger.sql`.**
2. Write the full SQL from TIP section 2A.2 (verbatim). Key elements:
   - `CREATE TABLE public.payment_ledger` with columns: `id`, `order_id` (FK → orders), `amount` (CHECK > 0), `payment_type` (CHECK advance/partial/final), `payment_date`, `notes`, `recorded_by` (FK → users), `created_at`.
   - Index on `order_id`.
   - `CREATE OR REPLACE VIEW public.order_financials AS ...` — must include the `item_count` subquery: `(SELECT count(*) FROM public.order_items oi WHERE oi.order_id = o.id AND oi.deleted_at IS NULL) AS item_count`.
   - Audit trigger on `payment_ledger` (INSERT + DELETE).
   - RLS: Admin full access, Manager SELECT + INSERT only (no DELETE).

**Verification:**

- Review the SQL file for syntax correctness.
- Verify the `order_financials` view SELECT includes all required columns: `order_id`, `order_number`, `customer_id`, `customer_name`, `customer_phone`, `quoted_amount`, `total_paid`, `balance_due`, `item_count`, `status`, `delivery_date`, `deleted_at`, `created_at`.

**Git Commit:**
```
(Do NOT commit yet — bundle with Task 2 in Task 4)
```

---

## Task 4: TypeScript Types + Push Migrations

**Objective:** Update TypeScript type definitions with new interfaces for `OrderItem` and `PaymentLedgerEntry`, update existing `Order` and `OrderStage` interfaces, then push both migrations to Supabase.

**Actionable Instructions:**

1. **Open `types/index.ts`.**
2. Add the `OrderItem` interface (after `OrderStage`):
   ```ts
   export interface OrderItem {
     id: string;
     order_id: string;
     name: string;
     description: string | null;
     track: string;
     unit_price: number | null;
     status: string;
     current_stage_key: string | null;
     deleted_at: string | null;
     created_at: string;
   }
   ```
3. Add the `PaymentLedgerEntry` interface (after `OrderItem`):
   ```ts
   export interface PaymentLedgerEntry {
     id: string;
     order_id: string;
     amount: number;
     payment_type: 'advance' | 'partial' | 'final';
     payment_date: string;
     notes: string | null;
     recorded_by: string | null;
     created_at: string;
   }
   ```
4. In the existing `Order` interface, add two optional fields at the end:
   ```ts
   order_items?: OrderItem[];
   payment_ledger?: PaymentLedgerEntry[];
   ```
5. In the existing `OrderStage` interface, add:
   ```ts
   order_item_id: string | null;
   ```
6. **Push migrations:** Run `supabase db push` to apply migrations 015 and 016.
   - **Pre-flight:** First run `SELECT DISTINCT status FROM orders;` in Supabase SQL Editor to verify all existing values are compatible with the new CHECK constraint.

**Verification:**

- Run `npx tsc --noEmit` — confirm no new TypeScript errors related to the new types.
- In Supabase Studio: verify `order_items` and `payment_ledger` tables exist, `order_stages` has `order_item_id` column, `order_financials` view is queryable.

**Git Commit:**
```
git add types/index.ts supabase/migrations/015_order_items.sql supabase/migrations/016_payment_ledger.sql
git commit -m "feat(db): add order_items, payment_ledger tables, order_financials view, and TypeScript types [migration 015-016]"
git push origin main
```

---

## Task 5: FSM Engine — `confirmOrderItem()` + `recalculateOrderStatus()`

**Objective:** Add the `confirmOrderItem` and `recalculateOrderStatus` functions to the FSM engine. These are the foundational functions that all other item FSM operations depend on.

**Actionable Instructions:**

1. **Open `src/lib/fsm/engine.ts`.**
2. Keep all existing code (`advanceStage`, `sendBackToStage`) untouched.
3. Add `recalculateOrderStatus(orderId: string)`:
   - Fetch all non-deleted `order_items` for `orderId` using `createServiceRoleClient()`.
   - Apply the priority-ordered logic (from TIP 2A.4):
     - If ALL items are `completed` → set order status to `completed`
     - Else if ALL are `dispatched` or `completed` → `dispatched`
     - Else if ANY `dispatched` + ANY still active → `partial_dispatch`
     - Else if ANY `in_production` → `in_production`
     - Else if ANY `on_hold` + none `in_production` → `on_hold`
     - Else → `confirmed`
   - UPDATE `orders.status` with the computed value.
4. Add `confirmOrderItem(itemId: string)`:
   - Fetch the `order_items` row.
   - Resolve track stages using `TRACK_A_STAGES` or `TRACK_B_STAGES` from `tracks.ts`.
   - INSERT `order_stages` rows for each stage (with `order_item_id = itemId`, `order_id = item.order_id`).
   - Set first stage to `in_progress` with `started_at = now()`.
   - UPDATE `order_items` to `status = 'in_production'`, `current_stage_key = first_stage`.
   - Call `recalculateOrderStatus(item.order_id)`.

**Verification:**

- Run `npx tsc --noEmit` — confirm no TypeScript errors.
- Review the function logic against the spec to ensure correct stage creation order.

**Git Commit:**
```
(Do NOT commit yet — bundle with Tasks 6 and 7)
```

---

## Task 6: FSM Engine — `advanceOrderItemStage()`

**Objective:** Add the `advanceOrderItemStage` function to the FSM engine to advance a single item through its production stages.

**Actionable Instructions:**

1. **Open `src/lib/fsm/engine.ts`** (continuing from Task 5).
2. Add `advanceOrderItemStage(itemId: string)`:
   - Fetch `order_items` row + all `order_stages` WHERE `order_item_id = itemId`.
   - Find the `in_progress` stage, throw if not found.
   - **Sanding guard:** Check `STAGE_CONFIG[stageKey]?.requiresSanding` — if true and `sanding_complete` is false, throw error.
   - **QC guard:** If `stage_key === 'qc_check'`, query `qc_checks` for a `passed = true` row attached to this stage. Throw if missing.
   - Mark current stage as `complete` with `completed_at = now()`.
   - Find the next stage by `sequence_position`.
   - **If next stage exists:** Set it to `in_progress`, update `order_items.current_stage_key`. If `next.stage_key === 'dispatch'`, also set `order_items.status = 'dispatched'`.
   - **If no next stage:** Set `order_items.status = 'completed'`.
   - Call `recalculateOrderStatus(item.order_id)`.

**Verification:**

- Run `npx tsc --noEmit` — confirm no TypeScript errors.
- Review guard logic matches the existing `advanceStage()` pattern for Phase 1 orders.

**Git Commit:**
```
(Do NOT commit yet — bundle with Tasks 5 and 7)
```

---

## Task 7: FSM Engine — `cancelOrderItems()` Helper

**Objective:** Add the `cancelOrderItems` helper function for cascading cancellation to all active items when an order is cancelled.

**Actionable Instructions:**

1. **Open `src/lib/fsm/engine.ts`** (continuing from Tasks 5-6).
2. Add `cancelOrderItems(orderId: string)`:
   - Fetch all `order_items` WHERE `order_id = orderId` AND `status NOT IN ('completed', 'dispatched', 'cancelled')` AND `deleted_at IS NULL`.
   - For each item:
     - UPDATE `order_items.status = 'cancelled'`.
     - UPDATE all `order_stages` WHERE `order_item_id = item.id` AND `status IN ('pending', 'in_progress')` to `status = 'cancelled'`.
3. Export all four new functions.

**Verification:**

- Run `npx tsc --noEmit` — confirm no TypeScript errors.
- Count total exports from engine.ts: should be `advanceStage`, `sendBackToStage`, `confirmOrderItem`, `advanceOrderItemStage`, `recalculateOrderStatus`, `cancelOrderItems` (6 total).

**Git Commit:**
```
git add src/lib/fsm/engine.ts
git commit -m "feat(api): FSM engine — confirmOrderItem, advanceOrderItemStage, recalculateOrderStatus, cancelOrderItems"
git push origin main
```

---

## Task 8: API Route — Order Items CRUD (`GET` + `POST`)

**Objective:** Create the API route for listing and adding items to an order.

**Actionable Instructions:**

1. **Create file `src/app/api/orders/[id]/items/route.ts`.**
2. Implement `GET`:
   - Auth check (reject if no user).
   - Fetch `order_items` WHERE `order_id = params.id` AND `deleted_at IS NULL`, ordered by `created_at ASC`.
   - Return JSON array.
3. Implement `POST`:
   - Auth check.
   - Parse body: `{ name, track, description?, unit_price? }`.
   - Validate: `name` is non-empty, `track` is `'A'` or `'B'`.
   - Verify parent order exists and `deleted_at IS NULL`.
   - Insert into `order_items` with `order_id = params.id`, `status = 'confirmed'`.
   - Return the new row with `status: 201`.

**Verification:**

- Run `npx tsc --noEmit`.
- Start the dev server (`npm run dev`). Use browser DevTools or a REST client to:
  - `POST /api/orders/[existing-order-id]/items` with `{"name": "Test Table", "track": "A"}` — expect 201.
  - `GET /api/orders/[existing-order-id]/items` — expect an array containing the new item.
  - `POST /api/orders/[existing-order-id]/items` with `{"name": "", "track": "A"}` — expect 400 (empty name).

**Git Commit:**
```
(Do NOT commit yet — bundle toward end of Sprint 2A API tasks)
```

---

## Task 9: API Route — Order Item Edit + Soft-Delete (`PATCH` + `DELETE`)

**Objective:** Create the API route for editing and soft-deleting an individual order item.

**Actionable Instructions:**

1. **Create file `src/app/api/order-items/[itemId]/route.ts`.**
2. Implement `PATCH`:
   - Auth check.
   - Parse body: `{ name?, description?, unit_price? }`.
   - Update `order_items` WHERE `id = params.itemId` with provided fields.
   - Return updated row.
3. Implement `DELETE`:
   - Auth check.
   - Fetch the item. If `status !== 'confirmed'`, return `{ error: "Can only delete items in confirmed status" }` with status 400.
   - Soft-delete: UPDATE `order_items SET deleted_at = now()` WHERE `id = params.itemId`.
   - Return `{ success: true }`.

**Verification:**

- Run `npx tsc --noEmit`.
- Test `PATCH` with `{"name": "Updated Name"}` — expect 200 with the updated item.
- Test `DELETE` on an item in `confirmed` status — expect success.
- Test `DELETE` on an item NOT in `confirmed` status — expect 400.

**Git Commit:**
```
(Do NOT commit yet — bundle with other API tasks)
```

---

## Task 10: API Routes — Item FSM (Confirm + Advance + Hold + Sendback)

**Objective:** Create the four FSM control API routes for individual order items.

**Actionable Instructions:**

1. **Create `src/app/api/order-items/[itemId]/confirm/route.ts`.**
   - `POST`: Auth check. Call `confirmOrderItem(params.itemId)` from engine.ts. Return `{ success: true }` with 200. Catch errors and return `{ error: message }` with 400.

2. **Create `src/app/api/order-items/[itemId]/advance/route.ts`.**
   - `POST`: Auth check. Call `advanceOrderItemStage(params.itemId)` from engine.ts. Return `{ success: true }`. Catch errors with 400.

3. **Create `src/app/api/order-items/[itemId]/hold/route.ts`.**
   - `POST`: Auth check. Toggle item between `in_production` ↔ `on_hold`:
     - Fetch item. If `status === 'in_production'`, update to `on_hold`. If `on_hold`, update to `in_production`.
     - Call `recalculateOrderStatus(item.order_id)`.
     - Return `{ status: newStatus }`.

4. **Create `src/app/api/order-items/[itemId]/sendback/route.ts`.**
   - `POST { targetStageKey }`: Auth check.
   - Fetch item's `order_stages` WHERE `order_item_id = params.itemId`.
   - Find `in_progress` stage → mark as `failed`.
   - Find stage matching `targetStageKey` → reset to `in_progress`, set `sanding_complete = false`, clear `completed_at`.
   - Update `order_items.current_stage_key = targetStageKey`.
   - Call `recalculateOrderStatus(item.order_id)`.

**Verification:**

- Run `npx tsc --noEmit`.
- With an order item in `confirmed` status: `POST /api/order-items/[id]/confirm` — expect 200 and verify `order_stages` rows were created.
- With an item in `in_production`: `POST /api/order-items/[id]/advance` — expect stage to advance.

**Git Commit:**
```
(Do NOT commit yet — bundle with other API tasks)
```

---

## Task 11: API Route — Soft-Delete Cascade on Orders

**Objective:** Update the existing order soft-delete API to cascade `deleted_at` to all child `order_items`.

**Actionable Instructions:**

1. **Open the existing file that handles order soft-deletion.** This is likely in `src/app/api/orders/[id]/route.ts` OR handled via the hook `useDeleteOrder` which calls a Supabase update directly. Locate where `deleted_at` is set on the order.
2. After setting `deleted_at` on the order, add:
   ```ts
   // Cascade soft-delete to child items
   await supabase
     .from('order_items')
     .update({ deleted_at: new Date().toISOString() })
     .eq('order_id', orderId);
   ```
3. If order cancellation is handled in an API route, also call `cancelOrderItems(orderId)` from engine.ts when the order status is being set to `cancelled`.

**Verification:**

- Run `npx tsc --noEmit`.
- Soft-delete an order that has items → verify items also have `deleted_at` set.
- Verify items no longer appear in `GET /api/orders/[id]/items` after parent is soft-deleted.

**Git Commit:**
```
(Do NOT commit yet — bundle with other API tasks)
```

---

## Task 12: API Routes — Payment CRUD

**Objective:** Create the payment-related API routes: list/create payments per order and admin-only delete.

**Actionable Instructions:**

1. **Create `src/app/api/orders/[id]/payments/route.ts`.**
   - `GET`: Auth check. Fetch all `payment_ledger` rows WHERE `order_id = params.id`, ordered by `payment_date ASC`. Also fetch the order's `quoted_amount`. Return:
     ```json
     {
       "payments": [...],
       "summary": { "quoted_amount": N, "total_paid": N, "balance_due": N }
     }
     ```
   - `POST`: Auth check. Parse body: `{ amount, payment_type, payment_date?, notes? }`. Validate `amount > 0`, `payment_type` is one of `advance | partial | final`. Insert into `payment_ledger` with `recorded_by = user.id`. Return the new payment + updated summary.

2. **Create `src/app/api/payments/[paymentId]/route.ts`.**
   - `DELETE`: Auth check. Verify user is admin (query `users` table for role). If not admin, return 403. Hard delete the `payment_ledger` row. Return `{ success: true }`.

**Verification:**

- `POST /api/orders/[id]/payments` with `{"amount": 5000, "payment_type": "advance"}` — expect 201 with summary.
- `GET /api/orders/[id]/payments` — expect payments array + correct summary calculation.
- `DELETE /api/payments/[id]` as admin — expect 200. As manager — expect 403.

**Git Commit:**
```
(Do NOT commit yet — bundle with Task 13)
```

---

## Task 13: API Route — Finance Outstanding Report

**Objective:** Create the admin-only finance outstanding report endpoint.

**Actionable Instructions:**

1. **Create `src/app/api/finance/outstanding/route.ts`.**
   - `GET`: Auth check. Verify user is admin. If not, return 403.
   - Query the `order_financials` view.
   - Support query params: `?min_balance=1` (filter where `balance_due >= min_balance`), `?sort=balance_desc` (order by `balance_due DESC`).
   - Group results by `customer_id` for the response:
     ```json
     {
       "customers": [
         {
           "customer_id": "...",
           "customer_name": "...",
           "customer_phone": "...",
           "total_quoted": N,
           "total_paid": N,
           "total_balance": N,
           "orders": [...]
         }
       ],
       "grand_total_outstanding": N,
       "total_orders": N
     }
     ```

**Verification:**

- `GET /api/finance/outstanding` as admin — expect grouped customer data.
- `GET /api/finance/outstanding` as manager — expect 403.
- `GET /api/finance/outstanding?min_balance=1000` — expect only customers with balance ≥ 1000.

**Git Commit:**
```
git add src/app/api/orders/[id]/items/route.ts src/app/api/order-items/ src/app/api/orders/[id]/payments/route.ts src/app/api/payments/ src/app/api/finance/ src/lib/fsm/engine.ts
git commit -m "feat(api): order-items CRUD + item FSM routes + payment ledger + finance endpoint + soft-delete cascade"
git push origin main
```

**Memory Bank Update:** Update `memory-bank/activeContext.md` to reflect Sprint 2A completion: all DB tables, FSM engine functions, and API routes are in place.

---

# ═══════════════════════════════════════════════════
# SPRINT 2B — Order Detail UI
# ═══════════════════════════════════════════════════

---

## Task 14: React Query Hooks — `useOrderItems` + `usePayments`

**Objective:** Create the React Query hooks that will power all UI components for items and payments.

**Actionable Instructions:**

1. **Create `src/hooks/useOrderItems.ts`.**
   - `useOrderItems(orderId: string)` — `useQuery` with key `["order-items", orderId]`, fetches `GET /api/orders/${orderId}/items`.
   - `useAddOrderItem()` — `useMutation` posting to `/api/orders/${orderId}/items`. On success: invalidate `["order-items", orderId]` + `["order", orderId]`.
   - `useDeleteOrderItem()` — `useMutation` calling `DELETE /api/order-items/${itemId}`. Same invalidation.
   - `useConfirmOrderItem()` — `useMutation` posting to `/api/order-items/${itemId}/confirm`. Same invalidation.
   - `useAdvanceOrderItem()` — `useMutation` posting to `/api/order-items/${itemId}/advance`. Same invalidation.
   - `useHoldOrderItem()` — `useMutation` posting to `/api/order-items/${itemId}/hold`. Same invalidation.

2. **Create `src/hooks/usePayments.ts`.**
   - `usePayments(orderId: string)` — `useQuery` with key `["payments", orderId]`, fetches `GET /api/orders/${orderId}/payments`.
   - `useAddPayment()` — `useMutation` posting to `/api/orders/${orderId}/payments`. On success: invalidate `["payments", orderId]`.
   - `useDeletePayment()` — `useMutation` calling `DELETE /api/payments/${paymentId}`. Same invalidation.

**Verification:**

- Run `npx tsc --noEmit` — confirm all hooks compile without errors.
- Verify: each hook properly passes orderId/itemId to the correct endpoint path.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2B UI tasks)
```

---

## Task 15: UI Component — `ItemStageTimeline`

**Objective:** Build a compact horizontal timeline component that shows an item's production stages inline.

**Actionable Instructions:**

1. **Create `src/components/orders/ItemStageTimeline.tsx`.**
   - Accept props: `stages: OrderStage[]` (the item's stages sorted by `sequence_position`).
   - Render a horizontal row of dots connected by lines.
   - Each dot represents a stage:
     - `complete` → filled green dot with a ✓ checkmark.
     - `in_progress` → pulsing blue dot (use CSS animation).
     - `failed` → red dot.
     - `pending` → grey/muted dot.
     - `cancelled` → grey dot with ✕.
   - On hover/title: show stage label (from `STAGE_LABELS` in `design-constants.ts`) + timestamps.
   - Use `STAGE_COLORS` for dot coloring where appropriate.
   - Responsive: on very small screens, dots can shrink but must remain visible.

**Verification:**

- Run `npx tsc --noEmit`.
- Import and render with mock data to confirm visual correctness.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2B UI tasks)
```

---

## Task 16: UI Component — `AddItemModal`

**Objective:** Build the modal dialog for adding a new item to an order.

**Actionable Instructions:**

1. **Create `src/components/orders/AddItemModal.tsx`.**
   - Uses `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `src/components/ui/dialog.tsx`.
   - Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `orderId: string`, `initialName?: string`.
   - Form fields:
     - **Name** (text input, required, pre-filled with `initialName` if provided).
     - **Track** (A/B toggle buttons, required, default to 'A').
     - **Description** (textarea, optional).
     - **Unit Price ₹** (number input with ₹ prefix, optional).
   - On submit: call `useAddOrderItem()` from `useOrderItems.ts`. On success: close modal, reset form. On error: show inline error message.
   - Loading state: disable submit button, show spinner.

**Verification:**

- Run `npx tsc --noEmit`.
- Visually: modal opens, form fields render, submit creates an item and modal closes.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2B UI tasks)
```

---

## Task 17: UI Component — `OrderItemCard`

**Objective:** Build the self-contained card component that displays one order item with its timeline and context-aware FSM action buttons.

**Actionable Instructions:**

1. **Create `src/components/orders/OrderItemCard.tsx`.**
   - Props: `item: OrderItem & { order_stages: OrderStage[] }`, `orderId: string`.
   - **Header row:** Item name (bold), Track badge (from `StageBadge` or inline), `StatusBadge` for item status, kebab menu (⋮) with Edit/Delete actions.
   - **Body:** Render `<ItemStageTimeline stages={item.order_stages} />`.
   - **Footer:** Context-aware action buttons based on `item.status`:
     - `confirmed` → "🚀 Start Production" button → calls `useConfirmOrderItem`.
     - `in_production` → "Advance Stage →" button + "⏸ Hold" button. If current stage is `qc_check`, show "✅ Run QC Check" button linking to QC page. If stage `requiresSanding`, show sanding checkbox.
     - `on_hold` → "▶ Resume" button → calls `useHoldOrderItem`.
     - `dispatched` → Teal "🚚 Dispatched" chip (no buttons).
     - `completed` → Green "✓ Completed" chip (no buttons).
     - `cancelled` → Red "✕ Cancelled" chip (no buttons).
   - **Error handling:** Each mutation shows inline error below the button on failure. **No `alert()` calls.** Each button has its own loading spinner via `isPending`.

**Verification:**

- Run `npx tsc --noEmit`.
- Component renders correctly for each item status scenario.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2B UI tasks)
```

---

## Task 18: UI Components — `AddPaymentModal` + `PaymentLedgerPanel`

**Objective:** Build the payment recording modal and the payment ledger display panel.

**Actionable Instructions:**

1. **Create `src/components/orders/AddPaymentModal.tsx`.**
   - Props: `open`, `onOpenChange`, `orderId`, `currentBalance: number`, `quotedAmount: number | null`.
   - Form fields: Amount ₹ (required, number), Type (3-way toggle: Advance / Partial / Final), Date (date input, default today), Notes (textarea, optional).
   - Live preview: "After this payment, balance will be: ₹X" (computed from `currentBalance - amount`).
   - On submit: call `useAddPayment()`. On success: close modal. On error: inline error.

2. **Create `src/components/orders/PaymentLedgerPanel.tsx`.**
   - Props: `orderId: string`, `isAdmin: boolean`.
   - Uses `usePayments(orderId)` hook.
   - **Summary row:** `Quoted: ₹80,000 | Paid: ₹50,000 | Balance: ₹30,000`. Balance color: amber if > 0, green if = 0, muted if quoted not set.
   - **Payment list:** Each row shows date, type badge (Advance/Partial/Final), ₹ amount, notes. Admin sees a delete icon (with confirmation via `window.confirm`).
   - Empty state: "No payments recorded yet."
   - Footer: "+ Record Payment" button opens `AddPaymentModal`.
   - Pass balance and quoted amount to `AddPaymentModal` for the live preview.

**Verification:**

- Run `npx tsc --noEmit`.
- Panel renders with mock data showing summary, list, and empty states.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2B final commit)
```

---

## Task 19: Order Detail Page Refactor — Phase 1/2 Detection + Layout

**Objective:** Refactor the order detail page to detect Phase 1 vs Phase 2 orders and render the appropriate layout.

**Actionable Instructions:**

1. **Open `src/app/(dashboard)/dashboard/orders/[id]/page.tsx`.**
2. Update the Supabase `.select()` query to include `order_items` and `payment_ledger`:
   ```ts
   .select(`
     *,
     customers ( name, phone ),
     design_files ( * ),
     order_stages ( *, qc_checks ( * ) ),
     order_items (
       *,
       order_stages ( *, qc_checks ( * ) )
     ),
     payment_ledger ( * )
   `)
   ```
3. Add Phase detection: `const isPhase2Order = order.track === null;`
4. Extract current Phase 1 JSX (FsmControls + StageTimeline + existing layout) into a `Phase1OrderLayout` component (can be inline in the same file or a separate file).
5. Add the Phase 2 branch:
   ```tsx
   {isPhase2Order ? (
     <>
       {/* Order header — same as Phase 1 */}
       {/* Items section */}
       <div className="space-y-4 mt-6">
         <div className="flex items-center justify-between">
           <h3>Order Items</h3>
           <Button onClick={() => setAddItemOpen(true)}>+ Add Item</Button>
         </div>
         {order.order_items?.map(item => (
           <OrderItemCard key={item.id} item={item} orderId={order.id} />
         ))}
       </div>
       {/* Payment Ledger */}
       <PaymentLedgerPanel orderId={order.id} isAdmin={isAdmin} />
       {/* Files & Photos — same as Phase 1 */}
     </>
   ) : (
     <Phase1OrderLayout order={order} ... />
   )}
   ```
6. Add imports for: `OrderItemCard`, `PaymentLedgerPanel`, `AddItemModal`.
7. Add state for the AddItem modal: `const [addItemOpen, setAddItemOpen] = useState(false);`

**Verification:**

- Run `npx tsc --noEmit`.
- Navigate to a Phase 1 order (has `track` value) → confirm it still renders the legacy layout with FsmControls.
- Navigate to a Phase 2 order (has `track = null`) → confirm it renders the items section and payment panel.

**Git Commit:**
```
(Do NOT commit yet — bundle with Task 20)
```

---

## Task 20: New Order Form — Remove Track Toggle

**Objective:** Update the new order creation form to remove the Track A/B toggle and add hint text about item-based tracking.

**Actionable Instructions:**

1. **Open `src/app/(dashboard)/dashboard/orders/new/page.tsx`.**
2. In the `OrderPayload` type definition, remove the `track` field.
3. In the `form` state initialization, remove `track: "A"`.
4. In the form JSX, remove the entire Track A/B toggle section (the `<div>` containing the two track buttons).
5. In the submit handler, remove `track` from the payload.
6. Add hint text below the customer selector or above the form:
   ```tsx
   <p className="text-sm text-text-secondary bg-primary-soft/30 p-3 rounded-lg border border-primary/10">
     💡 You'll add individual items (Sofa, Table, etc.) with their own production tracks after creating this order.
   </p>
   ```
7. Ensure the API `POST /api/orders` still works without `track` (the column is now nullable).

**Verification:**

- Run `npx tsc --noEmit`.
- Navigate to `/dashboard/orders/new` — confirm the Track toggle is gone and hint text is visible.
- Create a new order — confirm it saves with `track = null`.
- Confirm the new order detail page detects it as Phase 2 and shows the items section.

**Git Commit:**
```
git add src/hooks/useOrderItems.ts src/hooks/usePayments.ts src/components/orders/ src/app/(dashboard)/dashboard/orders/
git commit -m "feat(ui): order items cards, payment ledger panel, phase 1/2 order detail detection, new order form refactor"
git push origin main
```

**Memory Bank Update:** Update `memory-bank/activeContext.md` to reflect Sprint 2B completion.

---

# ═══════════════════════════════════════════════════
# SPRINT 2C — Finance & List Polish
# ═══════════════════════════════════════════════════

---

## Task 21: Finance Hook + Sidebar Nav

**Objective:** Create the finance data hook and add the Finance navigation link to the admin sidebar.

**Actionable Instructions:**

1. **Create `src/hooks/useFinance.ts`.**
   - `useOutstandingReport()` — `useQuery` with key `["finance", "outstanding"]`, fetches `GET /api/finance/outstanding`.

2. **Open `src/components/layout/Sidebar.tsx`.**
   - Add `import { BadgeDollarSign } from "lucide-react";`
   - In the admin-only section (near Recycle Bin and System Logs links), add:
     ```tsx
     <Link href="/dashboard/finance" className={cn(navLinkClass, isActive("/dashboard/finance"))}>
       <BadgeDollarSign className="w-5 h-5" />
       Finance
     </Link>
     ```

**Verification:**

- Run `npx tsc --noEmit`.
- Log in as admin — verify "Finance" link appears in the sidebar.
- Log in as manager — verify "Finance" link does NOT appear.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2C tasks)
```

---

## Task 22: Finance Page

**Objective:** Build the admin-only Finance outstanding report page with summary bar and customer-grouped accordion table.

**Actionable Instructions:**

1. **Create `src/app/(dashboard)/dashboard/finance/page.tsx`.**
   - `"use client"` directive (needs data fetching via hook).
   - Auth guard: check user role. If not admin, redirect to `/dashboard`.
   - Use `useOutstandingReport()` hook.
   - **Summary bar** at the top: "Total Outstanding: ₹X across Y orders" with styled card.
   - **Customer accordion table:**
     - Each row: Customer name, number of orders, Total Quoted, Total Paid, Balance Due.
     - Balance Due styling: amber/red if > 0, green chip if settled (= 0).
     - Click/expand a customer row to reveal their individual orders with: order number, status badge, quoted, paid, balance, "View" link to order detail.
   - **CSV Export button** at the top: links to `/api/export?type=finance`.
   - Loading state: skeleton rows.
   - Empty state: "No outstanding balances."
   - Style: premium design consistent with existing dashboard pages. Use Cards, proper spacing, hover effects.

**Verification:**

- Run `npx tsc --noEmit`.
- Navigate to `/dashboard/finance` as admin — page renders with data.
- Navigate to `/dashboard/finance` as manager — redirects to `/dashboard`.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2C tasks)
```

---

## Task 23: Finance CSV Export

**Objective:** Add a finance export variant to the existing export API route.

**Actionable Instructions:**

1. **Open `src/app/api/export/route.ts`.**
2. Add support for query param `?type=finance`:
   - If `type === 'finance'`:
     - Admin-only check (return 403 for non-admin).
     - Query the `order_financials` view.
     - Generate CSV with columns: Customer Name, Customer Phone, Order Number, Status, Quoted Amount, Total Paid, Balance Due, Delivery Date.
     - Return with `Content-Disposition: attachment; filename="finance_report_YYYY-MM-DD.csv"`.
   - If no `type` (existing behavior): keep the existing orders export logic unchanged.

**Verification:**

- Access `/api/export?type=finance` as admin — downloads a CSV file.
- Access `/api/export?type=finance` as manager — returns 403.
- Open the CSV — verify columns and data are correct.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2C tasks)
```

---

## Task 24: Orders List Enhancements — Items Column + Outstanding Filter

**Objective:** Update the orders list page to show item counts for Phase 2 orders and add an outstanding balance filter.

**Actionable Instructions:**

1. **Open `src/app/api/orders/route.ts`** (GET handler).
   - Update the `.select()` to include `order_items`:
     ```ts
     .select(`
       *,
       customers ( id, name, phone ),
       order_items ( id, name, status, track )
     `)
     ```

2. **Open `src/app/(dashboard)/dashboard/orders/page.tsx`.**
   - **Rename "Track" column to "Items":**
     - In the desktop table header: change "Track" to "Items".
     - In the table body cell: show `order.order_items?.length ? \`${order.order_items.length} items\` : order.track ? \`Track ${order.track}\` : "—"`.
   - **Stage badge area (desktop, `hidden lg:table-cell`):**
     - For Phase 2 orders (`order.track === null`): show the first 2 item stage badges + `+N more` if more than 2.
     - For Phase 1 orders: keep the existing single `StageBadge`.
   - **Mobile cards:** Update similarly — show item count instead of track.

**Verification:**

- Run `npx tsc --noEmit`.
- Orders list: Phase 1 orders show "Track A" or "Track B". Phase 2 orders show "3 items" count.
- Stage column: Phase 2 orders show multiple item stage badges.

**Git Commit:**
```
(Do NOT commit yet — bundle with Sprint 2C tasks)
```

---

## Task 25: Kanban API Refactor — Multi-Item Support

**Objective:** Update the Kanban API to return both Phase 1 order cards and Phase 2 item-level cards in the same column structure.

**Actionable Instructions:**

1. **Open `src/app/api/kanban/route.ts`.**
2. Refactor the GET handler:
   - **Phase 1 query:** Fetch orders WHERE `track IS NOT NULL` AND `status IN ('in_production','on_hold','dispatched')` AND `deleted_at IS NULL`. Include `order_stages`, `customers`. Group by `current_stage_key` as before. Add a `type: 'order'` marker to each card.
   - **Phase 2 query:** Fetch `order_items` WHERE `status IN ('in_production','on_hold')` AND `deleted_at IS NULL`. Join parent order: `orders ( id, order_number, customer_id, customers ( name ), priority, delivery_date )`. Include `order_stages` for each item. Group by item's `current_stage_key`. Add `type: 'item'` marker + `item_name` field to each card.
   - **Merge:** Combine Phase 1 and Phase 2 groups into the same `groupedOrders` object.
3. Each card object in the response should now have:
   - `type: 'order' | 'item'`
   - `item_name?: string` (only for item cards)
   - `item_id?: string` (only for item cards)
   - All existing fields (order_number, customer name, priority, delivery_date, currentStage, etc.)

**Verification:**

- Run `npx tsc --noEmit`.
- `GET /api/kanban` returns Phase 1 orders with `type: 'order'` and Phase 2 items with `type: 'item'`.

**Git Commit:**
```
(Do NOT commit yet — bundle with Task 26)
```

---

## Task 26: Kanban UI — Item-Level Cards

**Objective:** Update the Kanban board and card components to display item-level cards for Phase 2 orders.

**Actionable Instructions:**

1. **Open `src/components/kanban/KanbanCard.tsx`.**
   - Detect card type from `order.type`:
     - If `type === 'item'`: show order number + "·" + item name (e.g., "ORD-045 · Dining Table"). Add a small "📦" icon indicator.
     - If `type === 'order'` (or undefined for backward compat): display as before.
   - For item cards: the quick-advance button should call `/api/order-items/${order.item_id}/advance` instead of `/api/orders/${order.id}/advance`.
   - Link destination: always `/dashboard/orders/${order.id}` (the parent order detail page).

2. **Open `src/app/(dashboard)/dashboard/kanban/page.tsx`.**
   - Add `partial_dispatch` to any status filter arrays so the board can show remaining active items from partially-dispatched orders.
   - Ensure the column rendering works with the merged data (Phase 1 + Phase 2 cards in same columns).

**Verification:**

- Run `npx tsc --noEmit`.
- Kanban board: Phase 1 orders appear as single cards (unchanged). Phase 2 items appear as individual cards with "ORD-XXX · Item Name" format.
- Quick-advance on an item card calls the item-scoped API endpoint.
- Clicking an item card navigates to the parent order detail page.

**Git Commit:**
```
git add src/hooks/useFinance.ts src/app/(dashboard)/dashboard/finance/ src/app/api/finance/ src/app/api/export/route.ts src/app/api/orders/route.ts src/app/api/kanban/route.ts src/app/(dashboard)/dashboard/orders/page.tsx src/components/kanban/ src/app/(dashboard)/dashboard/kanban/page.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(finance): outstanding balance report, kanban multi-item support, orders list items column, finance sidebar entry"
git push origin main
```

**Memory Bank Update:** Update `memory-bank/activeContext.md` to reflect Sprint 2C and full Phase 2 completion.

---

# ═══════════════════════════════════════════════════
# POST-SPRINT — Final Verification
# ═══════════════════════════════════════════════════

---

## Task 27: Full Phase 2 Verification Pass

**Objective:** Run end-to-end verification of all Phase 2 features and confirm all acceptance criteria pass.

**Actionable Instructions:**

1. **TypeScript check:** Run `npx tsc --noEmit`. Confirm zero new errors.
2. **ESLint check:** Run `npx eslint src/`. Confirm no new errors related to Phase 2 files.
3. **Dev server:** Run `npm run dev`. Verify no console errors on startup.
4. **Walk through each acceptance criteria:**

   **Sprint 2A ACs:**
   - AC-2A-0: Visit orders list → dispatched and partial_dispatch badges have correct styling.
   - AC-2A-1 through AC-2A-13: Test via API calls as documented in each task.

   **Sprint 2B ACs:**
   - AC-2B-1: New order form → no track toggle visible.
   - AC-2B-2: Open a Phase 1 order → FsmControls + StageTimeline render.
   - AC-2B-3: Open a Phase 2 order → OrderItemCards render.
   - AC-2B-4 through AC-2B-11: Test item FSM, payment recording, and inline errors.

   **Sprint 2C ACs:**
   - AC-2C-1 through AC-2C-10: Test finance page, kanban cards, orders list, CSV export.

5. **Screenshot/record key UI states** for documentation.

**Verification:**

- All 24 acceptance criteria pass (AC-2A-0 through AC-2C-10).
- No TypeScript or ESLint regressions.
- Phase 1 orders continue to work identically.

**Git Commit:**
```
(No code changes — this is a verification-only task. If any fixes are needed, create targeted fix commits.)
```

---

# Summary

| Task | Title | Sprint | Commit |
|---|---|---|---|
| 1 | Add Missing Status Badges | 2A | Individual commit |
| 2 | Migration: order_items | 2A | Bundled → Task 4 |
| 3 | Migration: payment_ledger | 2A | Bundled → Task 4 |
| 4 | TypeScript Types + Push Migrations | 2A | Individual commit |
| 5 | FSM: confirmOrderItem + recalculateOrderStatus | 2A | Bundled → Task 7 |
| 6 | FSM: advanceOrderItemStage | 2A | Bundled → Task 7 |
| 7 | FSM: cancelOrderItems | 2A | Individual commit |
| 8 | API: Order Items CRUD | 2A | Bundled → Task 13 |
| 9 | API: Item Edit + Delete | 2A | Bundled → Task 13 |
| 10 | API: Item FSM Routes | 2A | Bundled → Task 13 |
| 11 | API: Soft-Delete Cascade | 2A | Bundled → Task 13 |
| 12 | API: Payment CRUD | 2A | Bundled → Task 13 |
| 13 | API: Finance Outstanding | 2A | Individual commit |
| 14 | Hooks: useOrderItems + usePayments | 2B | Bundled → Task 20 |
| 15 | UI: ItemStageTimeline | 2B | Bundled → Task 20 |
| 16 | UI: AddItemModal | 2B | Bundled → Task 20 |
| 17 | UI: OrderItemCard | 2B | Bundled → Task 20 |
| 18 | UI: AddPaymentModal + PaymentLedgerPanel | 2B | Bundled → Task 20 |
| 19 | Order Detail Page Refactor | 2B | Bundled → Task 20 |
| 20 | New Order Form Refactor | 2B | Individual commit |
| 21 | Finance Hook + Sidebar Nav | 2C | Bundled → Task 26 |
| 22 | Finance Page | 2C | Bundled → Task 26 |
| 23 | Finance CSV Export | 2C | Bundled → Task 26 |
| 24 | Orders List Enhancements | 2C | Bundled → Task 26 |
| 25 | Kanban API Refactor | 2C | Bundled → Task 26 |
| 26 | Kanban UI: Item Cards | 2C | Individual commit |
| 27 | Full Verification Pass | — | Verification only |

**Total: 27 tasks → 6 git commits + 1 verification pass**
