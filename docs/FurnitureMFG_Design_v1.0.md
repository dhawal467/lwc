# FurnitureMFG — Design System & UI/UX Specification
**Version:** 1.0  
**Status:** Locked for Phase 1 Build  
**Audience:** Solo Developer & AI Coding Agents (Kilo Code / DeepSeek V3)  
**Stack:** Next.js 14 + Tailwind CSS + shadcn/ui  

---

## 1. Design Philosophy & Aesthetic Direction

### 1.1 The Direction: Warm Soft Pop

FurnitureMFG is a daily-use operations tool for a furniture workshop. It must feel **professional but not sterile, fast but not cheap**. The aesthetic direction is **Warm Soft Pop** — a combination of:

- **Soft Pop:** Rounded corners, pillowy card shadows, gentle gradients, high readability, no harsh edges.
- **Warm Craft Palette:** Inspired by raw wood, linen, and workshop materials — off-whites, sandy neutrals, terracotta, amber — not the cold tech-blue of SaaS dashboards.
- **Bold but Focused Accents:** One primary accent (terracotta/amber) and one utility accent (electric blue for interactive states). No rainbow UI.
- **Purposeful Density:** The Kanban board and tables are information-dense; cards and forms are spacious. Match density to context.

### 1.2 Core Design Principles

| Principle | What It Means |
|---|---|
| **Mobile-First** | Every component is designed at 375px first. Desktop is an enhancement, not the baseline. |
| **Scannable at a Glance** | An owner checking the Kanban board on a phone between meetings must understand order status in under 3 seconds. |
| **Status is Always Visible** | Color, icon, and text all communicate status simultaneously (never color alone). |
| **Warm, Not Cold** | This is a human workshop, not a tech startup. The UI should feel like it belongs in that context. |
| **Errors are Forgettable** | Toasts disappear. Recycle bins exist. The UI should not feel like a minefield. |

---

## 2. Design Tokens

All tokens are defined as CSS custom properties on `:root` (light) and `.dark` (dark mode). Tailwind config extends these via `var(--token-name)`.

### 2.1 Color Palette

#### Light Mode (`:root`)

```css
:root {
  /* Backgrounds */
  --color-bg:           #F7F4F0;   /* Warm linen — main app background */
  --color-surface:      #FFFFFF;   /* Pure white — cards, modals, sidebars */
  --color-surface-raised: #FDFCFB; /* Subtle lift — hover states, dropdowns */
  --color-border:       #E8E2DA;   /* Warm gray border */
  --color-border-focus: #C4703F;   /* Primary color on focused inputs */

  /* Brand Primary — Terracotta / Warm Amber */
  --color-primary:      #C4703F;   /* Main CTA, active states */
  --color-primary-hover:#B0602F;   /* Button hover */
  --color-primary-soft: #F5E6DB;   /* Chip backgrounds, highlight fills */
  --color-primary-text: #FFFFFF;   /* Text on primary backgrounds */

  /* Accent — Electric Blue (interactive utility) */
  --color-accent:       #4F7BE8;   /* Links, focus rings, secondary actions */
  --color-accent-hover: #3A67D4;
  --color-accent-soft:  #E3ECFC;   /* Accent chip backgrounds */

  /* Semantic — Status Colors */
  --color-success:      #3BAC6F;
  --color-success-soft: #E2F5EC;
  --color-warning:      #E5A220;
  --color-warning-soft: #FEF4DC;
  --color-danger:       #DC4B3E;
  --color-danger-soft:  #FDECEA;
  --color-info:         #4F7BE8;
  --color-info-soft:    #E3ECFC;

  /* Text */
  --color-text-primary:   #1C1917;   /* Headings, labels */
  --color-text-secondary: #6B6560;   /* Descriptions, subtext */
  --color-text-muted:     #A39E98;   /* Placeholders, disabled */
  --color-text-inverse:   #FFFFFF;   /* Text on dark/primary backgrounds */

  /* Shadows */
  --shadow-xs:  0 1px 2px 0 rgba(28, 25, 23, 0.05);
  --shadow-sm:  0 2px 8px 0 rgba(28, 25, 23, 0.08);
  --shadow-md:  0 4px 16px 0 rgba(28, 25, 23, 0.10);
  --shadow-lg:  0 8px 32px 0 rgba(28, 25, 23, 0.12);
  --shadow-pop: 0 4px 20px 0 rgba(196, 112, 63, 0.20);  /* Primary color glow */
}
```

#### Dark Mode (`.dark`)

```css
.dark {
  /* Backgrounds */
  --color-bg:           #141210;   /* Near-black, warm tint */
  --color-surface:      #1E1B18;   /* Card surfaces */
  --color-surface-raised: #252118; /* Elevated elements */
  --color-border:       #302B25;   /* Warm dark border */
  --color-border-focus: #D4865A;

  /* Brand Primary — Slightly lighter for dark mode readability */
  --color-primary:      #D4865A;
  --color-primary-hover:#E0976A;
  --color-primary-soft: #2C1E14;
  --color-primary-text: #FFFFFF;

  /* Accent */
  --color-accent:       #6B93F0;
  --color-accent-hover: #7EA3F5;
  --color-accent-soft:  #1A2340;

  /* Semantic */
  --color-success:      #4EC47D;
  --color-success-soft: #0F2A1A;
  --color-warning:      #F0B340;
  --color-warning-soft: #251A03;
  --color-danger:       #F06060;
  --color-danger-soft:  #270F0F;
  --color-info:         #6B93F0;
  --color-info-soft:    #1A2340;

  /* Text */
  --color-text-primary:   #F2EDE8;
  --color-text-secondary: #9E978F;
  --color-text-muted:     #6B6460;
  --color-text-inverse:   #1C1917;

  /* Shadows */
  --shadow-xs:  0 1px 2px 0 rgba(0, 0, 0, 0.20);
  --shadow-sm:  0 2px 8px 0 rgba(0, 0, 0, 0.30);
  --shadow-md:  0 4px 16px 0 rgba(0, 0, 0, 0.35);
  --shadow-lg:  0 8px 32px 0 rgba(0, 0, 0, 0.40);
  --shadow-pop: 0 4px 20px 0 rgba(212, 134, 90, 0.25);
}
```

