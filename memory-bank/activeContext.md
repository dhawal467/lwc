# Active Context: FurnitureMFG

**Current Phase:** Phase 1 — Core Production Ledger
**Current Sprint:** Sprint 3 — FSM Engine + Order Detail

## What Was Last Completed (Sprint 2)
- Integrated TanStack React Query for all server-state management.
- Built Customer List (Desktop Table / Mobile Swipe-cards) and Search.
- Built Customer Detail Page with Order History and Edit functionality.
- Built Order List with high-density "Warm Soft Pop" styling and Status/Priority filters.
- Implemented Sequential Order ID logic (ORD-001) via a Postgres function `generate_next_order_number()`.
- Built the New Order Form with Track A/B selection and React Query mutations.
- Fixed cookie scoping in Middleware and Server Client to resolve nested route auth redirects.

## What Is Next (Sprint 3 Action Items)
- [ ] Task 3.1: TRACK_STAGES constant + types.
- [ ] Task 3.2/3.3: `advanceStage()` and `sendBackToStage()` logic (FSM Engine).
- [ ] Task 3.4/3.5: Confirm Order and Hold/Resume API routes.
- [ ] Task 3.6: Order Detail page with Stage Timeline visualization.
- [ ] Task 3.7: FSM Action Controls (Advance, Hold, Send Back).
