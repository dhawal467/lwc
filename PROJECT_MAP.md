# LWC Furniture Manufacturing: AI-First Architecture & System Cartography

> **Single Source of Truth** for AI agents, engineering models, and developers working on the Laxmi Wood Craft (LWC) Workshop Operations & Enterprise Resource Platform.
> Last Updated: 2026-11-23

---

## 1. Executive Summary & Tech Stack

LWC is a specialized production management and workshop execution system tailored for bespoke custom furniture manufacturing. The platform orchestrates dual-track production lifecycles (Solid Wood vs. Upholstered Furniture), workshop floor worker attendance, stage-gated quality control, customer payment ledgers, and real-time Telegram notifications.

### Core Technology Stack
- **Web Framework**: Next.js 14.2.35 (App Router, Server Components, Route Handlers)
- **Runtime**: Node.js 20+ / Vercel Serverless Platform
- **Database & Auth**: Supabase PostgreSQL 15+ (Row Level Security, Auth Cookies, Custom Audit Triggers)
- **Object Storage**: Supabase Storage (Bucket: `design-files` for CAD/drawings, item renders, and QC verification photos)
- **State Management & Data Fetching**: TanStack Query v5 (React Query with optimistic mutations and background invalidation)
- **UI & Design System**: Tailwind CSS v3.4, Radix UI primitives (`@radix-ui/react-label`, `react-slot`, `react-switch`), Lucide Icons, Sonner Toasts
- **Real-Time Notifications**: Telegram Bot API (HTML message templates with retry queue and audit logs)
- **Language**: TypeScript 5 (Strict mode)

---

## 2. Layer 1: Bird's-Eye System Mindmap

```mermaid
flowchart TD
    subgraph Clients ["Client Tier (Workshop & Office)"]
        UI_Desktop["Desktop Portal (Chrome/Edge)<br/>Admin, Office, Finance, Dispatch"]
        UI_Mobile["Mobile Web App / PWA<br/>Workshop Floor, QC Supervisors, Workers"]
        UI_Print["Print Sheets (/print/items/[id])<br/>Thermal/A4 Physical Job Cards"]
    end

    subgraph Gateway ["Routing & Edge Middleware"]
        MW["Next.js Middleware (src/middleware.ts)<br/>Auth Session Refresh & /dashboard Route Protection"]
        AppRouter["Next.js App Router (src/app)<br/>Server & Client Components"]
        API["30+ REST API Route Handlers (src/app/api)<br/>Force-Dynamic JSON Endpoints"]
    end

    subgraph BusinessLogic ["Core Business Logic & FSM Tier"]
        FSM["Dual-Track FSM Engine (src/lib/fsm/engine.ts)<br/>Track A (Wood) vs Track B (Upholstery)"]
        SandingGate["Sanding Quality Guard<br/>Carpentry & Frame-Making Gate"]
        QCEngine["QC Inspection Engine (src/components/qc)<br/>Pass/Fail Checklist & Photo Verification"]
        EventLogger["Order Events Logger (src/lib/events.ts)<br/>Audit Trail & Context Enrichment"]
        Notifier["Telegram Notification Hub (src/lib/notifications)<br/>HTML Templating & Retry Queue"]
        Attendance["Attendance & Shift Multiplier<br/>0x, 1x, 1.5x (OT), 2x (Double)"]
        Haptics["Tactile Haptic Engine (src/lib/haptics.ts)<br/>Mobile Vibration Confirmation"]
    end

    subgraph Persistence ["Data & Storage Tier (Supabase)"]
        Postgres[("Supabase PostgreSQL DB<br/>14 Tables, RLS Policies, Audit Triggers")]
        Storage["Supabase Storage<br/>'design-files' Bucket (Drawings, QC, Items)"]
        AuthService["Supabase GoTrue Auth<br/>Role-Based (admin vs manager)"]
        AuditLogStore["Audit Log & Notification Queue<br/>x-user-id Attribution Trigger"]
    end

    subgraph External ["External Services"]
        TelegramBot["Telegram Bot API<br/>Factory Floor Broadcast & Alerts"]
        VercelCDN["Vercel Edge Network<br/>Hosting, SSR & Serverless Functions"]
    end

    Clients --> MW
    MW --> AppRouter
    AppRouter --> API
    API --> FSM
    API --> QCEngine
    API --> Attendance
    FSM --> SandingGate
    FSM --> EventLogger
    QCEngine --> EventLogger
    EventLogger --> Notifier
    Notifier --> TelegramBot

    API --> Postgres
    API --> Storage
    MW --> AuthService
    EventLogger --> AuditLogStore
    API --> VercelCDN
```