#### FSM Stage Color Map (Fixed — Both Modes)

These are applied as `data-stage` attribute styles on stage pills and Kanban column headers. They must be distinguishable in both modes.

| Stage Key | Light Mode | Dark Mode | Label |
|---|---|---|---|
| `carpentry` | `#E5A220` bg / `#7A4F00` text | `#F0B340` bg / `#1A1000` text | 🪵 Carpentry |
| `frame_making` | `#C4703F` bg / `#FFFFFF` text | `#D4865A` bg / `#FFFFFF` text | 🔧 Frame Making |
| `sanding` | `#E8C97A` bg / `#6B4A00` text | `#C9A84C` bg / `#1A1000` text | 〰 Sanding |
| `polish` | `#A78BFA` bg / `#FFFFFF` text | `#C4B5FD` bg / `#1A1040` text | ✨ Polish |
| `upholstery` | `#2DD4BF` bg / `#003D38` text | `#5EEAD4` bg / `#003D38` text | 🛋 Upholstery |
| `qc_check` | `#4F7BE8` bg / `#FFFFFF` text | `#6B93F0` bg / `#0A1540` text | ✅ QC Check |
| `dispatch` | `#3BAC6F` bg / `#FFFFFF` text | `#4EC47D` bg / `#052015` text | 🚚 Dispatch |

#### Order Status Badge Color Map

| Status | Color Token | Icon |
|---|---|---|
| `draft` | `--color-text-muted` | ○ |
| `confirmed` | `--color-info` | ◑ |
| `in_production` | `--color-warning` | ⬤ |
| `on_hold` | `--color-warning` | ⏸ |
| `qc_passed` | `--color-success` | ✓ |
| `completed` | `--color-success` | ✓✓ |
| `cancelled` | `--color-danger` | ✕ |

---

### 2.2 Typography

#### Font Stack

