# Laxmi Wood Craft (LWC) — Workshop Operations Platform

> Cloud-native ERP & factory floor execution system for bespoke furniture manufacturing, dual-track production lifecycles, artisan payroll reconciliation, and stage-gated quality control.

---

## 🏗️ Architecture & Overview

LWC orchestrates bespoke furniture manufacturing from customer design handoff to dispatch. The system enforces strict quality standards at the machine level, manages artisan shifts and advances, and alerts workshop supervisors and clients in real time.

For an exhaustive architectural deep dive, entity relationship diagrams, and non-negotiable system invariants, see [**`PROJECT_MAP.md`**](./PROJECT_MAP.md).

### Core Capabilities

- **Dual-Track Finite State Machine (FSM)**:
  - **Track A (Solid Wood)**: `cad` ➔ `woodwork` ➔ `sanding` ➔ `polish` ➔ `packing`
  - **Track B (Upholstered)**: `cad` ➔ `woodwork` ➔ `sanding` ➔ `polish` ➔ `upholstery` ➔ `packing`
  - **Sanding Guard**: Enforces sanding verification before woodwork can advance to polish.
  - **Quality Control Gate**: Mandatory checklist and proof photo upload before advancing to packing/dispatch, with automatic rollback loops on failure (`sendBackOrderItemToStage`).
- **Artisan Wage & Cash Advance Settlement Ledger** (`/dashboard/workers/payroll`):
  - Calculates daily artisan wages based on shift multipliers (0x, 1x, 1.5x OT, 2x Double).
  - Automatically reconciles cash advances and calculates net payable and carryover balances.
  - Dual responsive interface: 7-column desktop table and 44px touch-friendly mobile cards.
- **Physical Job Card QR Scan-to-Advance** (`/print/items/[itemId]`):
  - Thermal / A4 printable production sheets with high-contrast vector QR code.
  - Camera scanning deep-links directly into the item view, auto-scrolling and highlighting the target card.
- **Customer Dispatch WhatsApp Alerts**:
  - One-click sanitized WhatsApp deep links (`wa.me`) for dispatch and milestone notifications with automated phone normalization (`+91`).
- **Structured Hardware & Materials Checklist**:
  - Gated hardware checklist verifying handles, hinges, and materials before stage advance to polish.
- **Telegram Notification Hub**:
  - Factory-floor alerts via Telegram Bot API with HTML templating and transactional retry queue.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14.2](https://nextjs.org/) (App Router, Server Components, Route Handlers)
- **Language**: TypeScript 5 (Strict Mode)
- **Database & Auth**: [Supabase](https://supabase.com/) PostgreSQL 15+ (Row Level Security, Cookie Auth, Audit Triggers)
- **Object Storage**: Supabase Storage (`design-files` bucket)
- **State & Data Fetching**: TanStack Query v5 (Optimistic mutations & invalidation)
- **Styling**: Tailwind CSS v3.4, Radix UI Primitives, Lucide Icons, Sonner Toasts
- **Testing**: Vitest v2.1.9, JSDOM, Testing Library
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`), Vercel Edge Platform

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- A Supabase project with database migrations applied

### 2. Installation
```bash
git clone https://github.com/dhawal467/lwc.git
cd lwc
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Application URL (for QR code and deep-link generation)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Telegram Notifications
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Testing

The repository maintains an automated unit and integration test suite (70 tests):

```bash
# Run Vitest test suite
npm test

# Run Vitest in watch mode
npm run test:watch

# TypeScript compiler validation
npx tsc --noEmit

# ESLint check
npm run lint

# Production Next.js build
npm run build
```

---

## 🔄 Git Synchronization Protocol

To ensure `main` and `dev` branches remain strictly synchronized and credential-verified, direct `git commit` and `git push` are discouraged. Always synchronize using the project script:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-git.ps1 "feat: your commit message"
```