---

## 3. Layer 2: Directory & Subsystem Ownership Matrix

| Directory / Subsystem | Primary Role & Responsibility | Core Entry Points | Downstream Callers |
| :--- | :--- | :--- | :--- |
| `src/app/(auth)/` | Authentication routes and session initialization | `login/page.tsx` | Supabase GoTrue Auth, `src/middleware.ts` |
| `src/app/(dashboard)/` | Authenticated application views (Kanban, Orders, Workers, QC, Finance, Admin) | `dashboard/page.tsx`, `orders/page.tsx`, `kanban/page.tsx` | End-users, Workshop managers, Supervisors |
| `src/app/api/` | 30+ REST API route handlers managing orders, stages, workers, attendance, and QC | `orders/route.ts`, `kanban/route.ts`, `qc/route.ts` | `src/hooks/`, Client components, TanStack Query |
| `src/app/print/` | Print-optimized views for physical order production job cards | `print/items/[itemId]/page.tsx` | Workshop floor physical cards |
| `src/components/kanban/` | Visual drag/stage cards, aging alerts, blocked overlays, and stage advance CTA | `KanbanCard.tsx`, `KanbanSkeleton.tsx` | `src/app/(dashboard)/dashboard/kanban/page.tsx` |
| `src/components/orders/` | Order creation, detail viewer, item cards, stage timelines, and ledger modal | `OrderDetailView.tsx`, `OrderItemCard.tsx`, `FsmControls.tsx` | `src/app/(dashboard)/dashboard/orders/` |
| `src/components/qc/` | Workshop floor quality control checklist form and instant image preview | `QcChecklistForm.tsx` | `dashboard/orders/[id]/qc/page.tsx` |
| `src/components/workers/` | Worker management modal and attendance roster controls | `WorkerAttendanceModal.tsx` | `dashboard/workers/page.tsx` |
| `src/components/layout/` | Application navigation, responsive sidebar, topbar, and mobile drawer nav | `Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx` | `(dashboard)/layout.tsx` |
| `src/components/ui/` | Reusable design system primitives (Button, Dialog, BottomSheet, CelebrationOverlay) | `button.tsx`, `dialog.tsx`, `bottom-sheet.tsx`, `CelebrationOverlay.tsx` | All application components |
| `src/hooks/` | TanStack Query custom hooks encapsulating API fetch/mutate logic | `useOrders.ts`, `useOrderItems.ts`, `useKanban.ts`, `useWorkers.ts` | Presentation components |
| `src/lib/fsm/` | Finite State Machine engine enforcing stage progression, sanding, and sendbacks | `engine.ts`, `tracks.ts` | `/api/orders/[id]/advance`, `/api/order-items/[id]/advance` |
| `src/lib/notifications/`| Telegram notification orchestrator, HTML templates, and delivery logger | `send.ts`, `telegram.ts`, `templates.ts` | `src/lib/events.ts` |
| `src/lib/supabase/` | SSR, client, server, and service-role Supabase clients with actor attribution | `client.ts`, `server.ts`, `service.ts`, `middleware.ts` | API routes, middleware, FSM engine |
| `src/lib/design-constants.ts` | Immutable stage colors, stage labels with icons, and status badges | `STAGE_COLORS`, `STAGE_LABELS`, `STATUS_CONFIG` | UI cards, Kanban headers, Telegram templates |
| `supabase/migrations/` | 30 sequential SQL migrations defining schema, constraints, triggers, and RLS | `001_users_and_auth.sql` through `030_notification_infrastructure.sql` | Supabase Postgres DB |
| `types/` | Central TypeScript interfaces and domain type contracts | `index.ts` | Entire codebase |

---

## 4. Layer 3: Critical Data Flows & Lifecycles

### Lifecycle A: Order Item Stage Advancement & FSM Guard Execution