```css
/* Load from Google Fonts — include in app/layout.tsx */
/* Bricolage Grotesque: Headings */
/* Plus Jakarta Sans: Body */
/* JetBrains Mono: Order IDs, numeric data */

@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Bricolage Grotesque', sans-serif;
  --font-body:    'Plus Jakarta Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

**Why these fonts:**
- **Bricolage Grotesque** — distinctive, wide-set, slightly crafted feel. Feels designed, not default. Perfect for dashboard headings.
- **Plus Jakarta Sans** — warm humanist grotesque. High legibility at small sizes on mobile. Not as overused as Inter.
- **JetBrains Mono** — for `ORD-105` order IDs, quoted amounts, and any numeric codes. Monospaced keeps columns aligned.

#### Type Scale

All sizes use `rem` based on 16px root.

| Token | `font-size` | `line-height` | `font-weight` | `font-family` | Usage |
|---|---|---|---|---|---|
| `--text-display-lg` | 2.25rem (36px) | 1.15 | 700 | Display | Page hero titles (Dashboard heading) |
| `--text-display` | 1.75rem (28px) | 1.20 | 600 | Display | Section titles, modal headings |
| `--text-xl` | 1.25rem (20px) | 1.30 | 600 | Body | Card titles, form group headers |
| `--text-lg` | 1.125rem (18px) | 1.40 | 500 | Body | Emphasized body text |
| `--text-base` | 1rem (16px) | 1.55 | 400 | Body | Default body text, form labels |
| `--text-sm` | 0.875rem (14px) | 1.55 | 400 | Body | Secondary text, table rows |
| `--text-xs` | 0.75rem (12px) | 1.50 | 500 | Body | Badges, timestamps, captions |
| `--text-mono` | 0.875rem (14px) | 1.55 | 500 | Mono | Order IDs, amounts |
| `--text-mono-sm` | 0.75rem (12px) | 1.50 | 400 | Mono | Secondary IDs |

#### Typography Rules

- **Headings never exceed 2 lines** on any viewport. Use `text-truncate` or rethink copy if it wraps.
- **Order IDs (`ORD-105`) always render in `--font-mono`** — no exceptions. This is a locked rule.
- **Currency amounts always render in `--font-mono`** — for alignment in tables and payment cards.
- **Maximum line length (body text): 72 characters / `max-w-prose`** — for paragraphs, descriptions, form helper text.
- **Avoid uppercase for body text.** Use it only for section labels (`OVERDUE`, `ACTIVE`) at `--text-xs` with `letter-spacing: 0.08em`.

---

### 2.3 Spacing Scale

Use Tailwind's default 4px base scale. The following are the primary spacing values used across the app:

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `space-1` | 4px | `p-1` | Internal chip padding |
| `space-2` | 8px | `p-2` | Tight component padding |
| `space-3` | 12px | `p-3` | Default button padding (vertical) |
| `space-4` | 16px | `p-4` | Default card padding (mobile) |
| `space-5` | 20px | `p-5` | Form element spacing |
| `space-6` | 24px | `p-6` | Card padding (desktop) |
| `space-8` | 32px | `p-8` | Section gap |
| `space-12` | 48px | `p-12` | Page top padding |

**Rule:** Cards on mobile use `p-4`. On `md+` screens, cards use `p-6`.

---

### 2.4 Border Radius

```css
:root {
  --radius-sm:   6px;    /* Badges, small chips */
  --radius-md:   10px;   /* Buttons, inputs, small cards */
  --radius-lg:   16px;   /* Standard cards */
  --radius-xl:   20px;   /* Modals, bottom sheets */
  --radius-2xl:  28px;   /* Large hero cards, stat cards */
  --radius-full: 9999px; /* Pills, avatar circles, toggle switches */
}
```

**Rule:** The UI leans large on radius. Default cards are `--radius-lg`. Never use `rounded-none` or `rounded-sm` on primary UI surfaces. This is the "soft" in soft pop.

---

### 2.5 Elevation & Shadows

Shadows use warm-tinted values (see color tokens). They create depth without looking cold.

| Level | Token | Usage |
|---|---|---|
| 0 | none | Flat backgrounds, table rows |
| 1 | `--shadow-xs` | Subtle inputs, secondary cards |
| 2 | `--shadow-sm` | Default card, sidebar |
| 3 | `--shadow-md` | Modals, dropdowns, floating elements |
| 4 | `--shadow-lg` | Bottom sheets, tooltips on top |
| Pop | `--shadow-pop` | Primary CTA button hover, priority-tagged Kanban cards |

**Rule:** Never stack multiple shadows. Use one level per element. Priority Kanban cards use `--shadow-pop` instead of the regular card shadow.

---

### 2.6 Motion & Animation

All transitions are `ease-out` unless the element is leaving (use `ease-in` for exit).

```css
:root {
  --duration-fast:   120ms;   /* Hover states, color shifts */
  --duration-base:   200ms;   /* Button presses, card expand */
  --duration-slow:   350ms;   /* Modal enter, page transitions */
  --duration-lazy:   500ms;   /* Toast slide, bottom sheet */
  --ease-out:   cubic-bezier(0.0, 0, 0.2, 1);
  --ease-in:    cubic-bezier(0.4, 0, 1, 1);
  --ease-spring:cubic-bezier(0.34, 1.56, 0.64, 1); /* Slight overshoot pop */
}
```

#### Animation Rules

- **Kanban card aging color** (turns red at 2 days): Use a CSS transition `background-color` at `--duration-slow`. Never flash instantly.
- **Toast notifications** slide in from the bottom-right (desktop) or bottom-center (mobile) using `translateY` + `opacity`.
- **Modals / Bottom Sheets** scale from `scale(0.96) opacity(0)` to `scale(1) opacity(1)` using `--duration-slow + --ease-spring`.
- **Stage advance button** after click: brief `scale(0.95)` press animation, then success state.
- **No looping animations** on static content. No bouncing spinners on loaded data.
- **Skeleton loaders** use a shimmer animation (left-to-right gradient sweep). Use for: Kanban board, Dashboard stat cards, Order list.
- **Reduced motion:** All animations must respect `prefers-reduced-motion: reduce`. Wrap all keyframe animations inside `@media (prefers-reduced-motion: no-preference)`.

---

## 3. Theming & Dark Mode

### 3.1 Implementation

Use `next-themes` for dark mode management.

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- Theme class is applied on `<html>` as `class="dark"`.
- Tailwind config: `darkMode: 'class'`.
- Theme preference is persisted in `localStorage`.
- Default: `system` (follows OS preference).

### 3.2 Theme Toggle Component

A compact toggle placed in the **top-right of the sidebar header** (desktop) and **settings page** (mobile). Use a sun/moon icon toggle — not a dropdown. Animate the icon swap with a `rotate + scale` transition at `--duration-base`.

```tsx
// components/ui/ThemeToggle.tsx
// Sun icon (light mode) / Moon icon (dark mode)
// Uses useTheme() from next-themes
// Accessible: aria-label="Toggle theme"
```

### 3.3 Dark Mode Design Rules

- **Never use pure black (#000000).** The darkest surface is `#141210`. Pure black feels dead.
- **Borders must be visible in dark mode.** Use `--color-border` — don't rely on shadows alone for dark mode separation.
- **Images and design file thumbnails** use a subtle `brightness(0.92)` filter in dark mode to reduce eye strain.
- **Priority badge (admin-only)** uses `--color-warning` in both modes. Must be clearly visible against both dark and light card backgrounds.

---

## 4. Responsive Breakpoints & Layout Grid

### 4.1 Breakpoints

Follow Tailwind defaults (mobile-first):

| Breakpoint | Min Width | Target Device |
|---|---|---|
| `xs` (default) | 0px | Small phones (375px — iPhone SE) |
| `sm` | 640px | Large phones (iPhone Pro Max) |
| `md` | 768px | Tablets (iPad portrait) |
| `lg` | 1024px | Tablets landscape / Small laptops |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

**Design baseline:** 375px viewport for mobile. All UI must be fully functional and non-overflowing at 375px.

### 4.2 Layout Structure

