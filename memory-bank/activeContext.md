# Active Context: FurnitureMFG

**Current Phase:** Phase 2 — Multi-Item Orders & Financials ✅ COMPLETE
**Current Sprint:** Sprint 2C — Finance & List Polish (Completed)

## Phase 2 is now fully complete. All sprints (2A, 2B, 2C) are done and pushed.

---

## What Was Last Completed (Sprint 2C: Finance & List Polish)

- **Finance Hook**: `useOutstandingReport()` in `src/hooks/useFinance.ts` to fetch from `/api/finance/outstanding`.
- **Finance Sidebar**: Added `BadgeDollarSign` Finance link to admin-only sidebar navigation.
- **Finance Page** (`/dashboard/finance`): Built a premium admin-only page with:
  - Role guard (non-admins redirected to dashboard)
  - Summary bar: total outstanding + total active orders
  - Customer accordion table: expandable rows with individual order breakdowns
  - CSV export button linked to `/api/export?type=finance`
- **Finance CSV Export**: Extended `/api/export` to support `?type=finance` — returns a date-stamped CSV with customer, order, and balance data.
- **Orders List Enhancements**:
  - API now includes `order_items` and `payment_ledger` in response
  - "Track" column renamed to "Items" (shows item count for Phase 2, track for Phase 1)
  - Stage column shows multi-badge preview for Phase 2 item stages
  - New "Unpaid" filter for orders with outstanding balances
- **Kanban Multi-Item (API)**: Dual-query approach: Phase 1 orders (track IS NOT NULL) + Phase 2 items merged into shared `groupedOrders` columns. Each card now carries `type: 'order' | 'item'`.
- **Kanban Multi-Item (UI)**: `KanbanCard` detects card type, displays `ORD-XXX · Item Name` for item cards with a Package icon, routes quick-advance to `/api/order-items/:id/advance`.

---

## Full Phase 2 Sprint Summary

| Sprint | Focus | Status |
|--------|-------|--------|
| 2A | Backend: DB migrations, FSM engine, API routes | ✅ Done |
| 2B | UI: Order items, payment ledger, order detail refactor | ✅ Done |
| 2C | Finance dashboard, orders list polish, kanban multi-item | ✅ Done |

---

## What Is Next

- [ ] **Phase 3 / Post-Sprint**: Final production readiness audit.
  - Review unresolved TS error in `dashboard/page.tsx` (customers name type).
  - Full mobile/dark-mode pass.
  - Vercel deployment verification.