```mermaid
sequenceDiagram
    autonumber
    actor Supervisor as Workshop Supervisor
    participant UI as OrderItemCard / KanbanCard
    participant API as /api/order-items/[id]/advance
    participant FSM as FSM Engine (engine.ts)
    participant DB as Supabase PostgreSQL
    participant Logger as logOrderEvent (events.ts)
    participant Telegram as Telegram Bot API

    Supervisor->>UI: Clicks "Advance Stage →"
    UI->>API: POST /api/order-items/[id]/advance
    API->>FSM: advanceOrderItem(itemId, actorId)
    
    rect rgb(240, 245, 255)
        note over FSM,DB: Invariant Checks
        FSM->>DB: Fetch OrderItem and active OrderStage
        DB-->>FSM: Returns active stage (e.g., 'carpentry')
        FSM->>FSM: Check STAGE_CONFIG[stageKey].requiresSanding
        alt Sanding Incomplete
            FSM-->>API: Throw "Sanding must be marked complete"
            API-->>UI: 400 Bad Request
            UI-->>Supervisor: Toast Error: Sanding Required
        else Sanding Complete or Not Required
            FSM->>DB: UPDATE order_stages SET status = 'complete', completed_at = now()
            FSM->>DB: UPDATE order_stages (next_stage) SET status = 'in_progress', started_at = now()
            FSM->>DB: UPDATE order_items SET current_stage_key = next_stage, status = next_status
            FSM->>FSM: recalculateOrderStatus(orderId)
            FSM->>DB: UPDATE orders SET status = recalculatedStatus
        end
    end

    FSM->>Logger: logOrderEvent("stage_change", enrichedPayload)
    Logger->>DB: INSERT into order_events
    Logger->>Telegram: sendNotification("stage_change")
    Telegram-->>Logger: 200 OK (telegram_message_id)
    Logger->>DB: INSERT into notification_log (status: 'sent')

    FSM-->>API: Stage Advanced Successfully
    API-->>UI: 200 OK { current_stage, status }
    UI->>UI: triggerHaptic(40) + invalidateQueries
    UI-->>Supervisor: Toast: "✓ Advanced to Polish" (or Celebration Overlay if Dispatch)
```

---

### Lifecycle B: Quality Control (QC) Inspection & Remediation Loop

```mermaid
sequenceDiagram
    autonumber
    actor QC as QC Inspector
    participant Form as QcChecklistForm.tsx
    participant Storage as Supabase Storage ('design-files')
    participant API as POST /api/qc
    participant FSM as FSM Engine
    participant DB as Supabase PostgreSQL

    QC->>Form: Selects Pass/Fail per checklist criteria
    QC->>Form: Captures mandatory photo via camera
    Form->>Storage: compressAndUpload(file, path)
    Storage-->>Form: Returns public photo_url
    Form->>API: POST /api/qc { order_stage_id, passed, checklist_json, photo_url, failure_notes }
    API->>DB: INSERT into qc_checks
    
    alt Inspection PASSED
        API->>DB: UPDATE order_stages SET photo_url = photo_url WHERE id = order_stage_id
        API-->>Form: 200 OK { passed: true }
        Form-->>QC: Green Success Banner + Enable Advance to Dispatch
    else Inspection FAILED
        API->>FSM: sendBackToStage(orderId, targetStageKey = 'carpentry' / 'polish')
        FSM->>DB: UPDATE order_stages SET status = 'failed' WHERE id = currentStageId
        FSM->>DB: UPDATE order_stages SET status = 'in_progress', sanding_complete = false WHERE stage_key = targetStageKey
        FSM->>DB: UPDATE order_items / orders SET current_stage_key = targetStageKey
        API-->>Form: 200 OK { passed: false, remediateStage: targetStageKey }
        Form-->>QC: Warning Toast + Returned to Remediation Stage
    end
```

---

### Lifecycle C: Dual-Track Production State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Order Created (Pending Review)
    Draft --> Confirmed: Confirm Order (/api/orders/confirm)
    
    state "Phase 2 Active Production" as Production {
        state "Track A: Solid Wood" as TrackA {
            [*] --> Carpentry: Auto-starts
            Carpentry --> Carpentry_Sanding: Wood crafted
            Carpentry_Sanding --> Polish_A: Sanding verified
            Polish_A --> QC_A: Buffed & coated
            QC_A --> Dispatch_A: QC Passed + Photo Uploaded
            QC_A --> Carpentry: QC Failed (Remediate Frame/Wood)
            QC_A --> Polish_A: QC Failed (Remediate Finish)
        }
        
        state "Track B: Upholstered" as TrackB {
            [*] --> Frame_Making: Auto-starts
            Frame_Making --> Frame_Sanding: Skeleton crafted
            Frame_Sanding --> Polish_B: Sanding verified
            Polish_B --> Upholstery: Exposed wood completed
            Upholstery --> QC_B: Foam & fabric tailored
            QC_B --> Dispatch_B: QC Passed + Photo Uploaded
            QC_B --> Frame_Making: QC Failed (Remediate Frame)
            QC_B --> Upholstery: QC Failed (Remediate Fabric)
        }
    }

    Confirmed --> Production: confirmOrderItem()

    state "Exception / Hold States" as Exceptions {
        Production --> Blocked: Block Item (Material, Approval, Worker, Payment)
        Blocked --> Production: Resolve Block (Unblock API)
        Production --> OnHold: Pause Production
        OnHold --> Production: Resume Production
    }

    Dispatch_A --> PartialDispatch: Some items dispatched
    Dispatch_B --> PartialDispatch: Some items dispatched
    
    Dispatch_A --> Completed: All items dispatched
    Dispatch_B --> Completed: All items dispatched
    PartialDispatch --> Completed: Remaining items dispatched

    Completed --> [*]
