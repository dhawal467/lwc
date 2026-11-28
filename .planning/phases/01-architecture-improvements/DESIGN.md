# Phase 01: Design & Ergonomics Specification

## Visual Archetype
- **Aesthetic**: Modern Clean Workshop Utility (Industrial Precision + Apple Tactile Clarity).
- **Surface Elevation**: Frosted acrylic glass headers with inner light bevels (`shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]`).
- **Tactile Springs**: `active:scale-[0.98] transition-transform duration-100 ease-out`.

## 5-Color Palette Tokens
- **Primary**: Amber / Warm Wood (`#d97706` / `text-primary`)
- **Secondary / Action**: Emerald Green (`#059669` / `bg-emerald-600`) for pass/settle/WhatsApp
- **Accent / Destructive**: Crimson Red (`#dc2626` / `text-danger`) for fail/revert/delete
- **Neutral Background**: Zinc Slate (`bg-background` / `bg-surface`)
- **Text**: Dark Charcoal (`#111827` / `#f3f4f6` in dark mode)

## Mobile Floor Ergonomics
- Touch targets: $\ge 48\times 48$px for floor quick advance actions.
- Input font size: $\ge 16$px (`text-base`) to avoid iOS Safari zoom.
- 600ms debounce throttle on all stage advance triggers.
