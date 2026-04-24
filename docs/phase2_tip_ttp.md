# Phase 2 — Technical Implementation Plan (TIP) & Technical Task Plan (TTP)
### FurnitureMFG · "The Money & Items Sprint"
### Version: 1.1 (Post-Review Revision)

---

## Decisions Locked (from PRD Review)

| Q# | Decision |
|---|---|
| Q1 — Per-item pricing | **YES** — each `order_item` has its own `unit_price` field for future price estimator |
| Q2 — Payment recording | **Admin + Manager** both can record payments |
| Q3 — Item name entry | **Free text** — no presets |
| Q4 — Partial Dispatch | **Show `partial_dispatch`** as a distinct order-level status |

---

## Sprint Map

| Sprint | Name | Focus | Commit Prefix |
|---|---|---|---|
| 2A | DB Foundation | Migrations + API routes + FSM engine + prerequisite fixes | `feat(db)` / `feat(api)` |
| 2B | Order Detail UI | Item cards + payment panel + order form refactor | `feat(ui)` |
| 2C | Finance & Polish | Finance page + orders list enhancements + Kanban multi-item + nav | `feat(finance)` |

Each sprint ends with: `supabase db push` → `git add .` → `git commit` → `git push origin main`

---

---

# SPRINT 2A — Database Foundation

## TIP-2A

### 2A.0 — Prerequisite: Fix Missing `dispatched` Status in UI

> [!IMPORTANT]
> The Phase 1 FSM engine already sets `orders.status = 'dispatched'` (engine.ts line 73), and the Kanban API filters for it. However, `STATUS_CONFIG` in `design-constants.ts` and `STATUS_STYLE` in `Badges.tsx` have **no entry** for `dispatched`. Dispatched orders currently render with fallback grey styling. This must be fixed before Phase 2 work begins.

**File:** `src/lib/design-constants.ts`

Add to `STATUS_CONFIG`:
```ts
dispatched: { color: 'success', icon: '🚚', label: 'Dispatched' },
```

**File:** `src/components/shared/Badges.tsx`

Add to `STATUS_STYLE`:
```ts
dispatched: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
```

Also add `partial_dispatch` while we're here (needed for Sprint 2C):
```ts
// design-constants.ts
partial_dispatch: { color: 'warning', icon: '📦', label: 'Partial Dispatch' },

// Badges.tsx
partial_dispatch: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
```

---

### 2A.1 — Migration: `order_items` table

**File:** `supabase/migrations/015_order_items.sql`

Creates the `order_items` table, adds `order_item_id` to `order_stages`, updates `orders.track` to be nullable, adds `partial_dispatch` to the order status constraint, and attaches audit triggers.

> [!NOTE]
> The Phase 1 schema (`003_orders_and_fsm.sql`) has **no CHECK constraint** on `orders.status` — values are enforced in application code only. This migration adds a CHECK constraint for the first time. Before running, verify existing data: `SELECT DISTINCT status FROM orders;`

```sql
-- ============================================================
-- Migration 015: Order Items (Phase 2 Line Item Architecture)
-- 
-- Changes:
--   1. Create order_items table (per-item track, status, price)
--   2. Add order_item_id FK to order_stages
--   3. Make orders.track nullable (new orders have no track — items do)
--   4. Add status CHECK constraint on orders (first time — includes partial_dispatch)
--   5. Add audit trigger on order_items
-- ============================================================

-- PRE-FLIGHT CHECK (run manually before applying migration):
-- SELECT DISTINCT status FROM orders;
-- Verify all values are in the list below. If not, update the CHECK or fix bad data first.

-- 1. Create order_items
CREATE TABLE public.order_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  track             text        NOT NULL CHECK (track IN ('A', 'B')),
  unit_price        decimal(12, 2),          -- nullable; used by future price estimator
  status            text        NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'in_production', 'on_hold', 'dispatched', 'completed', 'cancelled')),
  current_stage_key text,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id  ON public.order_items(order_id);
CREATE INDEX idx_order_items_status    ON public.order_items(status);

-- 2. Add order_item_id to order_stages (nullable — Phase 1 rows stay NULL)
ALTER TABLE public.order_stages
  ADD COLUMN order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE;

CREATE INDEX idx_order_stages_item_id ON public.order_stages(order_item_id);

-- 3. Make orders.track nullable (Phase 1 keeps existing values; Phase 2+ rows = NULL)
ALTER TABLE public.orders
  ALTER COLUMN track DROP NOT NULL;

-- 4. Add status CHECK constraint on orders (no prior constraint exists)
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'draft', 'confirmed', 'in_production', 'on_hold',
    'partial_dispatch', 'dispatched', 'qc_passed', 'completed', 'cancelled'
  ));

-- 5. Audit trigger on order_items (reuses existing process_audit_log function)
CREATE TRIGGER audit_order_items
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 6. RLS on order_items (mirrors orders policies)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING  (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

CREATE POLICY "Manager full access on order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING  (public.get_role() = 'manager')
  WITH CHECK (public.get_role() = 'manager');
```

