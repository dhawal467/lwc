# Sprint 3 — Workers & Production UX Micro-Tasks
### Environment Context
- **Stack:** Next.js App Router, TailwindCSS, Supabase, React Query
- **Rule:** Every instruction must be atomic, precise, and verified before committing.

---

### Task 1: Dark Mode Hover Bug & Sidebar Navigation Labels
**Objective:** Fix the unreadable worker name bug in dark mode and ensure mobile sidebar labels are clearly visible.
**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/workers/page.tsx`.
2. Locate the attendance grid row (`<tr className="hover:bg-gray-50... group">`) and the sticky worker name column cell (`<td className="... bg-surface group-hover:bg-gray-50 ...">`).
3. Replace the hardcoded `bg-gray-50` hover states with semantic dark-mode aware tokens like `hover:bg-surface-raised` and `group-hover:bg-surface-raised`.
4. Open `src/components/layout/MobileNav.tsx`. Ensure the text label `<span>{item.name}</span>` has adequate contrast and size (e.g. `text-[10px]` -> `text-[11px]` and strong opacity). If there are visibility issues, correct them.
**Verification:** Run `npx tsc --noEmit` and confirm zero errors. Visually verify by running the app and testing dark mode hover on `/dashboard/workers`.
**Git Commit:** `git commit -m "fix(ui): resolve dark mode hover bug and improve mobile nav labels"`

---

### Task 2: Global Toast Notifications
**Objective:** Add `sonner` for toast notifications to provide immediate user feedback on mutations.
**Actionable Instructions:**
1. Run `npm install sonner`.
2. Open `src/app/layout.tsx`. Import `{ Toaster } from "sonner"` and add `<Toaster position="bottom-right" theme="system" />` just inside the `<body>` tag.
3. Open `src/components/orders/AddItemModal.tsx`, `src/components/orders/OrderItemCard.tsx`, and `src/app/(dashboard)/dashboard/workers/page.tsx`.
4. Import `{ toast } from "sonner"` and add `toast.success("...")` / `toast.error("...")` calls to the `onSuccess` and `onError` callbacks of all major mutations (e.g., adding items, advancing stages, marking attendance).
**Verification:** Run `npx tsc --noEmit`. Start the dev server and test a state mutation (e.g. toggle worker active status) to ensure a toast appears.
**Git Commit:** `git commit -m "feat(ui): integrate sonner toast notifications for global feedback"`

---

### Task 3: Finance Chart (Outstanding by Customer)
**Objective:** Implement a bar chart on the Finance page for visual scannability of outstanding balances.
**Actionable Instructions:**
1. Run `npm install recharts`.
2. Open `src/app/(dashboard)/dashboard/finance/page.tsx`.
3. Process the `financeData` to group outstanding amounts by customer name (an array of `{ name: "Customer X", outstanding: 15000 }`).
4. Import `{ BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer }` from `recharts` and render a chart at the top of the finance page.
**Verification:** Run `npx tsc --noEmit` and ensure no TypeScript errors regarding the recharts library or data processing.
**Git Commit:** `git commit -m "feat(finance): add outstanding by customer bar chart"`

---
## Use Claude
### Task 4: Workers DB Migration & API Updates
**Objective:** Extend the attendance table with a numeric `shifts_worked` column and make worker `department` optional.
**Actionable Instructions:**
1. Create a new migration file: `supabase/migrations/017_worker_shifts.sql`.
2. Insert the following SQL:
   ```sql
   ALTER TABLE public.workers ALTER COLUMN department DROP NOT NULL;
   ALTER TABLE public.attendance ADD COLUMN shifts_worked NUMERIC(3,1) CHECK (shifts_worked IN (0, 0.5, 1.0, 1.5, 2.0)) DEFAULT 0;
   ```
3. Run `supabase db push` to apply the migration.
4. Update `src/app/api/attendance/route.ts` to extract and save the `shifts_worked` field during UPSERT. Ensure the `onConflict` constraint remains `worker_id,date`.
5. Update `src/hooks/useWorkers.ts` to include `shifts_worked` in the `useMarkAttendance` mutation payload and fetch types.
**Verification:** Run a SQL query in Supabase (or via local pg) to confirm the new column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'shifts_worked';`. Run `npx tsc --noEmit`.
**Git Commit:** `git commit -m "feat(db): add shifts_worked column and make department optional"`

---

### Task 5: Worker Directory CRUD UI
**Objective:** Build UI to add, edit (name only), and delete (hard-delete) workers.
**Actionable Instructions:**
1. Create a new file `src/app/api/workers/[id]/route.ts` with a `DELETE` handler to hard-delete a worker (admin-only). (Note: the `PATCH` handler exists, but we need to ensure it handles name updates).
2. Open `src/app/(dashboard)/dashboard/workers/page.tsx`.
3. Add an "Add Worker" button that opens a simple modal requesting a Name (admin-only). Use the existing `POST /api/workers` endpoint.
4. Add "Edit" and "Delete" icons to the worker cards. Implement an inline edit or modal for the Name field using `PATCH`. Wire up the delete logic.
5. Apply `toast.success` and `toast.error` for all these operations.
**Verification:** Run `npx tsc --noEmit`. Test adding, renaming, and deleting a dummy worker.
**Git Commit:** `git commit -m "feat(workers): implement add, edit, and delete worker flows"`

---
## Use Claude
### Task 6: Attendance Grid Shift Stepper & Totals
**Objective:** Replace the binary P/A buttons with a shift stepper and add a daily totals row.
**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/workers/page.tsx`.
2. In the attendance tab, replace the `P/A` button with a shift button that displays the number (`0`, `1`, `1.5`, `2`). Clicking it should cycle the value: `0 -> 1 -> 1.5 -> 2 -> 0`.
3. Color-code the buttons (e.g., Grey for 0, Yellow for 1, Orange for 1.5, Green for 2).
4. Calculate daily column totals: create a `<tfoot>` row that iterates over the 7 days, sums up the `shifts_worked` for all workers on that day, and displays the sum.
**Verification:** Run `npx tsc --noEmit`.
**Git Commit:** `git commit -m "feat(ui): implement attendance grid shift stepper and daily totals"`

---

### Task 7: Worker Monthly Summary View
**Objective:** Implement a view to see a worker's total shifts for a given month.
**Actionable Instructions:**
1. Open `src/app/(dashboard)/dashboard/workers/page.tsx`.
2. Make the worker names clickable in the directory or attendance grid. Clicking opens a "Monthly Summary" modal.
3. Fetch attendance data for that specific `workerId` over the last 30 days (or current calendar month).
4. Display a summary metric: "Total Shifts Worked (Last 30 Days): XX".
**Verification:** Run `npx tsc --noEmit`.
**Git Commit:** `git commit -m "feat(workers): add worker monthly shift summary view"`