The app uses a **Persistent Sidebar + Main Content Area** layout.

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px) │  Main Content Area               │
│  [Desktop only]  │  [Full width on mobile]           │
│                  │                                   │
│  Logo + Nav      │  Page Header                      │
│  Links           │  ─────────────────────────        │
│                  │  Page Content                     │
│  ─────────────   │                                   │
│  User Avatar     │                                   │
│  + Role Label    │                                   │
└─────────────────────────────────────────────────────┘
```

**Mobile:** Sidebar collapses into a **bottom navigation bar** with icons + labels (max 5 items). A hamburger icon in the top-left opens a full-screen nav drawer when needed for secondary links.

**Tablet (`md`):** Sidebar collapses to **icon-only mode** (64px wide). Hover reveals labels as tooltips.

**Desktop (`lg+`):** Full sidebar at 240px.

### 4.3 Content Width

```
Max content width: 1280px (centered, `max-w-7xl mx-auto`)
Content horizontal padding: px-4 (mobile) → px-6 (md) → px-8 (xl)
```

**Exception:** The Kanban Board ignores max-width and uses full viewport width with horizontal scroll on overflow.

---

## 5. Core Component Library

### 5.1 Buttons

Four variants. All use `--radius-md` and `--font-body` at `--text-base`.

```
Primary:   bg-primary, text-white, hover:bg-primary-hover, shadow-pop on hover
Secondary: bg-surface, border border-border, text-text-primary, hover:bg-surface-raised
Ghost:     transparent, text-text-secondary, hover:bg-surface-raised (no border)
Danger:    bg-danger-soft, text-danger, hover:bg-danger hover:text-white
```

**Sizes:**
- `sm`: `h-8 px-3 text-sm` — used in table rows, card actions
- `md` (default): `h-10 px-4 text-base`
- `lg`: `h-12 px-6 text-base` — used in forms, primary CTAs

**Rules:**
- Primary buttons have `--shadow-pop` on hover and a `scale(0.98)` press state.
- All buttons show a loading spinner (replacing the icon/text) during async actions. Never disable + show no feedback.
- Icon-only buttons must have `aria-label`. Use `--radius-md` (not full).
- **Advance Stage** button: Primary variant with a right-arrow icon. Disabled state (gray, `cursor-not-allowed`) when FSM gate is not cleared (sanding not done, QC not passed).

### 5.2 Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 1rem; /* p-4 mobile, p-6 desktop */
}
```

**Variants:**
- **Default Card:** Standard surface card for content sections.
- **Stat Card (Dashboard):** Larger radius `--radius-2xl`, accent-colored left border (3px), larger heading. Contains: label, big number, trend indicator.
- **Kanban Card:** Compact, `--radius-lg`, full-bleed stage color stripe on top (4px height). Priority cards add `--shadow-pop`.
- **Kanban Card (Aging / Overdue):** `border-color: var(--color-danger)`, danger-soft background tint, danger-colored clock icon. This is the visual aging alert — **no SMS needed**.

### 5.3 Badges & Status Pills

Two types: **Stage Badge** (colored per FSM stage) and **Status Badge** (order-level status).

```
Stage Badge:  rounded-full, px-2.5 py-0.5, text-xs font-medium
              Background + text color from FSM Stage Color Map (§2.1)

Status Badge: rounded-full, px-2.5 py-0.5, text-xs font-medium
              Background: --color-{semantic}-soft
              Text:       --color-{semantic}
              Icon:       12px icon left of text label
```

**Priority Tag:** A special pill used only for priority orders.
```
bg: --color-warning-soft  (light) / --color-warning-soft (dark)
text: --color-warning
icon: ⚡ (Zap icon, 12px)
label: "PRIORITY"
font: text-xs font-semibold tracking-wide uppercase
```

### 5.4 Inputs & Form Fields

```css
.input {
  height: 40px; /* h-10 */
  padding: 0 12px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-text-primary);
  transition: border-color var(--duration-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-soft); /* Focus ring */
}
```

- Textarea: Same styles, `min-height: 100px`, `resize-y`.
- Select: Custom styled (no native browser arrow). Use a Chevron-Down icon.
- Disabled state: `opacity-50 cursor-not-allowed bg-surface-raised`.
- Error state: `border-color: var(--color-danger)`, helper text in `--color-danger` below the field.
- All form fields have a `<label>` rendered in `text-sm font-medium text-text-secondary` above the input.

### 5.5 Modal / Dialog

Used for: new order creation, customer creation, QC confirmation prompts, recycle bin restore confirmation.

```
Max width: 560px (sm screens: full-width as bottom sheet)
Border radius: --radius-xl
Background: --color-surface
Shadow: --shadow-lg
Backdrop: rgba(0,0,0,0.4) blur(4px)

Enter animation: scale(0.96) opacity(0) → scale(1) opacity(1) at --duration-slow --ease-spring
Exit animation: scale(0.96) opacity(0) at --duration-base --ease-in
```

On **mobile** (`< md`): Modals render as **Bottom Sheets** — slide up from the bottom, `rounded-t-2xl`, max-height 90dvh with internal scroll.

### 5.6 Toast Notifications

Use `sonner` library (works with shadcn/ui).

```
Position: bottom-right (desktop), bottom-center (mobile)
Duration: 4 seconds (success/info), 6 seconds (warning/error)
Enter: translateY(16px) opacity(0) → translateY(0) opacity(1)
Types: success (green), error (red), warning (amber), info (blue)
```

**Standard Toast Messages:**
- Stage advanced: `"✓ Order moved to [Stage Name]"`
- QC passed: `"✓ QC Passed — ready for dispatch"`
- QC failed: `"✗ QC Failed — order sent back to [Stage]"`
- Order deleted: `"Order moved to Recycle Bin"` + Undo action link
- Upload complete: `"Design file uploaded (342 KB)"`

### 5.7 Data Tables

Used for: Order lists, Worker directory, Stock register, Customer list.

```
Header row: bg-surface-raised, text-xs uppercase tracking-wide text-text-muted
Data rows:  bg-surface, hover:bg-surface-raised, border-b border-border
Row height: 52px (desktop), 60px (mobile swipe-list variant)
```