---

### 2A.2 — Migration: `payment_ledger` table + Finance view

**File:** `supabase/migrations/016_payment_ledger.sql`

```sql
-- ============================================================
-- Migration 016: Payment Ledger + Order Financials View
--
-- Changes:
--   1. Create payment_ledger table
--   2. Create order_financials view (balance calculation + item_count)
--   3. Audit trigger on payment_ledger
--   4. RLS on payment_ledger (admin + manager can write; admin can delete)
-- ============================================================

-- 1. Payment Ledger
CREATE TABLE public.payment_ledger (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount        decimal(12, 2) NOT NULL CHECK (amount > 0),
  payment_type  text        NOT NULL CHECK (payment_type IN ('advance', 'partial', 'final')),
  payment_date  date        NOT NULL DEFAULT CURRENT_DATE,
  notes         text,
  recorded_by   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_ledger_order_id ON public.payment_ledger(order_id);

-- 2. Financials View (includes item_count for orders list)
CREATE OR REPLACE VIEW public.order_financials AS
SELECT
  o.id                                                            AS order_id,
  o.order_number,
  o.customer_id,
  c.name                                                          AS customer_name,
  c.phone                                                         AS customer_phone,
  o.quoted_amount,
  COALESCE(SUM(p.amount), 0)                                      AS total_paid,
  COALESCE(o.quoted_amount, 0) - COALESCE(SUM(p.amount), 0)      AS balance_due,
  (SELECT count(*) FROM public.order_items oi
   WHERE oi.order_id = o.id AND oi.deleted_at IS NULL)            AS item_count,
  o.status,
  o.delivery_date,
  o.deleted_at,
  o.created_at
FROM public.orders o
LEFT JOIN public.customers c   ON c.id = o.customer_id
LEFT JOIN public.payment_ledger p ON p.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY
  o.id, o.order_number, o.customer_id,
  c.name, c.phone,
  o.quoted_amount, o.status, o.delivery_date, o.deleted_at, o.created_at;

-- 3. Audit trigger on payment_ledger
CREATE TRIGGER audit_payment_ledger
  AFTER INSERT OR DELETE ON public.payment_ledger
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 4. RLS on payment_ledger
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access on payment_ledger"
  ON public.payment_ledger FOR ALL
  TO authenticated
  USING  (public.get_role() = 'admin')
  WITH CHECK (public.get_role() = 'admin');

-- Manager: insert + select (cannot delete payments; only admin can)
CREATE POLICY "Manager can view payments"
  ON public.payment_ledger FOR SELECT
  TO authenticated
  USING (public.get_role() = 'manager');

CREATE POLICY "Manager can record payments"
  ON public.payment_ledger FOR INSERT
  TO authenticated
  WITH CHECK (public.get_role() = 'manager');
```

---

### 2A.3 — TypeScript Type Definitions Update

> [!IMPORTANT]
> This was missing from the original plan. Keeping types in sync prevents bugs like the `requiresSanding` ReferenceError we fixed in Phase 1.

**File:** `types/index.ts`

Add the following interfaces:

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

Update existing interfaces:

```ts
// In Order interface, add optional joins:
export interface Order {
  // ... existing fields ...
  order_items?: OrderItem[];
  payment_ledger?: PaymentLedgerEntry[];
}

// In OrderStage interface, add:
export interface OrderStage {
  // ... existing fields ...
  order_item_id: string | null;
}
```

---

### 2A.4 — FSM Engine Refactor

**File:** `src/lib/fsm/engine.ts`

Existing functions (`advanceStage`, `sendBackToStage`) are kept for Phase 1 backward compatibility. Three new functions are added:

#### `confirmOrderItem(itemId: string)`
1. Fetch `order_items` row by `itemId` → get `track`
2. Resolve `TRACK_A_STAGES` or `TRACK_B_STAGES`
3. `INSERT` rows into `order_stages` with `order_item_id = itemId` and `order_id = item.order_id`
4. Set first stage `status = 'in_progress'`
5. `UPDATE order_items SET status = 'in_production', current_stage_key = stages[0]`
6. Call `recalculateOrderStatus(item.order_id)`

