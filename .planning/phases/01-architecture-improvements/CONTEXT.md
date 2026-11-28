# Phase 01: Context & Technical Invariants

## Objective
Implement the 6 hardened architectural improvements from `plans/ARCHITECTURE_GAUNTLET.hardened.md`:
1. Concurrency Protection & Stage Advance Row Locking.
2. Unified Canonical Model (deprecating Phase 1 single-item dual-path branching).
3. Immutable Payroll Settlement Snapshots (`payroll_settlements` table).
4. QR Scan-to-Advance Session & Parameter Preservation (`returnUrl` through middleware).
5. Floor Touch Ergonomics & Double-Tap Debounce (600ms throttle, 48px hitboxes).
6. Item-Level Material & Hardware Association (`order_item_id` in materials checklist).

## Non-Negotiable Invariants
- Mandatory `export const dynamic = "force-dynamic";` on all authenticated API routes.
- Minimum 44px (prefer 48px on floor views) touch targets for mobile accessibility.
- Zero `any` where strict types can be applied.
- All database mutations must maintain audit actor attribution.
- Vitest suite must remain 100% green at all times.
