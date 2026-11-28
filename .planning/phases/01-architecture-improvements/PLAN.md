# Phase 01: Atomic Task Plan (`PLAN.md`)

## Wave 1: Domain Logic, State Invariants & Database Schema
- [ ] **Task 1: Migration `032_payroll_settlements.sql`**
  - Create table `public.payroll_settlements` with unique constraint `(worker_id, month)`.
  - Add RLS policy for `admin` and `manager` roles.
- [ ] **Task 2: FSM Stage Advance Concurrency Lock**
  - In `src/lib/fsm/engine.ts`, ensure `advanceOrderItemStage` verifies that the active stage hasn't transitioned concurrently before updating.
- [ ] **Task 3: Payroll Settlement API & Engine Update**
  - In `src/app/api/workers/payroll/route.ts`, implement `POST` handler to freeze and settle worker monthly wages.
  - In `src/lib/payroll.ts`, support loading existing settlement records.
- [ ] **Task 4: Item-Level Material Schema**
  - In `src/lib/materials.ts`, add `order_item_id?: string | null` to `MaterialChecklistItem` and support filtering by item.

## Wave 2: Floor Touch Ergonomics, Tactile UI & Scan Persistence
- [ ] **Task 5: QR Scan Auth Redirect Preservation**
  - In `src/middleware.ts`, capture full pathname + search params as `returnUrl`.
  - In `src/app/(auth)/login/page.tsx`, redirect to `returnUrl` after login.
- [ ] **Task 6: Floor Touch Ergonomics & Debounce**
  - In `src/components/orders/OrderItemCard.tsx` and `FsmControls.tsx`, add 600ms debounce guard and pending indicator.
- [ ] **Task 7: Item-Level Hardware Filter in Modal**
  - In `src/components/orders/MaterialChecklistModal.tsx`, add item selector dropdown and associate new items with active `order_item_id`.
- [ ] **Task 8: Settle Month UI Action**
  - In `src/app/(dashboard)/dashboard/workers/payroll/page.tsx`, add "Settle Month" button and settled badge.

## Wave 3: Integration, Unit Tests & Verification
- [ ] **Task 9: Comprehensive Unit Tests**
  - Add unit tests for `payroll_settlements`, concurrency guards, and item-level materials.
- [ ] **Task 10: Verification & Build Quality Gate**
  - Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`.