#### `advanceOrderItemStage(itemId: string)`
1. Fetch `order_item` + its `order_stages` filtered by `order_item_id`
2. Find `in_progress` stage
3. Run guards: sanding, QC (unchanged logic)
4. Mark current stage `complete`
5. Find next stage by `sequence_position`
6. **If next stage:** set `in_progress`, update `order_items.current_stage_key`
   - If `next.stage_key === 'dispatch'` → set `order_items.status = 'dispatched'`
7. **If no next stage:** set `order_items.status = 'completed'`
8. Call `recalculateOrderStatus(item.order_id)`

#### `recalculateOrderStatus(orderId: string)`

> [!WARNING]
> Revised from original plan. The original logic incorrectly collapsed `dispatched` and `completed` into the same outcome. The corrected logic keeps them as distinct lifecycle stages.

```
Fetch all non-deleted order_items for orderId.

If ALL are 'completed'                              → orders.status = 'completed'
Else if ALL are 'dispatched' or 'completed'          → orders.status = 'dispatched'
Else if ANY 'dispatched' + ANY still active          → orders.status = 'partial_dispatch'
Else if ANY 'in_production'                          → orders.status = 'in_production'
Else if ANY 'on_hold' + none 'in_production'         → orders.status = 'on_hold'
Else                                                 → orders.status = 'confirmed'

UPDATE orders SET status = computed_status WHERE id = orderId
```

#### `cancelOrderItems(orderId: string)` *(new helper for order cancellation)*

When a Phase 2 order is cancelled, all non-terminal items must also be cancelled:

```
Fetch all order_items WHERE order_id = orderId AND status NOT IN ('completed', 'dispatched', 'cancelled')
UPDATE each to status = 'cancelled'
UPDATE their active order_stages to status = 'cancelled'
```

---

### 2A.5 — New API Routes

#### Item CRUD — `src/app/api/orders/[id]/items/route.ts`

| Method | Auth | Body | Action |
|---|---|---|---|
| GET | authenticated | — | Fetch all non-deleted items for order |
| POST | admin\|manager | `{name, track, description?, unit_price?}` | Insert item, return 201 |

**Validation (POST):** `name` non-empty, `track` ∈ `['A','B']`, order exists & not deleted.

#### Item FSM — `src/app/api/order-items/[itemId]/confirm/route.ts`

`POST` — calls `confirmOrderItem(itemId)`. Requires admin|manager.

**Returns:** `{ item, current_stage }` with 200.

#### Item FSM — `src/app/api/order-items/[itemId]/advance/route.ts`

`POST` — calls `advanceOrderItemStage(itemId)`. Requires admin|manager.

#### Item FSM — `src/app/api/order-items/[itemId]/hold/route.ts`

`POST` — toggles item between `in_production` ↔ `on_hold`. Calls `recalculateOrderStatus`.

#### Item FSM — `src/app/api/order-items/[itemId]/sendback/route.ts`

`POST {targetStageKey}` — mirrors existing order sendback but scoped to item stages.

#### Item Edit/Delete — `src/app/api/order-items/[itemId]/route.ts`

| Method | Auth | Action |
|---|---|---|
| PATCH | admin\|manager | Update `name`, `description`, `unit_price` |
| DELETE | admin\|manager | Soft-delete: only if `status = 'confirmed'` |

#### Soft-Delete Cascade — Update `src/app/api/orders/[id]/route.ts` (existing DELETE handler)

> [!IMPORTANT]
> When an order is soft-deleted (`deleted_at` set), the API must also set `deleted_at` on all child `order_items`. This is handled in application code (not a DB trigger) per ADR-3.

#### Payment CRUD — `src/app/api/orders/[id]/payments/route.ts`

| Method | Auth | Body | Action |
|---|---|---|---|
| GET | authenticated | — | List payments + running total summary |
| POST | admin\|manager | `{amount, payment_type, payment_date?, notes?}` | Insert payment, return summary |

**GET response shape:**
```json
{
  "payments": [...],
  "summary": { "quoted_amount": 80000, "total_paid": 25000, "balance_due": 55000 }
}
```

#### Delete Payment — `src/app/api/payments/[paymentId]/route.ts`

`DELETE` — admin only. Hard delete (payment_ledger is append-only for managers).

#### Finance Report — `src/app/api/finance/outstanding/route.ts`

`GET` — admin only. Queries `order_financials` view, groups by `customer_id`, returns sorted list. Query params: `?min_balance=1&sort=balance_desc`.

---

## TTP-2A — Task Checklist