- **Mobile:** Tables transform into **swipe-list cards** — each row becomes a small card with primary info visible, secondary info hidden behind a tap-to-expand chevron.
- **Sticky header:** Table header is sticky on scroll.
- **Empty state:** Centered illustration + heading + optional CTA button.
- **Order Number column:** Always renders in `--font-mono` with primary color text and subtle `--color-primary-soft` background pill.

### 5.8 Skeleton Loaders

Used during data fetching. Match the exact layout of the loaded state.

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-border) 0%,
    var(--color-surface-raised) 50%,
    var(--color-border) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

### 5.9 Empty States

Every list/board must have a designed empty state (not a blank screen).

**Structure:**
```
[Icon — 48px, --color-text-muted]
[Heading — text-xl, --font-display]
[Description — text-sm, --color-text-secondary, max-w-xs centered]
[Optional CTA Button]
```

**Examples:**
- No orders: `📋 "No orders yet" / "Create your first order to get started" / [+ New Order]`
- Empty Kanban column: subtle dashed border card `"No orders in this stage"`
- Empty Recycle Bin: `🗑️ "Recycle Bin is empty" / "Deleted orders appear here for 30 days"`

---

## 6. Navigation & Layout Components

### 6.1 Sidebar (Desktop)

```
Width: 240px (expanded), 64px (icon-only tablet)
Background: --color-surface
Border-right: 1px solid --color-border
Position: fixed left-0, full height

Logo area (top): 64px height
  - App logo/wordmark: "FurnitureMFG" in --font-display font-semibold
  - Below wordmark: "Laxmi Wood Craft" in text-xs text-muted

Navigation links:
  - Each link: h-10, px-3, rounded-md, flex items-center gap-3
  - Icon: 20px (Lucide icons)
  - Label: text-sm font-medium
  - Active state: bg-primary-soft, text-primary, icon in primary color
  - Hover state: bg-surface-raised

Nav sections:
  1. [Production] — Dashboard, Kanban Board, Orders
  2. [People] — Workers, Attendance
  3. [Settings] — Settings (admin only: Recycle Bin)

User profile (bottom):
  - Avatar (initials-based, primary bg), name, role label
  - Logout button (ghost, text-danger on hover)
```

### 6.2 Bottom Navigation (Mobile)

```
Position: fixed bottom-0, full width
Height: 60px + safe-area-inset-bottom
Background: --color-surface
Border-top: 1px solid --color-border
Backdrop-filter: blur(12px)  ← frosted glass effect
Background: rgba(surface-rgb, 0.92)  ← semi-transparent

5 items (icon + label, text-xs):
  🏠 Home | 📋 Kanban | 📦 Orders | 👥 Workers | ⚙ More
Active: icon and label in --color-primary
Inactive: --color-text-muted
```

### 6.3 Page Header

Every page has a consistent header structure:

```
Desktop:
  Left: [Page Title in --font-display text-display] + [breadcrumb in text-sm text-muted below]
  Right: [Primary action button, e.g. "+ New Order"]

Mobile:
  Left: [Page Title, text-xl]
  Right: [Icon-only primary action button]

Below header: optional filter bar or tab bar
```

---

## 7. Page-by-Page Design Specifications

### 7.1 Login Page

The only public route. No sidebar.

**Layout:**
```
Full screen centered layout (flex items-center justify-center min-h-screen)
Background: --color-bg with a subtle radial gradient overlay (primary-soft at center, fading out)

Card: max-w-sm w-full, --radius-2xl, --shadow-lg, p-8
  Top: App logo (SVG, 48px) + "FurnitureMFG" in display font, centered
  Sub: "Laxmi Wood Craft Operations" in text-sm text-muted, centered
  Form:
    - Email input
    - Password input (with show/hide toggle)
    - "Sign in" primary button (full width)
  Footer: "v1.0 · Laxmi Wood Craft" in text-xs text-muted
```

**Rule:** No "Register" link. No "Forgot password" link on the main UI (admin handles user creation via Supabase dashboard). Keep it clean.

---

### 7.2 Owner Dashboard (`/`)

**Layout:** 2-column grid on desktop (`lg:grid-cols-3`), single column on mobile.

**Stat Cards Row (always 2 per row on mobile, 4 on desktop):**
```
Card 1: Active Orders     — big number, blue accent border
Card 2: Overdue Orders    — big number, danger accent border (red glow if > 0)
Card 3: On Hold           — big number, warning accent border
Card 4: Outstanding (₹)   — amount in --font-mono, success accent border
```

Each stat card uses `--radius-2xl`, has a 3px left border in the accent color, and a subtle background tint matching the accent color (`--color-{semantic}-soft`).

**Kanban Summary Section:**
A horizontal scrollable row of mini stage-cards showing the count of orders in each stage. Clicking navigates to the full Kanban board filtered to that stage.

**Overdue Orders List:**
A compact list widget (not a table). Each item: order number (mono) + customer name + days overdue (red badge).

**Recent Orders List:**
Last 5 orders. Order number + customer + status badge + delivery date.

**Mobile:** All widgets stack vertically. Stat cards are 2×2 grid.

---

### 7.3 Master Production Board — Kanban (`/kanban`)

This is the most-used page in the app. Design it for speed and clarity.

**Layout:** Horizontal scrollable board. Columns = stages. On mobile, render as a **stage-tab layout** (tabs at top, one column visible at a time) instead of side scroll — side scroll is unusable on small phones.

**Column Header:**
```
Background: stage-color at 15% opacity (matches stage badge color)
Stage Badge (colored pill) + Stage name + order count badge
Width: 280px (desktop) / full viewport (mobile tab)
```

