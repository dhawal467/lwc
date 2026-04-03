# Active Context: FurnitureMFG

**Current Phase:** Phase 1 — Core Production Ledger
**Current Sprint:** Sprint 0 — Foundation

## What Was Last Completed
- Evaluated and locked the v2.0 Architecture / PRD strategy (Managers-Only, FSM logic explicitly kept in TS/Next.js).
- Locked the Warm Soft Pop aesthetic Design Philosophy (Mobile-first, scannable elements, strictly no external APIs like Twilio/Gupshup).
- Resolved critical technical tweaks for Tailwind's dynamic colors array map bug.
- Initialised Kilo Code project memory-bank context (`projectContext.md`).

## What Is Next (Action Items)

**Sprint 0: Scaffold Target**
- [ ] **Task 0.1:** Scaffold Next.js 14 App Router project with TypeScript (Base config).
- [ ] **Task 0.2:** Configure local Supabase via CLI (`supabase/config.toml`).
- [ ] **Task 0.3 & 0.4:** Setup Database schema migrations (001-008) and implement basic RLS Row Level Security. Read all schema files generated in Task 0.3 before writing the RLS policies. Handle the database foundation in one continuous sprint sequence.
- [ ] **Task 0.5-0.7:** Wire up `users.role` claims / basic Client and Server type/utility boilerplates.
- [ ] **Task 0.8-0.9:** Scaffold `globals.css` base aesthetic CSS styling & shadcn primitives (`Button`, `Input`, `Card`).