```
Sprint 2A — DB Foundation
│
├── [ ] PREREQUISITE: Fix dispatched + partial_dispatch in design-constants.ts and Badges.tsx
│
├── [ ] Update types/index.ts
│     ├── [ ] Add OrderItem interface
│     ├── [ ] Add PaymentLedgerEntry interface
│     ├── [ ] Update Order interface (optional order_items, payment_ledger)
│     └── [ ] Update OrderStage interface (add order_item_id)
│
├── [ ] Write supabase/migrations/015_order_items.sql
├── [ ] Write supabase/migrations/016_payment_ledger.sql
├── [ ] Pre-flight: run SELECT DISTINCT status FROM orders to verify data compatibility
├── [ ] Run: supabase db push
├── [ ] git add . && git commit -m "feat(db): add order_items, payment_ledger tables and order_financials view [migration 015-016]"
├── [ ] git push origin main
│
├── [ ] Update src/lib/fsm/engine.ts
│     ├── [ ] Add confirmOrderItem()
│     ├── [ ] Add advanceOrderItemStage()
│     ├── [ ] Add recalculateOrderStatus() (REVISED logic)
│     └── [ ] Add cancelOrderItems() helper
│
├── [ ] Create src/app/api/orders/[id]/items/route.ts         (GET, POST)
├── [ ] Create src/app/api/order-items/[itemId]/route.ts      (PATCH, DELETE)
├── [ ] Create src/app/api/order-items/[itemId]/confirm/route.ts
├── [ ] Create src/app/api/order-items/[itemId]/advance/route.ts
├── [ ] Create src/app/api/order-items/[itemId]/hold/route.ts
├── [ ] Create src/app/api/order-items/[itemId]/sendback/route.ts
├── [ ] Update src/app/api/orders/[id]/route.ts               (soft-delete cascade to items)
├── [ ] Create src/app/api/orders/[id]/payments/route.ts      (GET, POST)
├── [ ] Create src/app/api/payments/[paymentId]/route.ts      (DELETE)
├── [ ] Create src/app/api/finance/outstanding/route.ts       (GET, admin-only)
│
├── [ ] git add . && git commit -m "feat(api): order-items CRUD + item FSM routes + payment ledger + finance endpoint"
└── [ ] git push origin main
```

**Sprint 2A Acceptance Criteria:**

| AC | Test |
|---|---|
| AC-2A-0 | `dispatched` and `partial_dispatch` render with correct badge styling on orders list |
| AC-2A-1 | `POST /api/orders/[id]/items` returns 201 with new item; `GET` returns the item |
| AC-2A-2 | `POST /api/order-items/[id]/confirm` creates `order_stages` rows scoped to item |
| AC-2A-3 | `POST /api/order-items/[id]/advance` advances only that item's stage |
| AC-2A-4 | Advancing ALL items to completed sets `orders.status = 'completed'` |
| AC-2A-5 | Advancing one item to dispatch with others still active → `orders.status = 'partial_dispatch'` |
| AC-2A-6 | Advancing ALL items to dispatched (none completed yet) → `orders.status = 'dispatched'` |
| AC-2A-7 | `POST /api/orders/[id]/payments` returns summary with correct balance |
| AC-2A-8 | `GET /api/finance/outstanding` returns 403 for manager role |
| AC-2A-9 | All item mutations appear in `audit_logs` |
| AC-2A-10 | `DELETE /api/order-items/[id]` returns 400 if item is not in `confirmed` status |
| AC-2A-11 | Soft-deleting an order also sets `deleted_at` on all its child `order_items` |
| AC-2A-12 | Cancelling an order also sets all non-terminal items to `cancelled` status |
| AC-2A-13 | TypeScript types compile: `npx tsc --noEmit` shows no new errors related to OrderItem or PaymentLedgerEntry |

---
---

# SPRINT 2B — Order Detail UI

## TIP-2B

### 2B.1 — New React Query Hooks

**File:** `src/hooks/useOrderItems.ts`

```ts
export function useOrderItems(orderId: string)        // GET /api/orders/[id]/items
export function useAddOrderItem()                     // POST /api/orders/[id]/items
export function useDeleteOrderItem()                  // DELETE /api/order-items/[id]
export function useConfirmOrderItem()                 // POST /api/order-items/[id]/confirm
export function useAdvanceOrderItem()                 // POST /api/order-items/[id]/advance
export function useHoldOrderItem()                    // POST /api/order-items/[id]/hold
```
Query key: `["order-items", orderId]`
On mutation success: invalidate `["order-items", orderId]` + `["order", orderId]`

**File:** `src/hooks/usePayments.ts`

```ts
export function usePayments(orderId: string)          // GET /api/orders/[id]/payments
export function useAddPayment()                       // POST /api/orders/[id]/payments
export function useDeletePayment()                    // DELETE /api/payments/[id] (admin only)
```
Query key: `["payments", orderId]`