```

---

## 5. Layer 4: Entity Relationships & Relational Schema

```mermaid
erDiagram
    USERS ||--o{ ORDERS : "owns / manages"
    USERS ||--o{ ORDER_EVENTS : "acts in"
    USERS ||--o{ PAYMENT_LEDGER : "records"
    USERS ||--o{ QC_CHECKS : "inspects"

    CUSTOMERS ||--o{ ORDERS : "places"

    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ ORDER_STAGES : "has (Phase 1 legacy)"
    ORDERS ||--o{ DESIGN_FILES : "attaches"
    ORDERS ||--o{ PAYMENT_LEDGER : "billed against"
    ORDERS ||--o{ ORDER_EVENTS : "logs"

    ORDER_ITEMS ||--o{ ORDER_STAGES : "progresses through"
    ORDER_ITEMS ||--o{ ORDER_EVENTS : "item-level logs"

    ORDER_STAGES ||--o{ QC_CHECKS : "verified by"

    WORKERS ||--o{ ATTENDANCE : "logs daily"
    WORKERS ||--o{ WORKER_ADVANCES : "receives"

    ORDER_EVENTS ||--o{ NOTIFICATION_LOG : "triggers"

    USERS {
        uuid id PK
        string email
        string full_name
        string role "admin | manager"
        timestamp created_at
    }

    CUSTOMERS {
        uuid id PK
        string name
        string phone
        string address
        string notes
        timestamp created_at
    }

    ORDERS {
        uuid id PK
        string order_number "UK format e.g. LWC-2026-0042"
        uuid customer_id FK
        uuid owner_id FK
        string track "null for Phase 2; 'A' | 'B' for Phase 1"
        string status "draft | confirmed | in_production | on_hold | partial_dispatch | dispatched | completed"
        string current_stage_key
        boolean priority "Rush order flag"
        date delivery_date
        decimal quoted_amount
        timestamp deleted_at "Recycle bin flag"
        timestamp created_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        string name
        string track "'A' (Wood) | 'B' (Upholstery)"
        integer quantity
        decimal unit_price
        string status "in_production | on_hold | dispatched | completed"
        string current_stage_key
        string photo_url
        boolean blocked
        string blocked_reason
        timestamp blocked_at
        timestamp deleted_at
    }

    ORDER_STAGES {
        uuid id PK
        uuid order_id FK
        uuid order_item_id FK "null for Phase 1"
        string stage_key "carpentry | frame_making | polish | upholstery | qc_check | dispatch"
        integer sequence_position
        string status "pending | in_progress | complete | failed"
        boolean sanding_complete
        timestamp started_at
        timestamp completed_at
        string photo_url
    }

    QC_CHECKS {
        uuid id PK
        uuid order_stage_id FK
        uuid checked_by FK
        boolean passed
        jsonb checklist_json
        string failure_notes
        string photo_url
        timestamp checked_at
    }

    PAYMENT_LEDGER {
        uuid id PK
        uuid order_id FK
        decimal amount
        string payment_type "advance | partial | final"
        date payment_date
        string notes
        uuid recorded_by FK
    }

    WORKERS {
        uuid id PK
        string name
        string department "Carpentry, Polish, Upholstery"
        string phone
        boolean active
    }

    ATTENDANCE {
        uuid id PK
        uuid worker_id FK
        date date
        string status "present | absent"
        decimal shifts_worked "0, 1.0, 1.5 (OT), 2.0 (Double)"
    }

    WORKER_ADVANCES {
        uuid id PK
        uuid worker_id FK
        decimal amount
        date advance_date
        string status "pending | deducted"
    }

    ORDER_EVENTS {
        uuid id PK
        uuid order_id FK
        uuid order_item_id FK
        uuid actor_id FK
        string event_type "stage_change | blocked | unblocked | payment | qc_result | note"
        jsonb payload
        timestamp created_at
    }

    NOTIFICATION_LOG {
        uuid id PK
        uuid order_id FK
        uuid event_id FK
        string channel "telegram"
        string message_type
        text message_content
        string status "sent | failed"
        string error_message
        string telegram_message_id
    }
```

---

## 6. Layer 5: Non-Negotiable Invariants & Guardrails

### 1. FSM Sanding Invariant
- **Rule**: No stage can transition from `carpentry` (Track A) or `frame_making` (Track B) unless `sanding_complete === true`.
- **Enforcement**: Built directly into `src/lib/fsm/engine.ts` (`advanceStage` and `advanceOrderItem`). Bypassing this via raw DB updates is strictly forbidden as it violates factory quality standards.

### 2. QC Inspection Gate & Proof of Craft
- **Rule**: A stage cannot advance from `qc_check` to `dispatch` without a passing record in `qc_checks` that includes a verified `photo_url`.
- **Enforcement**: Validated in `advanceStage()` and `advanceOrderItem()`. If QC fails, the item is systematically demoted to a previous craft stage via `sendBackToStage()`, which automatically resets `sanding_complete` to `false`.

### 3. Phase 1 vs Phase 2 Separation
- **Phase 1 (Legacy)**: Single-item orders where `orders.track` is `'A'` or `'B'`, and `order_stages.order_item_id` is `null`.
- **Phase 2 (Multi-Item Canonical)**: `orders.track` is `NULL`. Individual items live in `order_items`, each having its own `track` (`'A'` or `'B'`) and linked `order_stages`. Order-level status is dynamically derived via `recalculateOrderStatus()`.
- **Guardrail**: Never assume `orders.track` is non-null. Always check `order.order_items?.length > 0` before rendering UI or mutating stages.

### 4. Next.js API Route Execution Mode (`force-dynamic`)
- **Rule**: Every API route handler that imports `createClient()` from `@/lib/supabase/server` **MUST** explicitly export:
  ```typescript
  export const dynamic = "force-dynamic";
  ```
- **Rationale**: Reading cookies/headers during static optimization triggers Next.js `DYNAMIC_SERVER_USAGE` errors, which break production builds on Vercel if caught in generic try/catch blocks.

### 5. Git Synchronization Protocol (Mandatory CLI Standard)
- **Rule**: Never run raw `git push`, `git add`, or `git commit`. Always execute:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\sync-git.ps1 "feat/fix: descriptive message"
  ```
  *(or `git sync "message"` via the configured Git alias)*.
- **Rationale**: `sync-git.ps1` atomically stages all files, commits on `main`, checks credentials, fast-forward merges into `dev`, and pushes both branches to GitHub in lockstep.

### 6. Service Role & Actor Audit Attribution
- **Rule**: Background engines (FSM, cron, event loggers) must use `createServiceRoleClient(actorId)` passing the active user's ID:
  ```typescript
  const supabase = createServiceRoleClient(actorId);
  ```
- **Rationale**: The database trigger `process_audit_log()` captures `x-user-id` from request headers to correctly attribute audit logs even when using service-role credentials.

### 7. Mobile-First Workshop Ergonomics (Anti-Friction)
- **Touch Targets**: All actionable buttons, inputs, and toggles must maintain a minimum touch target size of **44×44px** (Fitts's Law).
- **iOS Safari Auto-Zoom**: All text inputs must specify at least `text-base` (16px) font size to prevent mobile browser viewport auto-zooming.
- **Non-Blocking Feedback**: Native `window.alert()` and `window.confirm()` are completely banned in production; all feedback must use Sonner toasts (`toast.success()`, `toast.error()`) and tactile vibration via `triggerHaptic()`.

---

## 7. Environment Variables Reference

| Variable | Scope | Required | Purpose & Description |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | Yes | Supabase Project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Yes | Supabase Anonymous Client Key (governed by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Private (Server-only) | Yes | Supabase Secret Key (bypasses RLS for FSM transitions and audit logs) |
| `TELEGRAM_BOT_TOKEN` | Private (Server-only) | Optional | Telegram Bot API Token from @BotFather for push notifications |
| `TELEGRAM_CHAT_ID` | Private (Server-only) | Optional | Target Telegram Group / Channel ID for factory alerts |
| `NEXT_PUBLIC_APP_URL` | Public (Client & Server) | Optional | Canonical deployed web URL (e.g. `https://lwc-chi.vercel.app`) for deep links |

---

## 8. Development & Operational Commands

```powershell
# Install dependencies
npm install

# Run local development server
npm run dev

# Run type checking across entire codebase
npx tsc --noEmit

# Run Next.js linting
npm run lint

# Compile production bundle
npm run build

# Synchronize, commit, and push main + dev branches
powershell -ExecutionPolicy Bypass -File .\sync-git.ps1 "chore: update documentation"
```
