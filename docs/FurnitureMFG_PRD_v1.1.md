# **PRODUCT REQUIREMENTS DOCUMENT**
**FurnitureMFG — Managers-Only Operations Ledger**
**Version:** 2.0 (Master Build Blueprint)
**Status:** Locked for Phase 1 Build
**Stack:** Next.js 14 + Supabase + Vercel
**Audience:** Solo Developer & AI Coding Agents (Kilo Code)

---

## **1. Executive Summary**
FurnitureMFG is a proprietary cloud-based operations management system designed for a small-scale custom wooden furniture manufacturing unit (under 20 workers, <30 orders/month). 

**The Pivot:** Based on workshop realities, the system has explicitly pivoted away from being a "worker-facing" tablet app. It is now a **high-powered digital ledger strictly for Managers and the Owner**. Floor workers do not interact with the software. This zero-training-friction approach eliminates coordination chaos, prevents material stockouts, and gives the owner a real-time business overview without slowing down the factory floor.

## **2. Product Vision & Strategy**
*   **A Single Source of Truth:** Replace WhatsApp order specs, verbal task assignments, and mental memory with a unified digital database.
*   **The "No-API" Lean Approach:** Avoid expensive API integrations (Gupshup/Twilio) and complex background cron jobs. Rely on smart UI indicators (e.g., Kanban cards turning red) to drive manager behavior.
*   **Physical vs. Digital Sync:** The software must flawlessly mirror physical reality, including when things go wrong (e.g., failed QC, mid-production rework, cancelled orders).
*   **Protection from Human Error:** Built-in safeguards like Soft Deletes, Recycle Bins, and strict Role-Based Access Control (RBAC) to prevent managers from accidentally wiping data or hiding delays.

---

## **3. User Roles & Access Control (RBAC)**
The system features only **two active user roles**. Workers and supervisors are simply entities in the database directory; they do not get login credentials.

| Role | Device | Core Permissions | Restrictions |
| :--- | :--- | :--- | :--- |
| **Admin (Owner)** | Mobile / Web | Full Read/Write. View financial dashboards. | Only role allowed to toggle `Priority` on orders. Can empty the Recycle Bin. |
| **Production Manager** | Mobile / Web | Create orders, move FSM stages, upload designs, log QC. | Cannot toggle `Priority`. Cannot permanently delete orders. |

---

## **4. Core Architecture: The FSM Engine**
Every feature revolves around the Order Lifecycle Finite State Machine (FSM). 

### **4.1 Production Tracks**
Stage sequences are hardcoded in TypeScript; stage instances are written to the database.
*   **Track A (Standard Wood):** `carpentry → sanding → polish → qc_check → dispatch`
*   **Track B (Upholstery Sofa):** `frame_making → sanding → polish → upholstery → qc_check → dispatch`
*   *Note:* `sanding` is a boolean sub-stage of carpentry/frame_making. It must be checked before the main stage can advance.

### **4.2 The "Unhappy Paths" (Rework & Cancellation)**
*   **The Rework Loop (`sendBackToStage`):** If a product fails QC, the manager can digitally regress the order. The system marks the current stage as `failed`, resets the target previous stage (e.g., Upholstery) to `in_progress`, and updates the order's current stage key. This prevents breaking the timeline analytics.
*   **Mid-Flight Cancellations:** If an order is cancelled, the system automatically marks the active `order_stages` row as `cancelled` to immediately halt Kanban aging alerts.
*   **Material Hold:** `on_hold` is an order-level status, not a stage. If material is missing, the order goes `on_hold` but retains its current stage location.

---

## **5. Feature Requirements (The Lean Scope)**
Original features have been aggressively pruned to ensure solo-developer success. 

