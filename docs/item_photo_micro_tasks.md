# Item-Specific Photos — Micro Tasks

### Environment Context
- **Stack:** Next.js App Router, TailwindCSS, Supabase, React Query
- **Rule:** Every instruction must be atomic, precise, and verified before committing.
- **Storage:** Photos uploaded to existing `design-files` Supabase Storage bucket via `compressAndUpload()` from `src/lib/upload.ts`.

---

## Task 1: DB Migration — Add `photo_url` to `order_items`

**Objective:** Add a nullable `photo_url` text column to the `order_items` table.

**Actionable Instructions:**
1. Create a new file: `supabase/migrations/020_order_item_photo.sql`.
2. Insert the following SQL:
   ```sql
   ALTER TABLE public.order_items
     ADD COLUMN IF NOT EXISTS photo_url TEXT;
   ```
3. Run `supabase db push` to apply the migration.

**Verification:** Run `npx supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'photo_url';" --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` and confirm the column exists.

**Git Commit:** `git commit -m "feat(db): add photo_url column to order_items"`

---

## Task 2: Update TypeScript Types

**Objective:** Add the `photo_url` field to the `OrderItem` interface so all typed consumers are aware of it.

**Actionable Instructions:**
1. Open `types/index.ts`.
2. In the `OrderItem` interface, add the following line after `current_stage_key: string | null;` (line 64):
   ```ts
   photo_url: string | null;
   ```

**Verification:** Run `npx tsc --noEmit`. Zero new errors.

**Git Commit:** `git commit -m "feat(types): add photo_url to OrderItem interface"`

---

## Task 3: Update Item Creation API — Accept `photo_url`

**Objective:** Allow the POST endpoint for creating items to accept and persist the `photo_url` field.

**Actionable Instructions:**
1. Open `src/app/api/orders/[id]/items/route.ts`.
2. In the `POST` handler, destructure `photo_url` from the request body alongside the existing fields (line 42):
   ```ts
   const { name, track, description, unit_price, quantity, photo_url } = body;
   ```
3. Add `photo_url` to the `.insert()` call (after `quantity: qty,`):
   ```ts
   photo_url: photo_url || null,
   ```

**Verification:** Run `npx tsc --noEmit`. Zero new errors.

**Git Commit:** `git commit -m "feat(api): accept photo_url when creating order items"`

---

## Task 4: Update Kanban API — Prioritize Item Photo

**Objective:** When resolving the thumbnail for Phase 2 (item-level) Kanban cards, check the item's own `photo_url` first, before falling back to QC photos or parent order design files.

**Actionable Instructions:**
1. Open `src/app/api/kanban/route.ts`.
2. Locate the Phase 2 thumbnail resolution block (around line 123–129, the comment `// Resolve thumbnail`).
3. Replace the thumbnail resolution logic with the following priority:
   ```ts
   // Resolve thumbnail — item photo > QC photo > parent order design file
   let thumbnail_url = null;
   if (item.photo_url) {
     thumbnail_url = item.photo_url;
   } else if (currentStage.stage_key === 'qc_check' && currentStage.qc_checks && currentStage.qc_checks.length > 0) {
     thumbnail_url = currentStage.qc_checks[0].photo_url;
   } else if (parentOrder?.design_files && parentOrder.design_files.length > 0) {
     thumbnail_url = parentOrder.design_files[0].file_url;
   }
   ```
4. Also add `item_photo_url: item.photo_url || null,` to the object pushed into `groupedOrders` so the KanbanCard has direct access.

**Verification:** Run `npx tsc --noEmit`. Hit `/api/kanban` in browser — confirm the response structure is unchanged.

**Git Commit:** `git commit -m "feat(kanban): prioritize item photo_url in thumbnail resolution"`

---

## Task 5: AddItemModal — Photo Upload with Orphan Cleanup

**Objective:** Add a photo upload field to the Add Item modal. Upload happens on file select. If the user cancels the modal without submitting, delete the uploaded file from storage to prevent orphans.

**Actionable Instructions:**
1. Open `src/components/orders/AddItemModal.tsx`.
2. Add imports at the top:
   ```ts
   import { compressAndUpload } from "@/lib/upload";
   import { createClient } from "@/lib/supabase/client";
   import { ImagePlus, X } from "lucide-react";
   ```
3. Add new state variables inside the component (after the existing `useState` calls):
   ```ts
   const [photoFile, setPhotoFile] = useState<File | null>(null);
   const [photoUrl, setPhotoUrl] = useState<string | null>(null);
   const [photoUploading, setPhotoUploading] = useState(false);
   const [photoStoragePath, setPhotoStoragePath] = useState<string | null>(null);
   ```
4. In the `useEffect` that runs when `open` changes (the reset block), add these resets:
   ```ts
   setPhotoFile(null);
   setPhotoUrl(null);
   setPhotoUploading(false);
   setPhotoStoragePath(null);
   ```
