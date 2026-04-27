# Phase 3: High-Density Production & Admin Controls

This document outlines the product requirements and implementation plan for Phase 3 of the LWC project.

## Kanban Design Review
Based on industry standards for high-density manufacturing interfaces, I have prepared 3 design directions. Manufacturing interfaces must prioritize context over content, minimize text, and maximize visual signals.

### Option 1: The "List-Kanban" Hybrid (Maximum Density)
* **Concept**: Transitions from classic "cards" to a row-based design. Each job is a row, and columns represent the workflow stages. Status is indicated by colored cells/dots. Thumbnails are small and next to the order number.
* **Pros**: Displays 3-5x more jobs on a single screen. Best for pure data density.
* **Cons**: Less visual "pop" than cards. Thumbnails are very small.
* **Rating**: **8/10** - Highly practical for factory floors, but sacrifices some visual aesthetics.

### Option 2: Compact Swimlanes (Balanced)
* **Concept**: Uses horizontal swimlanes to group by priority or product type. Cards are "mini" variants, showing only the 3 most critical data points (ID, Thumbnail, Status icon).
* **Pros**: Good balance of visual information and density. Swimlanes prevent visual clutter. Thumbnails are visible but not overpowering.
* **Cons**: Still requires some vertical scrolling if there are many swimlanes.
* **Rating**: **9/10** - The best compromise. It retains the familiar "card" feel but optimizes spacing heavily, making it ideal for tracking many orders while keeping the UI clean. **(Recommended)**

### Option 3: Visual-First Grid (Command Center)
* **Concept**: The board is filled with square cards where the thumbnail is the primary focus. Metadata is overlaid on the image.
* **Pros**: Visually stunning. Makes it instantly clear *what* is being built based on the design spec.
* **Cons**: Takes up a lot of space. Metadata can be hard to read over images. Not ideal if there are 50+ active orders.
* **Rating**: **7/10** - Great for a TV display in the office, but potentially too sprawling for a manager actively working on a laptop.

## Features & Requirements

### 1. Kanban Board Overhaul
- **Global Visibility**: Show all 6 production stages (Carpentry, Frame Making, Polish, Upholstery, QC, Dispatch) in one view via a horizontal scrolling board.
- **Visual-First Card Design (Option 3 Selected)**:
  - Redesign `KanbanCard` to be a square/rectangle where the **thumbnail photo** (Design Spec or QC Proof) acts as the primary background or dominant visual element.
  - **Legibility Optimization**: Use a solid or smooth dark gradient overlay at the bottom of the image to ensure high contrast for text.
- **Primary Metadata**: Overlay the following critical data clearly on top of the image gradient:
  1. Item Name & Quantity
  2. Customer Name
  3. Delivery Date
- **Department Filter**: Move from a primary filter to a "Focus Mode" toggle to allow managers to zoom into specific departments while retaining the visual grid.

### 2. Workers Page UX
- **Default Tab**: Change `activeTab` default to `attendance`.
- **Tab Order**: Swap positions so `Attendance` is first and `Directory` is second.

### 3. Completed Orders Archive
- **New Archive Page**: Create `/dashboard/orders/completed` to house all orders with status `completed`.
- **Dashboard Filter**: Exclude completed orders from the main orders list to keep it focused on active work.

### 4. Financial Reporting Fixes
- **Button Repair**: Fix the link/action for "Download full financial report".
- **Dynamic Export**:
  - Implement a Modal for CSV export.
  - Options: Select Data Types (Orders, Finance, Customers) and Fields.
  - Update `/api/export` to handle dynamic field selection.

## Proposed Changes

### [Kanban Board]
#### [MODIFY] `src/app/(dashboard)/dashboard/kanban/page.tsx`
- Remove `activeDept` filtering for desktop.
- Adjust grid/flex layout for horizontal scrolling across all stages.
#### [MODIFY] `src/components/kanban/KanbanCard.tsx`
- Add thumbnail image component as background.
- Apply visual-first compact styling with dark gradient overlay.

### [Workers Page]
#### [MODIFY] `src/app/(dashboard)/dashboard/workers/page.tsx`
- Set default state to `attendance`.
- Swap tab button order.

### [Orders & Archive]
#### [NEW] `src/app/(dashboard)/dashboard/orders/completed/page.tsx`
- View specifically for completed orders.
#### [MODIFY] `src/app/(dashboard)/dashboard/orders/page.tsx`
- Add link to Completed Orders.

### [Finance & Export]
#### [MODIFY] `src/app/(dashboard)/dashboard/finance/page.tsx`
- Implement Export Modal.
#### [MODIFY] `src/app/api/export/route.ts`
- Update to handle dynamic fields and filters.
