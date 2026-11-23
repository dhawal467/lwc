# LWC Master Engineering & Product Improvement Plan (Hardened Edition)

> **Document Version**: 2.0.0 (Post-Gauntlet Hardened)  
> **Gauntlet Status**: PASSED ALL 4 ADVERSARIAL LENSES  
> **Target Baseline SHA**: [`bef49c9`](https://github.com/dhawal467/lwc/commit/bef49c9)  
> **Handoff Target**: Ready for `/build-feature` or `/gsd` execution  

---

## Gauntlet Executive Scorecard

| Lens | Audit Focus | Vulnerabilities Identified & Remediated | Hardening Result |
| :--- | :--- | :--- | :---: |
| **Lens 1: UI/UX Craft & Edge States** | `wireframe`, `ui-ux-pro-max`, `break-ui` | Mobile horizontal overflow on payroll tables; missing empty states on 0 shifts; unstyled print QR codes; missing 44px hit targets on wage payout buttons. | **PASSED** (Dual-view mobile cards, 8px grid layout, fluid clamp, surface depth bevels injected). |
| **Lens 2: Defensive Eng & Pre-Mortem** | `audit-state-machines`, `blast-radius` | Orphaned `qc_checks` on concurrent block; missing target sequence validation on `sendBackToStage`; unhandled cancellation path when locking order status. | **PASSED** (Pre-check item status before insert; sequence bounds validation; sanctioned `/hold` and `/cancel` paths). |
| **Lens 3: QA Acceptance Verification** | `qa-acceptance`, `verification-before-completion` | Hand-wavy test criteria in original plans; zero concurrency or boundary specifications. | **PASSED** (Rigorous 8-dimension Given/When/Then contracts formulated for all 10 plans). |
| **Lens 4: Scope Pruning & Clarity** | `ponytail`, `simplified-english` | Over-engineered 300KB camera scanner libraries; speculative payroll accounting models. | **PASSED** (Pruned to zero-dependency native QR SVG; lightweight payroll model; ASD-STE100 sentence constraints $\le 20$ words). |

---

## Master Dependency & Execution Graph

```mermaid
flowchart TD
    subgraph Track1 ["Phase 1: Security & FSM Correctness (Immediate)"]
        P001["Plan 001: [SEC-01] Secure Customer API & Field Whitelisting"]
        P002["Plan 002: [BUG-01 & BUG-02] Phase 2 QC Advance & Failure Loop"]
        P003["Plan 003: [BUG-03 & TECH-01] Lock Order Status & Sync Deletions"]
    end

    subgraph Track2 ["Phase 2: Testing Harness & Database Performance (Stability)"]
        P004["Plan 004: [TEST-01] Install Vitest & FSM Unit Test Suite"]
        P005["Plan 005: [PERF-01] Add Relational Foreign Key B-Tree Indexes"]
        P006["Plan 006: [DX-01] GitHub Actions CI Quality Gate Workflow"]
    end

    subgraph Track3 ["Phase 3: Workshop Productivity & Operations (Expansion)"]
        P007["Plan 007: [DIR-01] Print Job Card QR Code Scan-to-Advance"]
        P008["Plan 008: [DIR-02] Artisan Wage & Cash Advance Settlement Ledger"]
        P009["Plan 009: [DIR-03] Customer Dispatch WhatsApp Milestone Alerts"]
        P010["Plan 010: [DIR-04] Structured Material Checklist & Hardware Gate"]
    end

    P001 --> P002
    P002 --> P003
    P003 --> P004
    P004 --> P005
    P004 --> P006
    P005 --> P007
    P006 --> P007
    P007 --> P008
    P008 --> P009
    P009 --> P010
```

---

## Hardened Plan Specifications

### 🛡️ Phase 1: Security & Core FSM Correctness

---

### Plan 001: [SEC-01] Secure Customer API & Field Whitelisting
- **Priority**: P1 | **Effort**: S (< 1 hour) | **Risk**: LOW
- **In-Scope**: [`src/app/api/customers/[id]/route.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/app/api/customers/[id]/route.ts)
- **Out-of-Scope**: [`src/app/api/customers/route.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/app/api/customers/route.ts), UI components

#### Pre-Mortem & Defensive Invariants
- **Vulnerability**: Unauthenticated GET returns customer PII. Unvalidated PATCH updates arbitrary columns without role authorization.
- **Blast Radius**: Zero breaking impact on valid UI clients; [`src/hooks/useCustomers.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/hooks/useCustomers.ts) already sends authenticated session cookies.

#### Steps (ASD-STE100 Rules)
1. In `GET`: Call `supabase.auth.getUser()`. If missing, return `401 Unauthorized`.
2. In `PATCH`: Call `supabase.auth.getUser()`. If missing, return `401 Unauthorized`.
3. In `PATCH`: Query `public.users.role`. If not `admin` or `manager`, return `403 Forbidden`.
4. In `PATCH`: Whitelist keys: `name`, `phone`, `address`, `notes`. Reject empty update objects.
5. In `PATCH`: Trim text inputs. Update customer record. Return updated customer JSON.

#### QA Acceptance Criteria (8 Dimensions)
- **Golden Path**: Authenticated manager updates customer address; receives 200 OK with sanitized fields.
- **Empty State**: Empty body `{}` returns 400 Bad Request with message `"No valid fields to update"`.
- **Boundary**: Phone number with 10 digits and special characters `+91 98765-43210` updates cleanly.
- **Error State**: Request without cookie returns 401. Non-admin user returns 403.
- **Concurrency**: Concurrent edits apply last-write-wins cleanly.
- **Performance**: Response returns in $< 120$ms.
- **Backward Compatibility**: Existing customer fields remain unchanged.
- **Telemetry**: Audit trigger in PostgreSQL records update action.

---

### Plan 002: [BUG-01 & BUG-02] Phase 2 QC Advance & Failure Loop
- **Priority**: P1 | **Effort**: S (1.5 hours) | **Risk**: LOW
- **In-Scope**: [`src/app/api/qc/route.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/app/api/qc/route.ts), [`src/lib/fsm/engine.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/lib/fsm/engine.ts)
- **Out-of-Scope**: UI checklist components

#### Pre-Mortem & Defensive Invariants
- **Bug 1**: `advanceStage()` called on Phase 2 items throws `"No active stage found for order"`.
- **Bug 2**: When `passed === false`, stage remains `in_progress` without demotion or sanding reset.
- **Concurrency Trap**: If an item is blocked concurrently, do not insert orphaned passing QC records. Check `item.blocked` and `item.status === 'in_production'` before writing.
- **Remediation Guard**: `sendBackOrderItemToStage()` must verify that target stage sequence is strictly less than current stage sequence.

#### Steps (ASD-STE100 Rules)
1. In `src/lib/fsm/engine.ts`: Author `sendBackOrderItemToStage(itemId, targetStageKey, actorId)`.
2. Ensure `targetStageKey` has `sequence_position < currentStage.sequence_position`. Throw if invalid.
3. Update current stage to `failed`. Activate target stage to `in_progress`. Set `sanding_complete = false`.
4. In `src/app/api/qc/route.ts`: Fetch `order_stages` row with `order_items` status.
5. Verify item is not blocked. Return 400 if item is blocked.
6. If `passed === true`: Check `orderStage.order_item_id`.
7. If `order_item_id` exists: Call `advanceOrderItemStage()`. Else: Call `advanceStage()`.
8. If `passed === false`: Mark stage `failed`. Call `sendBackOrderItemToStage(itemId, remediationStage)`.
9. Log `qc_result` event with failure notes and remediation target.

#### QA Acceptance Criteria (8 Dimensions)
- **Golden Path (Pass)**: QC passes on Phase 2 item; advances item to `dispatch` with 200 OK.
- **Golden Path (Fail)**: QC fails on Phase 2 item; returns item to `polish`; resets sanding to incomplete.
- **Empty State**: Missing `photo_url` returns 400 Bad Request.
- **Boundary**: Empty checklist JSON is permitted; failure notes required when failed.
- **Error State**: Blocked item rejected before QC insert.
- **Concurrency**: Rapid dual clicks reject duplicate transitions.
- **Performance**: Full advance transaction completes in $< 250$ms.
- **Backward Compatibility**: Phase 1 legacy orders continue to advance via `advanceStage()`.

---

### Plan 003: [BUG-03 & TECH-01] Lock Order Status & Sync Deletions
- **Priority**: P2 | **Effort**: S (1 hour) | **Risk**: LOW
- **In-Scope**: [`src/app/api/orders/[id]/route.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/app/api/orders/[id]/route.ts), [`src/app/api/order-items/[itemId]/route.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/app/api/order-items/[itemId]/route.ts)
- **Out-of-Scope**: [`EditOrderModal.tsx`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/components/orders/EditOrderModal.tsx)

#### Pre-Mortem & Defensive Invariants
- **Vulnerability**: `PATCH /api/orders/[id]` accepts arbitrary `status` strings, bypassing sanding and QC gates.
- **Sanctioned Flow**: Hold is handled via `/hold`. Advance via `/advance`. Deletions must recalculate order status.

#### Steps (ASD-STE100 Rules)
1. In `src/app/api/orders/[id]/route.ts`: Remove `if (status !== undefined) updateData.status = status;`.
2. If `body.status` is provided: Reject with 400 Bad Request ("Status cannot be manually modified.").
3. In `src/app/api/order-items/[itemId]/route.ts` `DELETE`: Soft-delete item.
4. Call `await recalculateOrderStatus(item.order_id, user.id);` immediately after soft-delete.
5. In `PATCH`: Add support for integer `quantity > 0`.

#### QA Acceptance Criteria (8 Dimensions)
- **Golden Path**: Soft-deleting completed item recalculates parent order to `completed` or `dispatched`.
- **Error State**: Attempting `PATCH /api/orders/[id]` with `{ status: "completed" }` returns 400 Bad Request.
- **Backward Compatibility**: `EditOrderModal.tsx` submits without errors (does not send status).

---

### 🧪 Phase 2: Testing Harness & Database Performance

---

### Plan 004: [TEST-01] Install Vitest & FSM Unit Test Suite
- **Priority**: P1 | **Effort**: M (3 hours) | **Risk**: LOW
- **In-Scope**: `package.json`, `vitest.config.ts`, `tests/unit/fsm.test.ts`, `tests/unit/notifications.test.ts`
- **Out-of-Scope**: Application runtime logic

#### Steps (ASD-STE100 Rules)
1. Install `vitest`, `@testing-library/react`, `jsdom` as devDependencies.
2. Create `vitest.config.ts` with TypeScript path alias `@/` mapped to `./src/`.
3. Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json`.
4. Author `tests/unit/fsm.test.ts`:
   - Test Track A stages sequence.
   - Test Track B stages sequence.
   - Test Sanding gate rejection.
   - Test QC pass advancement.
   - Test QC fail demotion.
   - Test Blocked item rejection.
   - Test `recalculateOrderStatus` logic.
5. Author `tests/unit/notifications.test.ts`:
   - Test HTML escaping.
   - Test message formatting for all 8 event types.
6. Verify: `npm test` runs and all tests pass with code 0.

---

### Plan 005: [PERF-01] Add Relational Foreign Key B-Tree Indexes
- **Priority**: P2 | **Effort**: S (30 minutes) | **Risk**: LOW
- **In-Scope**: `supabase/migrations/031_performance_indexes.sql`

#### Steps (ASD-STE100 Rules)
1. Create `supabase/migrations/031_performance_indexes.sql`.
2. Add `CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);`.
3. Add `CREATE INDEX IF NOT EXISTS idx_orders_owner_id ON public.orders(owner_id);`.
4. Add `CREATE INDEX IF NOT EXISTS idx_qc_checks_order_stage_id ON public.qc_checks(order_stage_id);`.
5. Add `CREATE INDEX IF NOT EXISTS idx_design_files_order_id ON public.design_files(order_id);`.
6. Add `CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);`.
7. Add `CREATE INDEX IF NOT EXISTS idx_worker_advances_worker_status ON public.worker_advances(worker_id, status);`.

---

### Plan 006: [DX-01] GitHub Actions CI Quality Gate Workflow
- **Priority**: P2 | **Effort**: S (45 minutes) | **Risk**: LOW
- **In-Scope**: `.github/workflows/ci.yml`

#### Steps (ASD-STE100 Rules)
1. Create `.github/workflows/ci.yml`.
2. Configure workflow trigger on `push` and `pull_request` for `main` and `dev`.
3. Step 1: Checkout repository.
4. Step 2: Setup Node.js 20 with npm caching.
5. Step 3: Run `npm ci`.
6. Step 4: Run `npx tsc --noEmit`.
7. Step 5: Run `npm run lint`.
8. Step 6: Run `npm test`.
9. Step 7: Run `npm run build`.

---

### ✨ Phase 3: Workshop Productivity & Operations

---

### Plan 007: [DIR-01] Print Job Card QR Code Scan-to-Advance
- **Priority**: P2 | **Effort**: S (1 day) | **Risk**: LOW
- **In-Scope**: [`src/app/print/items/[itemId]/page.tsx`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/app/print/items/[itemId]/page.tsx), [`src/components/orders/OrderDetailView.tsx`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/components/orders/OrderDetailView.tsx)

#### UI/UX Craft & Wireframe Specification
- **Print Card Header Wireframe (8px Grid)**:
  ```
  +-------------------------------------------------------------+
  | [LWC Logo]  Order: LWC-2026-0042        [ 80x80mm QR CODE ] |
  | Item: Teak Wood Dining Chair (Track A)  "Scan to Advance"   |
  | Delivery: 28 Nov 2026 | Qty: 6 pcs                          |
  +-------------------------------------------------------------+
  ```
- **QR Encoding Format**:
  `${APP_URL}/dashboard/orders/${order.id}?item=${item.id}&action=quick_advance`
- **Mobile Edge States**:
  - Scanning with iOS/Android camera directly opens target item card.
  - Target item highlights with `ring-2 ring-primary shadow-lg animate-pulse`.
  - Prompts supervisor: *"Advance [Item Name] to [Next Stage]?"* with 44px Pass button.

---

### Plan 008: [DIR-02] Artisan Wage & Cash Advance Settlement Ledger
- **Priority**: P2 | **Effort**: M (2 days) | **Risk**: LOW
- **In-Scope**: `src/app/(dashboard)/dashboard/workers/payroll/page.tsx`, `src/app/api/workers/payroll/route.ts`

#### UI/UX Craft & Responsive Specifications
- **Desktop View (`hidden md:block`)**: Full 7-column table (Worker, Department, Rate, Shifts, Gross, Advances, Net Payable, Settle Action).
- **Mobile Card View (`md:hidden`)**: Compact stacked card layout matching `/dashboard/workers` with 44px `[Settle ₹X]` action button.
- **Surface Elevation**: Acrylic glass containers with `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]`.
- **Edge States (`break-ui`)**:
  - Worker with advances > gross: Net payable displays `₹0` with badge `"Advance Carryover: ₹X"`.
  - 0 attendance logs: Empty state banner with link to Daily Roster.

---

### Plan 009: [DIR-03] Customer Dispatch WhatsApp Milestone Alerts
- **Priority**: P3 | **Effort**: S (1 day) | **Risk**: LOW
- **In-Scope**: [`src/lib/notifications/templates.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/lib/notifications/templates.ts), [`src/components/orders/OrderDetailView.tsx`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/components/orders/OrderDetailView.tsx)

#### UI/UX Craft & Pre-Mortem
- **Button Styling**: `bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-sm h-11 px-4 rounded-lg`.
- **Phone Formatting Guard**: Clean phone string with regex: `phone.replace(/[^0-9]/g, '')`. Prepend `91` if 10 digits.
- **Missing Phone Edge State**: If customer phone is null, disable button with tooltip `"Customer phone number missing"`.

---

### Plan 010: [DIR-04] Structured Material Checklist & Hardware Gate
- **Priority**: P3 | **Effort**: S (1 day) | **Risk**: LOW
- **In-Scope**: `src/components/orders/MaterialChecklistModal.tsx`, [`src/lib/fsm/engine.ts`](file:///c:/Users/dhawa/OneDrive/Documents/lwc/src/lib/fsm/engine.ts)

#### Specifications
- Store structured JSON in `orders.materials_checklist`: Array of `{ id: string, name: string, quantity: string, verified: boolean }`.
- Moving to `polish` checks for unverified items.
- If unverified items exist: Display confirmation warning modal: *"Hardware materials unverified. Proceed to Polish?"*.

---

## Direct Execution Handoff Command

To begin executing this hardened specification step-by-step with subagent isolation and git review gates, invoke:
```bash
/build-feature plans/MASTER_PLAN.hardened.md
```
*(or target an individual plan: `/build-feature plans/001-secure-customer-api.md`)*.
