# Active Context: FurnitureMFG

**Current Phase:** Phase 2 — Multi-Item Orders & Financials
**Current Sprint:** Sprint 2A — Backend Foundation (Completed)

## What Was Last Completed (Sprint 2A: Money & Items Backend)
- **Database Migrations**: Created `order_items` and `payment_ledger` tables, updated `order_stages` to link to items, and built the `order_financials` view.
- **FSM Engine Refactor**: Migrated FSM logic from order-level to item-level (`confirmOrderItem`, `advanceOrderItemStage`, `cancelOrderItems`), with dynamic parent order status recalculation (`recalculateOrderStatus`).
- **API Routes**: Built comprehensive CRUD and FSM control endpoints for `order_items` and `payment_ledger`, including soft-delete cascading.
- **Finance Reports**: Implemented the admin-only `/api/finance/outstanding` endpoint to track customer balances.

## What Is Next
- [ ] Sprint 2B: Order Detail UI (React Query hooks, Payments Tab, Item List UI, Finance Dashboard).