**Kanban Card:**
```
Width: 260px
Border-radius: --radius-lg
Background: --color-surface
Border: 1px solid --color-border
Shadow: --shadow-sm
Top strip: 4px full-width bar in stage color

Content (from top):
  Row 1: Order number (mono, primary text) + Priority badge (if applicable) [flex space-between]
  Row 2: Customer name (text-sm font-medium)
  Row 3: Item description (text-xs text-muted, truncate 1 line)
  Row 4: Track badge (Track A / Track B, text-xs) + Delivery date (text-xs)
  Row 5: Progress indicator — horizontal dots showing stage progress in this order's track

Aging Alert (if stalled > 2 days):
  Border: 1.5px solid --color-danger
  Background: --color-danger-soft (very subtle tint)
  Top-right corner: small clock icon in danger color + "Xd" overdue label
```

**Priority Card Additional Styling:**
```
Box shadow: --shadow-pop
Top strip: --color-warning (amber) instead of stage color
Background: very subtle --color-warning-soft tint
```

**Filter Bar (above board):**
```
Department dropdown: "All Departments" | "Carpentry" | "Upholstery" | "Polish" | "QC" | "Dispatch"
Track filter: "All Tracks" | "Track A (Wood)" | "Track B (Sofa)"
Search: Order number or customer name (inline, not a separate page)
```

---

### 7.4 Order List (`/orders`)

Standard data table with filter/search bar.

**Table columns:**
`Order #` | `Customer` | `Track` | `Current Stage` | `Status` | `Delivery Date` | `Priority` | `Actions`

- On mobile: collapses to card-list view. Primary info shown: order number, customer name, current stage badge, delivery date.
- "Actions" column: icon buttons — View (eye), Edit (pencil), Delete (trash, danger color).
- Delete action opens a confirmation dialog before soft-deleting.

---

### 7.5 Order Detail Page (`/orders/[id]`)

This is the most complex single page. Use a **two-panel layout on desktop** (left panel: details + files + actions; right panel: stage timeline).

**Left Panel:**
```
Section 1: Order Info Card
  - Order number (large, mono, primary), Customer name, Track badge, Status badge, Priority toggle (admin only)
  - Delivery date, Quoted amount (mono), Description
  - Edit button (pencil icon)

Section 2: FSM Action Card
  Current stage badge (large), sub-stage sanding checkbox (if applicable)
  [Advance Stage →] button (Primary, disabled if gate not cleared)
  [⏸ Put on Hold] button (Secondary)
  [✕ Cancel Order] button (Danger, ghost)
  [↩ Send Back to Stage] button (only shows if manager selects rework — opens a stage selector modal)

Section 3: QC Gate Card (only visible at qc_check stage)
  QC checklist items (with pass/fail toggles per item)
  Failure notes textarea (visible if any item failed)
  Mandatory photo upload
  [Submit QC] button

Section 4: Design Files
  Upload button + compressed image gallery (thumbnails, tap to expand lightbox)
```

**Right Panel (Stage Timeline):**
```
Vertical timeline component
Each node: circle (filled = completed, outline = pending, pulsing = active)
Stage name + status + timestamps (started_at, completed_at)
Completed stage nodes in --color-success
Active stage: pulsing primary-color ring animation
Failed stage (after rework): --color-danger node with rework indicator
```

**Mobile:** Single column. Stage timeline collapses into a horizontal progress strip at the top of the page (dots only, tap to expand full timeline as a bottom sheet).

---

### 7.6 QC Check Form (`/orders/[id]/qc`)

A focused, single-purpose page.

```
Header: "QC Check — ORD-105" + customer name
Progress indicator: 2 steps (Checklist → Photo)

Step 1: Checklist
  Each item row: checkbox + item label (text-sm) + pass/fail toggle (green/red pill toggle)
  Items (hardcoded for Phase 1):
    - Surface finish smooth?
    - No visible gaps or cracks?
    - Dimensions match order?
    - Hardware fitted correctly?
    - Polish/paint even?
    - (Upholstery track only): Fabric taut and even?
  
  If any item failed: reveal a "Failure Notes" textarea below checklist
  
  Overall result badge: auto-calculated — PASS (all items ✓) or FAIL (any item ✗)

Step 2: Photo Upload
  Required. Shows a camera/upload prompt.
  After upload: thumbnail preview with checkmark overlay
  
[Submit QC Check] button → triggers advanceStage or rework modal
```

---

### 7.7 Workers Page (`/workers`)

**Worker Directory tab:**
Cards grid (2 columns mobile, 3+ desktop).
Each card: Avatar (initials, round, department-colored bg) + Name + Department + Phone + Active toggle.

**Attendance Grid tab:**
```
Matrix layout: Rows = Workers, Columns = Dates (last 30 days, horizontal scroll)
Each cell: P (Present) / A (Absent) / H (Holiday) — color coded
  P = success-soft bg
  A = danger-soft bg  
  H = muted bg
Tap a cell to toggle status
Row header: worker name (text-sm, sticky left)
Column header: date (text-xs, DD Mon format)
```

Mobile attendance: Swipe left/right on columns. Current date column is always visible and highlighted.

---

### 7.8 Recycle Bin (`/orders/recycle-bin`)

**Admin-only page** — visible in sidebar only for Admin role.

```
Page header: "Recycle Bin" + warning text: "Orders are permanently deleted after 30 days"

List of soft-deleted orders (table/card format):
  - Order number (mono, muted — not clickable)
  - Customer name
  - Deleted by + Deleted at
  - Days remaining before permanent deletion (red if < 7 days)
  - [Restore] button (success color)
  - [Delete Permanently] button (danger, admin only)

Empty state: 🗑️ "Recycle bin is empty"
```

---

### 7.9 Settings Page (`/settings`)

Single-column layout, max-w-lg.