### **5.1 Core Production (Phase 1)**
1.  **Customer & Order Management:** Create/edit customers and custom orders.
2.  **Master Production Board (Kanban):** A single unified board for managers. Includes a simple "Filter by Department" dropdown instead of isolated department screens.
3.  **Job Card System (Sequential IDs):** Orders receive simple text IDs (e.g., ORD-105) written on physical tags. *(QR codes are scrapped).*
4.  **Worker Directory:** Simple database of workers and basic daily attendance grid.
5.  **Design File Uploads:** Managers upload WhatsApp design photos to the order. **Rule:** Frontend must aggressively compress all images using `browser-image-compression` (<500KB) before uploading to Supabase Storage.
6.  **Priority Tagging:** Visual tag to expedite orders. **Rule:** Only the Admin/Owner can toggle this to prevent abuse.
7.  **Visual Aging Alerts:** Kanban cards turn red if stalled in a stage for >2 days. *(SMS/WhatsApp APIs are scrapped).*
8.  **QC Check Module:** Mandatory digital pass/fail checklist at the QC gate. **Rule:** Cannot move to Dispatch without a passed QC and a mandatory compressed photo upload.
9.  **Owner Dashboard:** High-level aggregation of active orders, outstanding payments, and delayed jobs.
10. **Data Export:** 1-click CSV export for offline backup/accounting.
11. **The 30-Day Recycle Bin:** Orders deleted in the UI are soft-deleted (`deleted_at` timestamp) and moved to a Recycle Bin for 30 days, allowing managers to recover accidental misclicks.

### **5.2 Financials & Inventory (Phase 2)**
12. **Payment Tracking:** Log customer advances, partial payments, and balance dues.
13. **Supplier Directory & Light POs:** Track vendor details and basic purchase orders.
14. **Simple Stock Register:** Manual ledger for tracking wood, foam, hardware (Item, Unit, Qty).
15. **Product Catalog:** Standard product templates with baseline prices.

### **5.3 Analytics & Polish (Phase 3)**
16. **3 Core Reports:** % On-Time Delivery, Average Stage Duration (bottleneck detection), Outstanding Payments.
17. **Simple Dispatch Log:** Text box at the dispatch stage to log driver name/vehicle.
18. **Simplified Complaint Log:** Text log attached to completed orders for post-delivery issues.

---

## **6. Data & Security Rules (Tech Constraints)**

| Category | Rule / Implementation |
| :--- | :--- |
| **Soft Deletes** | Hard `DELETE` requests from the frontend are strictly forbidden for the `orders` table. Deletions send a `PATCH` to update `deleted_at`. |
| **Automated Pruning** | A Supabase `pg_cron` script will run nightly: `DELETE FROM orders WHERE deleted_at < now() - interval '30 days';` |
| **File Storage** | Locked exclusively to **Supabase Storage**. Cloudflare R2 is out of scope to reduce DevOps complexity. |
| **Image Compression** | Client-side Next.js must compress all images to <500KB / max 1920px width to protect the free tier and ensure sub-3-second load times on mobile. |
| **Stage Integrity** | API functions (`advanceStage`, `sendBackToStage`) are the *only* way to mutate FSM state. Direct DB manipulation of stage rows by the frontend is banned. |

---

## **7. The "Dead List" (Out of Scope)**
To protect the AI build budget and developer sanity, the following features from previous discussions are **permanently removed** and must not be built:
*   ❌ **QR Code Generation & Scanning:** Too much physical tech overhead.
*   ❌ **Floor Worker Tablet UI:** App is strictly for Manager mobile/desktop.
*   ❌ **WhatsApp/SMS API Integrations:** Use UI visual indicators instead.
*   ❌ **Complex Offline Sync (IndexedDB):** Standard React Query caching is sufficient.
*   ❌ **Real-time Material Consumption Tracking:** Workers won't log it; data will be fake.
*   ❌ **Granular Piece-Rate Worker Tracking:** Massive admin burden; keep in physical books for now.
*   ❌ **Automated AI Scheduling / AI Costing:** Requires years of clean data first.

---

## **8. Rollout & Build Plan**

**Phase 1 — Core Production Ledger (Months 1–2)**
*Goal: Stop verbal coordination. Every order tracked, every bottleneck visible.*
Build the complete FSM, Next.js UI, Kanban board, Design Uploads, QC Module, Role-Based Access Control, Soft Deletes, and Owner Dashboard.

**Phase 2 — Inventory & Money (Months 3–4)**
*Goal: Stop material stockouts and cash flow gaps.*
Build Supplier tracking, Purchase Orders, simple Stock Register, and Customer Payment logging.

**Phase 3 — Analytics & Quality (Months 5–6)**
*Goal: Use data to improve speed.*
Build Rework tracking, Complaint logs, and the 3 Core Analytics reports. 

---
*End of Document — FurnitureMFG PRD v2.0*