---

### 2B.2 — New UI Components

#### `src/components/orders/AddItemModal.tsx`
- Uses `Dialog` from `src/components/ui/dialog.tsx` (built in Phase 1)
- Fields: **Name** (text, required), **Track** (A/B toggle, required), **Description** (textarea, optional), **Unit Price ₹** (number, optional)
- On save: calls `useAddOrderItem`, invalidates query, closes modal
- Pre-fill name from parent if passed via `initialName` prop

#### `src/components/orders/ItemStageTimeline.tsx`
- **Horizontal** compact timeline for use inside `OrderItemCard`
- Takes `stages: OrderStage[]` — same type as `StageTimeline` but renders horizontally
- Dots connected by horizontal line; tooltip on hover shows stage name + timestamps
- Active dot pulses; completed dot has checkmark; failed dot is red

#### `src/components/orders/OrderItemCard.tsx`
- Self-contained card for one `order_item`
- **Header row:** item name, Track badge, status badge, kebab menu (Edit / Delete — admin/manager only)
- **Body:** `ItemStageTimeline` showing item's own stages
- **Footer:** context-aware action buttons:
  - `status = 'confirmed'` → **"🚀 Start Production"** button
  - `status = 'in_production'` → **"Advance Stage →"** + **"⏸ Hold"** buttons; QC redirect if stage = `qc_check`; sanding checkbox if stage requires it
  - `status = 'on_hold'` → **"▶ Resume"** button
  - `status = 'dispatched'` → teal "🚚 Dispatched" chip (no actions)
  - `status = 'completed'` → green "✓ Completed" chip (no actions)
  - `status = 'cancelled'` → red "✕ Cancelled" chip (no actions)
- Each FSM button fires the respective item-scoped API route (not order-scoped)
- **Error handling:** Inline error messages below buttons. **No `alert()` calls.** Loading spinners per button.

> [!NOTE]
> Phase 1 order detail pages still use `alert()` for errors. This is a deliberate UX improvement for Phase 2; Phase 1 pages will be migrated in a future cleanup pass.

#### `src/components/orders/AddPaymentModal.tsx`
- Uses `Dialog`
- Fields: **Amount ₹** (number, required), **Type** (Advance / Partial / Final — 3-way toggle), **Date** (date picker, defaults to today), **Notes** (textarea, optional)
- Shows live preview: "After this payment, balance will be: ₹X"
- On save: calls `useAddPayment`, invalidates `["payments", orderId]`

#### `src/components/orders/PaymentLedgerPanel.tsx`
- Card with title "💰 Payment Ledger"
- **Summary row**: `Quoted: ₹80,000 | Paid: ₹50,000 | Balance: ₹30,000`
  - Balance colour: `> 0` → amber, `= 0` → green, quoted not set → muted
- **Payment list**: chronological, each row: date, type badge, amount, notes, delete icon (admin only, confirmation required)
- Empty state: "No payments recorded yet."
- **Footer**: `[+ Record Payment]` button (opens `AddPaymentModal`)

---

### 2B.3 — Order Detail Page Refactor

**File:** `src/app/(dashboard)/dashboard/orders/[id]/page.tsx`

**Detection logic:**