```
Section 1: Profile
  - Full name (editable)
  - Email (read-only)
  - Role label (read-only badge)

Section 2: Security
  - Change password form

Section 3: Appearance
  - Theme toggle (Light / Dark / System)

Section 4: Export (moved here from dashboard)
  - Export Orders CSV
  - Export Customers CSV

Section 5 (Admin only): Danger Zone
  - Card with red border
  - "Empty Recycle Bin" action (with confirmation dialog)
```

---

## 8. Icon System

**Library:** Lucide React (already part of shadcn/ui ecosystem).

**Standard Icon Sizes:**
- `16px` — Inline text icons, badge icons
- `20px` — Navigation, button icons
- `24px` — Empty state icons (scaled up for impact in empty state: 48px)

**Stroke width:** `1.5` (Lucide default). Do not change to `2` — it looks too heavy at small sizes.

**Icon + Text Spacing:** Always `gap-2` (8px) between icon and label.

**Key Icon Assignments (fixed — do not deviate):**

| Element | Icon |
|---|---|
| New Order | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Restore | `RotateCcw` |
| Advance Stage | `ArrowRight` |
| Send Back (Rework) | `CornerUpLeft` |
| On Hold | `PauseCircle` |
| Cancel Order | `XCircle` |
| Priority | `Zap` |
| QC Passed | `CheckCircle2` |
| QC Failed | `XCircle` |
| Design Upload | `ImagePlus` |
| Aging Alert | `Clock` |
| Export CSV | `Download` |
| Dispatch | `Truck` |
| Worker | `HardHat` |
| Settings | `Settings` |
| Recycle Bin | `Trash` |
| Dashboard | `LayoutDashboard` |
| Kanban | `Columns` |
| Orders | `ClipboardList` |
| Logout | `LogOut` |

---

## 9. FSM Visual Design — Locked Rules

### 9.1 Stage Advance Button States

The `[Advance Stage →]` button is the most critical interactive element. Its state must be unambiguous:

| Condition | Button State | Tooltip |
|---|---|---|
| Sanding not completed (if applicable) | Disabled, gray | "Mark sanding complete first" |
| QC not passed (at qc_check stage) | Disabled, gray | "Complete QC checklist first" |
| QC photo not uploaded | Disabled, gray | "Upload QC photo first" |
| All conditions met | Enabled, primary color | "Advance to [Next Stage Name]" |

### 9.2 Sanding Sub-Stage

Sanding is a **checkbox** inside the FSM Action Card, not a separate stage column.

```
UI:  [  ] Sanding Complete
     Check = sanding_complete = true in order_stages row
     Unchecked = advance button is disabled
     Label: "Sanding Complete" in text-sm
     Sublabel: "Required before advancing" in text-xs text-muted
```

The sanding checkbox is visible **only** at the `carpentry` and `frame_making` stages.

### 9.3 Rework Flow UI

When a manager clicks "Send Back to Stage" (after QC fail):

1. A modal opens: "Where should this order go back to?"
2. Shows only the eligible previous stages for the order's track (not dispatch/qc_check, not stages not yet reached)
3. Selecting a stage + clicking "Confirm Rework" triggers `sendBackToStage()`
4. The Kanban card moves back to the selected stage column with a 🔄 rework indicator badge on the card

### 9.4 On Hold Visual Treatment

An order that is `on_hold` appears on the Kanban board in its current stage column but with:
```
Card background: --color-warning-soft
Border: 1.5px solid --color-warning
Status badge: "On Hold" in warning color with PauseCircle icon
Advance button: Hidden (replaced by [▶ Resume] button)
```

### 9.5 Cancelled Order Treatment

Cancelled orders are removed from the Kanban board immediately. They remain in the Orders list with a "Cancelled" status badge. They are **not** soft-deleted to the recycle bin — they stay permanently visible in the list for records.

---

## 10. Accessibility Rules

- **Color is never the sole differentiator.** Every status badge has an icon + text label in addition to color.
- **Focus rings are always visible.** Use the `ring-2 ring-primary` Tailwind utility. Never `outline: none` without a replacement.
- **Tap targets are minimum 44×44px** on mobile. Inline icon buttons use `p-2` padding to meet this.
- **All images have `alt` text.** Design file thumbnails: `alt="Design file for ORD-{id}"`. QC photos: `alt="QC photo for ORD-{id}"`.
- **Form validation errors are announced** via `aria-describedby` linking the error message to the input.
- **Modals trap focus** while open. Close on `Escape` key. Return focus to trigger element on close.
- **Loading states communicate to screen readers** via `aria-busy="true"` on the loading container.
- **WCAG AA contrast minimum** must be met for all text. Do not use `--color-text-muted` for any content that carries meaning — use it only for decorative/supplementary text.

---

## 11. Implementation Rules for AI Coding Agents

These rules are **mandatory** and must be followed by every Kilo Code / DeepSeek V3 / Gemini Flash task.

### 11.1 Tailwind Configuration

