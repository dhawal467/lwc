# Project Context: FurnitureMFG

## What is FurnitureMFG?
FurnitureMFG is a proprietary cloud-based operations management system designed for a small-scale custom wooden furniture workshop. 
**Core Pivot:** It is a **Managers-Only** high-powered digital ledger. Floor workers do not use the software.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack React Query v5 (Server state caching & optimistic updates). **No Redux, no Zustand.**
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Hosting:** Vercel (Edge)

## Core Architectural Rules (Locked)

### 1. The "No-API" Lean Approach
Zero external APIs for SMS/WhatsApp etc. Rely purely on UI visual indicators (e.g., Kanban cards turning red when aged).

### 2. The FSM Engine (Finite State Machine)
- **Order Lifecycle:** Transitions (`advanceStage`, `sendBackToStage`) are explicitly handled in **Next.js API routes** (TypeScript), NOT in Supabase Postgres triggers. **Business logic must NEVER live in the database. Supabase is strictly a dumb data store and auth layer; Next.js TypeScript owns 100% of the routing, state logic, and error handling.**
- **Rework Loop:** QC failures regress the order digitally to a target previous stage.
- **Tracks:**
  - Track A (Standard Wood): `carpentry → sanding → polish → qc_check → dispatch`
  - Track B (Upholstery): `frame_making → sanding → polish → upholstery → qc_check → dispatch`
  *(Note: Sanding is a mandatory boolean sub-stage of carpentry/frame_making, not a separate column).*

### 3. Role-Based Access Control (RBAC)
Two roles exist in `users.role` (and synced to JWT claims):
- **Admin (Owner):** Full Read/Write. Only role able to toggle `Priority` status and empty the Recycle Bin.
- **Manager:** Create/Move orders, upload designs, log QC. Cannot permanently delete rows or toggle Priority.

### 4. Data Safety Constraints
- **Soft Deletes:** Direct `DELETE FROM orders` is strictly banned. Use `PATCH` to set `deleted_at`. Orders sit in a Recycle Bin for 30 days before a `pg_cron` cron job prunes them.
- **Image Upload constraints:** ALL images uploaded to Supabase Storage must go through `browser-image-compression` on the client first (under 500KB or max 1920px width). 
- **RLS Safety:** Direct `INSERT`/`UPDATE` to `order_stages` from the React client is blocked by Row Level Security. Must use API route mutations.

### 5. Frontend & Design Specs
- **Mobile-First:** Target 375px baseline.
- **Tailwind Config:** Explicit strict semantic tokens (Warm Soft Pop aesthetic). 
- **Dual-Mode Mandatory:** Every UI component MUST support both light and dark mode using Tailwind's `dark:` prefix. Rely on `next-themes` for the toggle. Never use hardcoded hex colors; strictly use our CSS variable theme tokens.

## File Structure Convetions
Flat Next.js structure. No Monorepo/Turborepo tools. 
Component files go into specialized feature folders (`components/kanban`, `components/orders`, `components/qc`, etc.) and reusable items inside `components/ui`.
