# Active Context: FurnitureMFG

**Current Phase:** Phase 1 — Core Production Ledger
**Current Sprint:** Sprint 4 — Master Production Board (Kanban)

## What Was Last Completed (Sprint 3)
- Defined FSM Production Tracks (A and B) and Stage Configurations.
- Built the FSM Engine (`advanceStage`, `sendBackToStage`, `confirmOrder`, `toggleHold`).
- Implemented the Supabase Service Role client for RLS-bypassing FSM mutations.
- Created the Order Detail page with a two-panel layout.
- Built the Vertical Stage Timeline component with status-specific node styling.
- Built the FsmControls UI with dynamic action buttons and sanding-gate enforcement.
- Fixed Order Detail query bug (invalid email column) and parallel route console warnings.
- Fixed FSM reactivity issues using `router.refresh()` and persisted Sanding state to the database.

## What Is Next (Sprint 4 Action Items)
- [ ] Task 4.1: Kanban board layout (columns per stage, cards per order).
- [ ] Task 4.2: Kanban card component (ID, Customer, Date, Priority).
- [ ] Task 4.4: Aging indicator logic (Red border for 2+ day stalls).
- [ ] Task 4.5: Optimistic UI for stage advancement on the board.
- [ ] Task 4.6: Real-time data polling (30s).