5. Add a photo upload handler function:
   ```ts
   const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     setPhotoFile(file);
     setPhotoUploading(true);
     try {
       const path = `items/${orderId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
       const url = await compressAndUpload(file, path, "design-files");
       setPhotoUrl(url);
       setPhotoStoragePath(path);
     } catch (err) {
       alert("Photo upload failed. You can still add the item without a photo.");
       setPhotoFile(null);
       setPhotoUrl(null);
       setPhotoStoragePath(null);
     } finally {
       setPhotoUploading(false);
     }
   };
   ```
6. Add an orphan cleanup function that runs when the modal is cancelled:
   ```ts
   const cleanupOrphanPhoto = async () => {
     if (photoStoragePath) {
       try {
         const supabase = createClient();
         await supabase.storage.from("design-files").remove([photoStoragePath]);
       } catch {
         // Silent fail — orphan cleanup is best-effort
       }
     }
   };
   ```
7. Update the `onOpenChange` prop of the `<Dialog>` component to call cleanup when closing without submit:
   ```tsx
   <Dialog open={open} onOpenChange={(isOpen) => {
     if (!isOpen && photoStoragePath && !addOrderItem.isPending) {
       cleanupOrphanPhoto();
     }
     onOpenChange(isOpen);
   }}>
   ```
8. Also update the Cancel button's `onClick` to clean up:
   ```tsx
   onClick={() => {
     cleanupOrphanPhoto();
     onOpenChange(false);
   }}
   ```
9. In `handleSubmit`, include `photo_url` in the mutation payload:
   ```ts
   addOrderItem.mutate(
     {
       name: name.trim(),
       track,
       description: description.trim() || null,
       unit_price: unitPrice ? parseFloat(unitPrice) : null,
       quantity: quantity ? parseInt(quantity, 10) : 1,
       photo_url: photoUrl,
     },
     // ... onSuccess / onError callbacks unchanged
   );
   ```
10. Add the photo upload UI between the Description textarea and the Unit Price field (after line 156, before line 158). The UI should include:
    - A label "Reference Photo (Optional)".
    - If no photo is uploaded: a styled file input area with an `ImagePlus` icon and "Upload item photo" text.
    - If uploading: a loading spinner.
    - If uploaded: a small image preview (96x96, `object-cover`, `rounded-lg`) with an `X` button to remove. Removing should call `cleanupOrphanPhoto()` and reset photo state.

**Verification:** Run `npx tsc --noEmit`. Open the Add Item modal in the browser. Upload a photo, verify the preview appears. Cancel the modal, then check Supabase Storage to confirm the file was deleted. Re-open the modal, upload a photo, submit — confirm the item is created with the `photo_url` field set.

**Git Commit:** `git commit -m "feat(ui): add photo upload with orphan cleanup to AddItemModal"`

---

## Task 6: OrderItemCard — Show Item Thumbnail

**Objective:** Display a small thumbnail in the `OrderItemCard` header when the item has a `photo_url`, giving managers a quick visual reference on the order detail page.

**Actionable Instructions:**
1. Open `src/components/orders/OrderItemCard.tsx`.
2. In the header section (line 65–72, the `<div>` containing the item name, track badge, and status badge), add a thumbnail before the item name:
   ```tsx
   <div className="flex items-center gap-3">
     {item.photo_url && (
       <img
         src={item.photo_url}
         alt={item.name}
         className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0"
       />
     )}
     <h3 className="font-semibold text-text-primary text-base">{item.name}</h3>
     {/* ... existing track badge and status badge ... */}
   </div>
   ```

**Verification:** Open an order detail page that has an item with a `photo_url`. Confirm the 40x40 thumbnail appears in the card header. Confirm items without a photo still look normal (no empty space).

**Git Commit:** `git commit -m "feat(ui): show item thumbnail in OrderItemCard header"`

---

## Task 7: Final Verification & Push

**Objective:** Ensure everything works end-to-end and push all changes to GitHub.

**Actionable Instructions:**
1. Run `npx tsc --noEmit` — confirm zero errors.
2. Run `npm run lint` — confirm no new errors in the modified files.
3. Open the browser and test the full flow:
   - Navigate to an order detail page.
   - Click "Add Item" → upload a photo → verify preview → submit.
   - Confirm the item card on the order detail page shows the thumbnail.
   - Navigate to the Kanban board → confirm the new item's card shows its specific uploaded photo.
   - Re-open the modal → upload a photo → cancel → verify the file is deleted from Supabase Storage.
4. Push to GitHub:
   ```
   git push origin main
   ```

---

## Task Complexity Summary

| # | Task | Complexity | Estimated Effort |
|---|------|------------|------------------|
| 1 | DB Migration: Add `photo_url` | 🟢 Low | ~5 min |
| 2 | Update TypeScript types | 🟢 Low | ~2 min |
| 3 | Update item creation API | 🟢 Low | ~5 min |
| 4 | Update Kanban API thumbnail logic | 🟢 Low | ~10 min |
| 5 | AddItemModal photo upload + cleanup | 🟡 Medium | ~45 min |
| 6 | OrderItemCard thumbnail display | 🟢 Low | ~10 min |
| 7 | Final verification & push | 🟢 Low | ~15 min |

**Total Estimated Effort: ~1.5 hours**

### Recommended Execution Order
Sequential: 1 → 2 → 3 → 4 → 5 → 6 → 7 (each task depends on the previous).