The `tailwind.config.ts` must extend theme colors to map to CSS variables:

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      bg:             'var(--color-bg)',
      surface:        'var(--color-surface)',
      'surface-raised':'var(--color-surface-raised)',
      border:         'var(--color-border)',
      primary:        'var(--color-primary)',
      'primary-hover':'var(--color-primary-hover)',
      'primary-soft': 'var(--color-primary-soft)',
      accent:         'var(--color-accent)',
      'accent-soft':  'var(--color-accent-soft)',
      success:        'var(--color-success)',
      'success-soft': 'var(--color-success-soft)',
      warning:        'var(--color-warning)',
      'warning-soft': 'var(--color-warning-soft)',
      danger:         'var(--color-danger)',
      'danger-soft':  'var(--color-danger-soft)',
      'text-primary': 'var(--color-text-primary)',
      'text-secondary':'var(--color-text-secondary)',
      'text-muted':   'var(--color-text-muted)',
    },
    fontFamily: {
      display: ['Bricolage Grotesque', 'sans-serif'],
      body:    ['Plus Jakarta Sans', 'sans-serif'],
      mono:    ['JetBrains Mono', 'monospace'],
    },
    borderRadius: {
      sm:   '6px',
      md:   '10px',
      lg:   '16px',
      xl:   '20px',
      '2xl':'28px',
    },
    boxShadow: {
      xs:  'var(--shadow-xs)',
      sm:  'var(--shadow-sm)',
      md:  'var(--shadow-md)',
      lg:  'var(--shadow-lg)',
      pop: 'var(--shadow-pop)',
    },
  }
}
```

### 11.2 Component File Conventions

```
components/
  ui/               ← shadcn/ui base components (do not edit directly)
  layout/           ← Sidebar, BottomNav, PageHeader, ThemeToggle
  kanban/           ← KanbanBoard, KanbanCard, KanbanColumn, DeptFilter
  orders/           ← OrderCard, OrderTable, StageTimeline, FsmControls, PriorityToggle
  qc/               ← QcChecklistForm, QcResultBadge, QcPhotoUpload
  dashboard/        ← StatCard, OverdueList, RecentOrders, StageSummaryStrip
  workers/          ← WorkerCard, AttendanceGrid
  shared/           ← EmptyState, SkeletonCard, StatusBadge, StageBadge, OrderIdChip
```

### 11.3 Hardcoded Design Constants

Create a `lib/design-constants.ts` file:

```ts
// lib/design-constants.ts

export const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  carpentry:    { bg: '#E5A220', text: '#7A4F00' },
  frame_making: { bg: '#C4703F', text: '#FFFFFF' },
  sanding:      { bg: '#E8C97A', text: '#6B4A00' },
  polish:       { bg: '#A78BFA', text: '#FFFFFF' },
  upholstery:   { bg: '#2DD4BF', text: '#003D38' },
  qc_check:     { bg: '#4F7BE8', text: '#FFFFFF' },
  dispatch:     { bg: '#3BAC6F', text: '#FFFFFF' },
}

export const STAGE_LABELS: Record<string, string> = {
  carpentry:    '🪵 Carpentry',
  frame_making: '🔧 Frame Making',
  sanding:      '〰 Sanding',
  polish:       '✨ Polish',
  upholstery:   '🛋 Upholstery',
  qc_check:     '✅ QC Check',
  dispatch:     '🚚 Dispatch',
}

export const STATUS_CONFIG = {
  draft:        { color: 'muted',   icon: 'Circle',      label: 'Draft' },
  confirmed:    { color: 'info',    icon: 'CircleDot',   label: 'Confirmed' },
  in_production:{ color: 'warning', icon: 'CircleDot',   label: 'In Production' },
  on_hold:      { color: 'warning', icon: 'PauseCircle', label: 'On Hold' },
  qc_passed:    { color: 'success', icon: 'CheckCircle2',label: 'QC Passed' },
  completed:    { color: 'success', icon: 'CheckCheck',  label: 'Completed' },
  cancelled:    { color: 'danger',  icon: 'XCircle',     label: 'Cancelled' },
} as const
```

### 11.4 Forbidden Patterns

AI agents must **never** implement:

- ❌ `font-family: Inter, Arial, system-ui` in any component (use `font-body` or `font-display` Tailwind classes)
- ❌ `border-radius: 0` or `rounded-none` on any card or button
- ❌ `color: red` hardcoded — use `text-danger` Tailwind class
- ❌ Inline `style={{ color: '#...' }}` for semantic colors — use CSS variable tokens
- ❌ `outline: none` without a visible `:focus-visible` alternative
- ❌ Hard-deleting orders from the frontend (`DELETE /orders/[id]`) — must use soft delete `PATCH`
- ❌ Showing a blank screen during loading — always implement skeleton or spinner
- ❌ Using `window.confirm()` for destructive action confirmations — use the custom modal

### 11.5 shadcn/ui Component Usage

Use shadcn/ui as the base component layer. The following components are approved:

`Button` | `Input` | `Textarea` | `Select` | `Checkbox` | `Dialog` | `Sheet` (for bottom sheets) | `Tabs` | `Badge` | `Avatar` | `Tooltip` | `DropdownMenu` | `Popover` | `Skeleton` | `Separator` | `ScrollArea`

All shadcn components must have their default styles overridden via `className` props to match the design tokens defined in this document. Do not modify the base shadcn component files directly.

---

## 12. Phase 2 & 3 Design Conventions (Preview)

When Phase 2 and Phase 3 features are built, they must follow these extension rules:

**Payment Tracking:** Payment amounts always in `--font-mono`. Use a `₹` prefix. Outstanding balance shown in `--color-danger`. Paid-in-full shown in `--color-success`.

**Stock Register:** Low-stock items visually flagged with `--color-warning-soft` row background + warning icon in the quantity cell.

**Analytics Charts:** Use `recharts` library. Chart colors map to the token system — do not use recharts default colors. Primary data series uses `--color-primary`. Secondary uses `--color-accent`.

**Product Catalog:** Card-grid layout (2 columns mobile, 3+ desktop). Each card shows product thumbnail, name, base price (mono), category badge.

---

*End of Document — FurnitureMFG Design System v1.0*  
*This document is the single source of truth for all UI/UX decisions. Any deviation requires explicit approval and a version bump.*
