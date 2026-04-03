# Tech Context: FurnitureMFG

This file contains the mandatory technical guardrails, quirks, and gotchas that apply to every sprint. They must be followed on every generation.

## Next.js & Supabase Quirks
- **RLS Safety:** Direct `INSERT`/`UPDATE` to `order_stages` from the React client is blocked by Row Level Security. Must use API route mutations.
- **Business Logic Boundary:** Business logic must NEVER live in the database. Supabase is strictly a dumb data store and auth layer; Next.js TypeScript owns 100% of the routing, state logic, and error handling. Transitions are explicitly handled in Next.js Server API routes.

## Frontend & Tailwind Rules
- **shadcn/ui Initialization Rule:** When adding a shadcn dependency (e.g., `button.tsx`), you MUST cleanly modify its internal Tailwind variants to mirror our Design Tokens (e.g., setting primary colors, `rounded-md` default radius). Do not rely solely on passing large class strings downstream to keep components clean.
- **Tailwind Dynamic Class Bug (Color Usage Rule):** FSM Stage colors (`STAGE_COLORS`) must be applied via the **React style prop** (e.g., `style={{ backgroundColor: STAGE_COLORS[stage].bg }}`), NOT dynamic Tailwind string classes (like `className={\`bg-[${STAGE_COLORS[stage].bg}]\`}`). Tailwind will purge any class that doesn't exist as a complete unbroken string at build time.
- **Touch Hover Bug:** Avoid sticky hover effects on mobile components. Use `active:scale-95` or `active:bg-opacity-80` for touch feedback instead.
- **CSS Variable Tokens:** Never use hardcoded hex colors; strictly use our mapped CSS variable theme tokens for all styling.
- **No Text Message APIs:** Zero text message API implementations. Aging indicators purely rely on visual changes on the React-Query hooks/cards (i.e. `< 2 Days elapsed => border-red`).