> [!WARNING]
> Revised from original plan. The original check `order.order_items.length >= 0` is always true for any array. Since `track === null` is the definitive marker (Phase 1 orders always have a track; Phase 2 orders don't), it is the only check needed.

```tsx
const isPhase2Order = order.track === null;
```

**Updated Supabase query** (add `order_items` and `payment_ledger` to the select):

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

**New layout structure:**

```tsx
{isPhase2Order ? (
  <>
    {/* 1. Order header (unchanged) */}
    {/* 2. Items section — maps over order_items, renders OrderItemCard */}
    {/*    + "Add Item" button opens AddItemModal */}
    {/* 3. PaymentLedgerPanel */}
    {/* 4. Files & Photos (unchanged) */}
  </>
) : (
  // Legacy Phase 1 layout — FsmControls + StageTimeline unchanged
  <Phase1OrderLayout order={order} />
)}
```

**Phase1OrderLayout** — extract current JSX into this named component to keep the file clean.

---

### 2B.4 — New Order Form Refactor

**File:** `src/app/(dashboard)/dashboard/orders/new/page.tsx`

**Changes only:**
- Remove the Track A/B toggle (track is now per-item, not per-order)
- Update `OrderPayload` type: remove `track` field
- Update submit payload accordingly
- Add hint text: *"You'll add individual items (Sofa, Table, etc.) to this order after creating it."*

No other changes to the form.

---

## TTP-2B — Task Checklist

```
Sprint 2B — Order Detail UI
│
├── [ ] Create src/hooks/useOrderItems.ts
├── [ ] Create src/hooks/usePayments.ts
│
├── [ ] Create src/components/orders/ItemStageTimeline.tsx
├── [ ] Create src/components/orders/AddItemModal.tsx
├── [ ] Create src/components/orders/OrderItemCard.tsx
│     └── [ ] Ensure: inline error handling (no alert()), cancelled status chip
├── [ ] Create src/components/orders/AddPaymentModal.tsx
├── [ ] Create src/components/orders/PaymentLedgerPanel.tsx
│
├── [ ] Refactor src/app/(dashboard)/dashboard/orders/[id]/page.tsx
│     ├── [ ] Update Supabase select query to include order_items + payment_ledger
│     ├── [ ] Extract Phase1OrderLayout component (inline or separate file)
│     ├── [ ] Add Phase 2 layout branch with items section + payment panel
│     └── [ ] Use revised detection: order.track === null
│
├── [ ] Update src/app/(dashboard)/dashboard/orders/new/page.tsx
│     └── [ ] Remove track toggle, update payload type, add hint text
│
├── [ ] git add . && git commit -m "feat(ui): order items cards, payment ledger panel, phase 1/2 order detail detection"
└── [ ] git push origin main
```

**Sprint 2B Acceptance Criteria:**

| AC | Test |
|---|---|
| AC-2B-1 | New order form no longer shows Track A/B toggle |
| AC-2B-2 | Phase 1 legacy orders still display `FsmControls` + `StageTimeline` |
| AC-2B-3 | Phase 2 orders show `OrderItemCard`s with their own timelines |
| AC-2B-4 | "Start Production" on item generates stages for that item only |
| AC-2B-5 | Advancing Item A does not change Item B's stage or status |
| AC-2B-6 | `AddItemModal` saves with name + track + optional unit price |
| AC-2B-7 | `PaymentLedgerPanel` shows correct balance after recording payment |
| AC-2B-8 | Balance updates instantly (React Query invalidation, no page reload) |
| AC-2B-9 | Manager can record payment; manager cannot delete payment (no delete button visible) |
| AC-2B-10 | FSM buttons show inline loading; errors shown inline (no `alert()`) |
| AC-2B-11 | Cancelled items show a red "✕ Cancelled" chip with no action buttons |

---
---

# SPRINT 2C — Finance & List Polish

## TIP-2C

### 2C.1 — Finance Page

**File:** `src/app/(dashboard)/dashboard/finance/page.tsx`

- Server component with `export const dynamic = 'force-dynamic'`
- Auth check: redirect non-admins to `/dashboard`
- Fetches from `/api/finance/outstanding`
- **Summary bar:** "Total Outstanding: ₹4,25,000 across 12 orders"
- **Table:** grouped by customer (accordion style). Columns: Customer, Orders, Quoted, Paid, **Balance Due** (amber/red if > 0, green chip if settled)
- Each customer row expands to show individual orders with status badge + "View" button
- **CSV Export:** reusable button that hits `/api/export?type=finance` — add finance export variant to existing export route

**Hook:** `src/hooks/useFinance.ts`

```ts
export function useOutstandingReport()  // GET /api/finance/outstanding, query key ["finance", "outstanding"]
```

---

### 2C.2 — Orders List Enhancements

**File:** `src/app/(dashboard)/dashboard/orders/page.tsx`

**Changes:**
1. **"Track" column renamed to "Items"** — shows count: `3 items` or `—` for legacy orders
2. **Stage badge area** — for Phase 2 orders: show first 2 item stage badges + `+N more`
3. **New filter chip: "Outstanding Balance"** — client-side filter: `balance_due > 0`. The `order_financials` view already includes `item_count` and `balance_due`, so these can be joined from the API.
4. **`StatusBadge`** must handle `dispatched` and `partial_dispatch` — already added in Sprint 2A prerequisite step

---

### 2C.3 — Kanban Board: Multi-Item Strategy

> [!IMPORTANT]
> This section was missing from the original plan. A Phase 2 order with 3 items in different stages has no single `current_stage_key` — the field is now on each `order_item`, not on `orders`. The Kanban board is built entirely around the single-stage-per-order concept.

**Strategy: Item-Level Kanban Cards**

Each `order_item` in an active production state becomes its own Kanban card. This is the most useful approach for the production floor because managers need to see which *items* are where.

**File:** `src/app/api/kanban/route.ts` — Refactor

Update the Kanban API to return both legacy (Phase 1) and item-based (Phase 2) cards:

```
1. Fetch Phase 1 orders (track IS NOT NULL, status IN ['in_production', 'on_hold', 'dispatched'])
   → group by current_stage_key as before

2. Fetch Phase 2 order_items (status IN ['in_production', 'on_hold'])
   → include parent order's order_number, customer name, priority, delivery_date
   → group by item's current_stage_key

3. Merge both groups into the same column structure
```

**File:** `src/components/kanban/KanbanCard.tsx` — Update

Add visual distinction for item-level cards:
- Show **"ORD-045 · Dining Table"** instead of just "ORD-045"
- Add a small "📦" icon to indicate this is an item, not a full order
- Link clicks navigate to `/dashboard/orders/${order.id}` (parent order detail page)

**File:** `src/app/(dashboard)/dashboard/kanban/page.tsx`

- Add `partial_dispatch` to the board's status filter so partially-dispatched orders' remaining items are visible
- Quick-advance button works for item cards (calls item-scoped `/api/order-items/[id]/advance`)

---

### 2C.4 — Sidebar + Mobile Nav Update

**File:** `src/components/layout/Sidebar.tsx`

Add Finance nav item to the admin section (alongside Recycle Bin, System Logs):

```tsx
import { BadgeDollarSign } from "lucide-react";
// ...
{isAdmin && (
  <>
    {/* existing: Recycle Bin, System Logs */}
    <Link href="/dashboard/finance" className={cn(navLinkClass, isActive("/dashboard/finance"))}>
      <BadgeDollarSign className="w-5 h-5" />
      Finance
    </Link>
  </>
)}
```

**File:** `src/components/layout/MobileNav.tsx`

Mobile nav has 6 slots currently — Finance is admin-only and lower priority; do not add to mobile bottom bar. The sidebar is accessible on desktop. (Mobile admin usage is secondary.)

---

### 2C.5 — Orders API Enhancement

**File:** `src/app/api/orders/route.ts` (GET handler)

Add join with `order_items` to include item count in order list response:

```ts
.select(`
  *,
  customers ( id, name, phone ),
  order_items ( id, name, status, track )
`)
```

For `balance_due`, the `order_financials` view (which now includes `item_count`) can be queried as a lightweight secondary fetch or joined via RPC. Return `item_count` in each order row.

---

## TTP-2C — Task Checklist

```
Sprint 2C — Finance & List Polish
│
├── [ ] Create src/hooks/useFinance.ts
├── [ ] Create src/app/(dashboard)/dashboard/finance/page.tsx
│     ├── [ ] Auth guard (redirect non-admin)
│     ├── [ ] Summary bar (total outstanding)
│     ├── [ ] Customer-grouped accordion table
│     └── [ ] CSV export button
│
├── [ ] Update src/app/api/export/route.ts (or create variant)
│     └── [ ] Add finance export: queries order_financials, outputs CSV
│
├── [ ] Update src/app/(dashboard)/dashboard/orders/page.tsx
│     ├── [ ] Rename Track → Items column; show item count
│     ├── [ ] Update stage cell to show multi-item badges
│     └── [ ] Add Outstanding Balance filter chip
│
├── [ ] Refactor Kanban for multi-item orders
│     ├── [ ] Update src/app/api/kanban/route.ts (return item-level cards for Phase 2)
│     ├── [ ] Update src/components/kanban/KanbanCard.tsx (item name display, icon)
│     └── [ ] Update src/app/(dashboard)/dashboard/kanban/page.tsx (partial_dispatch filter)
│
├── [ ] Update src/app/api/orders/route.ts
│     └── [ ] Include order_items in select for item count
│
├── [ ] Update src/components/layout/Sidebar.tsx
│     └── [ ] Add Finance nav item to admin section
│
├── [ ] git add . && git commit -m "feat(finance): outstanding balance report, kanban multi-item support, partial dispatch badge, orders list items column, finance sidebar entry"
├── [ ] supabase db push   ← (no new migrations in 2C, just in case drift)
└── [ ] git push origin main
```

**Sprint 2C Acceptance Criteria:**

| AC | Test |
|---|---|
| AC-2C-1 | `/dashboard/finance` is unreachable by manager (redirect to dashboard) |
| AC-2C-2 | Finance page shows correct total outstanding across all open orders |
| AC-2C-3 | Finance page groups by customer; expanding shows individual order rows |
| AC-2C-4 | `partial_dispatch` and `dispatched` status badges render correctly on orders list & order detail |
| AC-2C-5 | Orders list shows item count for Phase 2 orders, `—` for Phase 1 |
| AC-2C-6 | "Finance" nav link appears in sidebar for admin; does not appear for manager |
| AC-2C-7 | Finance CSV export downloads correctly formatted file |
| AC-2C-8 | Kanban board shows individual item cards for Phase 2 orders, each in correct stage column |
| AC-2C-9 | Quick-advance on item Kanban card calls item-scoped API (not order-scoped) |
| AC-2C-10 | Phase 1 orders continue to appear as single cards on Kanban (backward compatible) |

---

## Full Git History (Planned)

```
fix(ui): add dispatched + partial_dispatch to StatusBadge and design-constants [prerequisite]
feat(db): add order_items, payment_ledger tables and order_financials view [migration 015-016]
feat(api): order-items CRUD + item FSM routes + payment ledger + finance endpoint
feat(ui): order items cards, payment ledger panel, phase 1/2 order detail detection
feat(finance): outstanding balance report, kanban multi-item support, partial dispatch badge, orders list items column
```

---

## File Manifest

### New Files
```
supabase/migrations/015_order_items.sql
supabase/migrations/016_payment_ledger.sql
src/app/api/orders/[id]/items/route.ts
src/app/api/order-items/[itemId]/route.ts
src/app/api/order-items/[itemId]/confirm/route.ts
src/app/api/order-items/[itemId]/advance/route.ts
src/app/api/order-items/[itemId]/hold/route.ts
src/app/api/order-items/[itemId]/sendback/route.ts
src/app/api/orders/[id]/payments/route.ts
src/app/api/payments/[paymentId]/route.ts
src/app/api/finance/outstanding/route.ts
src/hooks/useOrderItems.ts
src/hooks/usePayments.ts
src/hooks/useFinance.ts
src/components/orders/OrderItemCard.tsx
src/components/orders/ItemStageTimeline.tsx
src/components/orders/AddItemModal.tsx
src/components/orders/PaymentLedgerPanel.tsx
src/components/orders/AddPaymentModal.tsx
src/app/(dashboard)/dashboard/finance/page.tsx
```

### Modified Files
```
src/lib/design-constants.ts                              ← add dispatched + partial_dispatch
src/components/shared/Badges.tsx                         ← add dispatched + partial_dispatch styling
types/index.ts                                           ← add OrderItem, PaymentLedgerEntry; update Order, OrderStage
src/lib/fsm/engine.ts                                    ← add 4 new functions (incl. cancelOrderItems)
src/app/(dashboard)/dashboard/orders/[id]/page.tsx       ← phase 1/2 detection + new select
src/app/(dashboard)/dashboard/orders/new/page.tsx        ← remove track toggle
src/app/(dashboard)/dashboard/orders/page.tsx            ← items column, outstanding filter
src/app/api/orders/route.ts                              ← include order_items in GET
src/app/api/orders/[id]/route.ts                         ← soft-delete cascade to child items
src/app/api/kanban/route.ts                              ← item-level cards for Phase 2 orders
src/components/kanban/KanbanCard.tsx                     ← item name display + icon
src/app/(dashboard)/dashboard/kanban/page.tsx            ← partial_dispatch filter
src/app/api/export/route.ts                              ← finance export variant
src/components/layout/Sidebar.tsx                        ← Finance nav item
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phase 1 orders break when order detail detects items | Low | Detection uses `track === null` (definitive marker), not item count |
| RLS blocks service-role FSM engine writes | Low | Engine uses `createServiceRoleClient()` which bypasses RLS |
| `order_financials` view slow on large datasets | Medium | Index on `payment_ledger.order_id` + `orders.deleted_at` already planned |
| `partial_dispatch` status not handled by Kanban | **Resolved** | Sprint 2C now includes full Kanban multi-item strategy |
| Migration 015 fails due to existing status data mismatch | Low | Pre-flight check (`SELECT DISTINCT status FROM orders`) added to migration |
| Kanban item cards create visual clutter for multi-item orders | Medium | Use a subtle grouping label ("ORD-045 · Item Name") to keep items visually linked |
| Soft-delete of order leaves orphaned items | **Resolved** | API route now cascades `deleted_at` to child order_items |
| TypeScript type drift causes runtime errors | **Resolved** | Sprint 2A now includes mandatory types/index.ts update |

---

## Revision Log

| Version | Date | Changes |
|---|---|---|
| 1.0 | — | Original plan |
| 1.1 | 23 Apr 2026 | **Post-review revision.** Fixed: migration SQL (no prior CHECK constraint), added `dispatched` to StatusBadge, added `cancelled` to order_items status, revised `recalculateOrderStatus` logic, added Kanban multi-item strategy (Sprint 2C.3), added TypeScript types update task, added soft-delete cascade, added `item_count` to order_financials view, fixed Phase detection logic, added `cancelOrderItems` helper. |
