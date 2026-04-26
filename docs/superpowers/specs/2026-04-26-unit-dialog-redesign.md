# Unit Add/Edit Dialog — Redesign Spec
**Date:** 2026-04-26  
**Scope:** Replace `UnitDrawer.js` (Sheet sidebar) with a large Dialog component for add/edit in the Visual View tab of Inventory Projects.  
**Do not touch:** Grid-fill / unit config selection flow in `VisualUnitGrid.js`.

---

## 1. Overview

The current unit form lives in a `Sheet` sidebar (`sm:max-w-lg`, ~448px). It is a single scrollable form with 4 implicit sections, no validation library, and no multi-step pattern. The new design replaces it with an **840px Dialog** with **2 tabs**: Unit Details (all editable fields) and Site Visits (read + manage).

The new component is named **`UnitDialog`** and replaces all usages of `UnitDrawer` across:
- `components/inventory/VisualUnitGrid.js`
- `components/inventory/UnitsView.jsx`
- Any other callsites

---

## 2. Container

| Property | Value |
|---|---|
| Component | Radix UI `Dialog` (via `components/ui/dialog`) |
| Width | `max-w-[840px] w-full` |
| Height | Header fixed + scrollable body (`max-h-[560px] overflow-y-auto`) + footer fixed |
| Trigger | Same as current Sheet — clicking a unit cell in VisualUnitGrid, or Edit button in UnitsView |
| Backdrop | Standard Radix Dialog overlay |
| Close | ✕ button in header + Escape key (Radix default) |

---

## 3. Header (dark, fixed)

Background: `bg-gradient-to-br from-slate-800 to-slate-900` with two radial glow accents (blue + indigo).

**Left side:**
- Icon box: `w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500` with 🏠 emoji (or Building2 icon)
- Unit name: `text-xl font-extrabold text-slate-50` — "New Unit" in add mode, unit number in edit mode
- Subtitle: Tower name · Floor · Slot in `text-xs text-slate-500`

**Right side (chips, edit mode only):**
- Status chip (green/amber/red depending on status value)
- Config/type chip (blue)
- Transaction type chip (slate)
- ✕ close button

**Tabs row** (bottom of header, no background separation — tabs blend into header):
- Tab 1: `📋 Unit Details` — always active on open
- Tab 2: `📍 Site Visits` — with amber badge showing visit count (hidden in add mode, hidden when 0)
- Active tab: `text-slate-50 border-b-2 border-blue-500 bg-white/5`
- Inactive tab: `text-slate-500 hover:text-slate-400`

---

## 4. Tab 1 — Unit Details

All form fields in 3 section cards. Body background: `bg-slate-50`. Each card: `bg-white border border-slate-100 rounded-2xl p-4 shadow-sm`.

### 4.1 Section: Identity & Configuration

**Row 1 — 2 columns:**
| Field | Type | Notes |
|---|---|---|
| Unit Number | `Input` | Required. Auto-generated via `generateUnitNumber()` on add, editable. |
| Unit Type / Config | `Select` | Required. Triggers `handleConfigChange` to pre-fill price/area/bedrooms. |

**Row 2 — 2 columns:**
| Field | Type | Notes |
|---|---|---|
| Transaction | Pill toggle (Sell / Rent) | Defaults from config |
| Status | Colored status selector | Cycles: available → reserved → sold → blocked → under_maintenance. Color-coded border + dot. |

**Row 3 — 2 columns:**
| Field | Type | Notes |
|---|---|---|
| Facing Direction | `Select` | Options: None, North, South, East, West, NE, NW, SE, SW |
| Unit Features | Feature Tag Chips (see §6) | Corner Unit chip + Vastu Compliant chip stacked vertically |

**Full-width below Row 3:**
| Field | Type | Notes |
|---|---|---|
| Unit Amenities | Tag strip + "Override" button | `null` = show config amenities read-only with "Override" link. Clicking Override sets to `[]` and opens `AmenitiesPicker`. Clicking "Use config defaults" resets to `null`. |

---

### 4.2 Section: Pricing & Area

Section header right side: live "₹XX.XL total" green badge, computed from base + floor rise + PLC.

**Price row — 3 columns:**
| Field | Type |
|---|---|
| Base Price (₹) | `<input type="number">` |
| Floor Rise (₹) | `<input type="number">` |
| PLC (₹) | `<input type="number">` |

**Divider**

**Area row — 3 columns (residential) or 1 column (land):**
| Field | Type | Shown when |
|---|---|---|
| Carpet Area (sqft) | `<input type="number">` | Always (residential) |
| Built-up Area (sqft) | `<input type="number">` | Always (residential) |
| Super Built-up (sqft) | `<input type="number">` | Always (residential) |
| Plot Area (sqft) | `<input type="number">` | Land only |

**Computed Total — inline card** (right after area fields):
```
bg-gradient-to-r from-blue-50 to-emerald-50, border-blue-200
Left: "COMPUTED TOTAL PRICE" label + "Base Price + Floor Rise + PLC" sub
Right: ₹XX,XX,XXX in Plus Jakarta Sans font-extrabold text-blue-700
```

**Divider** (only for residential)

**Conditional residential banner** (only when `isResidential`):
```
bg-gradient-to-r from-blue-50 to-violet-50, border-blue-200
🛏️ "Residential config — pre-filled from [config name], override per unit if needed."
```

**Room row — 3 columns (residential only):**
| Field | Type |
|---|---|
| Bedrooms | `<input type="number" min="0" max="20">` |
| Bathrooms | `<input type="number" min="0" max="20">` |
| Balconies | `<input type="number" min="0" max="10">` |

---

### 4.3 Section: Construction & Handover

**Construction Status — 3 Radio Cards:**

Each card: `border-1.5 rounded-xl p-3 text-center cursor-pointer` with icon + name + subtitle.

| Value | Icon | Label | Subtitle | Selected color |
|---|---|---|---|---|
| `under_construction` | 🏗️ | Under Construction | Work in progress | Amber (`border-amber-400 bg-amber-50`) |
| `ready_to_move` | 🔑 | Ready to Move | Keys available | Green (`border-green-400 bg-green-50`) |
| `completed` | 🏁 | Completed | Fully handed over | Blue (`border-blue-400 bg-blue-50`) |

Selected card shows a colored ✓ badge in top-right corner.

**Date fields — 2 columns (conditional):**
- Show `possession_date` + `completion_date` when status is `under_construction` or `ready_to_move`
- Hide both when `completed` (already handed over, no future date needed)
- Use Radix `Popover` + `Calendar` (existing pattern from current UnitDrawer)

**Divider**

**Linked Buyer / Lead:**
- Filled state: avatar initials + lead name + phone/city + "Change ✕" button
- Empty state: dashed border card with "🔍 Search and link a lead" CTA
- Uses existing `Popover` + `Command` lead search (same as current UnitDrawer)
- Hint: "Only leads assigned to this project"

---

## 5. Tab 2 — Site Visits

Reuses existing components from `components/crm/site-visits/`. No new components needed for display/management.

**Header row:**
- Left: "Site Visits" title + "N visits · N upcoming · Unit [unit_number]" subtitle
- Right: "+ Book Visit" button (blue, triggers `BookSiteVisitDialog`)

**Data source:**
- Hook: `useSiteVisits(leadId)` — existing hook, already filters by lead
- Additional filter: `unit_id === unit.id` applied client-side (or pass `unitId` to hook if hook supports it — check `useSiteVisits` signature)
- If `unit_id` filter not supported in hook, add `unitId` param to `useSiteVisits`

**Upcoming visits section** (status === 'scheduled', sorted ascending by `scheduled_at`):
- Uses `SiteVisitCard` with `onEdit`, `onDelete`, `onMarkComplete`, `onMarkNoShow` handlers

**Past visits section** (status !== 'scheduled', sorted descending):
- Uses `SiteVisitCard` — actions hidden, outcome note shown, status badge displayed

**Empty state:**
- 📍 icon, "No site visits yet", "Book a site visit to schedule a property viewing", "Book First Visit" outline button

**Dialogs (reused as-is):**
- `BookSiteVisitDialog` — for scheduling / editing
- `SiteVisitOutcomeDialog` — for marking complete with outcome + notes

**Stage gate:** On visit completion, check if lead should move to "Site Visit Done" pipeline stage (existing `handleOutcomeSuccess` logic from `SiteVisitsTab.jsx`, adapted here).

---

## 6. Feature Tag Chips (Corner Unit & Vastu)

Both chips stacked vertically under a single "Unit Features" label.

**Structure per chip:**
```
border-1.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all
[OFF] border-dashed border-slate-200 bg-transparent
[ON]  border-solid border-amber-400 bg-amber-50  (corner)
      border-solid border-green-400 bg-green-50   (vastu)
```

**Chip internals:**
- Left: icon box (`w-8 h-8 rounded-lg`) — 📐 for corner, 🧭 for vastu; bg changes on active
- Middle: title (`font-semibold text-slate-700` → `text-slate-900` when on) + description line (updates dynamically)
- Right: badge pill — grey "No" when off, colored "Yes ✓" when on

**Dynamic description text:**
| Field | OFF | ON |
|---|---|---|
| Corner | "Tap to mark as corner" | "2-sided frontage · premium" |
| Vastu | "Tap to mark as aligned" | "Directional alignment ✓" |

---

## 7. Footer (fixed, always visible)

```
bg-white border-t border-slate-100 px-6 py-3.5
flex justify-between items-center
```

**Left:** Delete button — edit mode only. `text-red-500 border border-red-200 bg-red-50 rounded-lg`. Triggers confirmation then `onDelete`.

**Right:** Cancel (ghost) + Save button.
- Add mode save label: "Create Unit"
- Edit mode save label: "Save Changes"
- Save button: `bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-200`
- Save is always visible regardless of active tab — triggers form submission for Unit Details fields only (site visits are saved independently via their own mutations).

---

## 8. Validation

Adopt **React Hook Form + Zod** (both already in `package.json`, used in CLAUDE.md conventions).

**Schema:**
```ts
z.object({
  unit_number:         z.string().min(1, "Unit number is required"),
  config_id:           z.string().uuid("Select a unit type"),
  transaction_type:    z.enum(["sell", "rent"]),
  status:              z.enum(["available","reserved","sold","blocked","under_maintenance"]),
  facing:              z.string().optional(),
  is_corner:           z.boolean(),
  is_vastu_compliant:  z.boolean(),
  base_price:          z.number().min(0).nullable(),
  floor_rise_price:    z.number().min(0).nullable(),
  plc_price:           z.number().min(0).nullable(),
  carpet_area:         z.number().min(0).nullable(),
  built_up_area:       z.number().min(0).nullable(),
  super_built_up_area: z.number().min(0).nullable(),
  plot_area:           z.number().min(0).nullable(),
  bedrooms:            z.number().int().min(0).nullable(),
  bathrooms:           z.number().int().min(0).nullable(),
  balconies:           z.number().int().min(0).nullable(),
  construction_status: z.enum(["under_construction","ready_to_move","completed"]),
  possession_date:     z.string().nullable(),
  completion_date:     z.string().nullable(),
  lead_id:             z.string().uuid().nullable(),
  amenities:           z.array(z.string().uuid()).nullable(),
})
```

**Validation behavior:**
- Errors shown inline below each field (`text-xs text-red-500`)
- Required fields (`unit_number`, `config_id`) validated on submit and on blur
- Numeric fields: empty string → `null` before submission (same as current behavior)
- Date fields: empty → `null` (Postgres rejects empty string for date columns)
- On validation failure: scroll to first error field; do not close dialog

---

## 9. Form State & API Integration

- Keep the same `onSave(payload)` + `onDelete(unitId)` prop interface as current `UnitDrawer` so all call-sites need zero changes beyond swapping `UnitDrawer` → `UnitDialog`
- `handleConfigChange`: same logic — pre-fill price/area/bedrooms from selected config
- Price computation: `calculateFinalPrice(base, rise, plc)` from `lib/inventory.js`
- Amenities: same null-inheritance pattern

---

## 10. Conditional Field Logic

| Condition | Fields shown |
|---|---|
| `isResidential` (config.category === 'residential') | carpet_area, built_up_area, super_built_up_area, bedrooms, bathrooms, balconies, is_corner, is_vastu_compliant |
| `isLand` (config.category === 'land') | plot_area only |
| `construction_status !== 'completed'` | possession_date, completion_date |
| `mode === 'edit'` | Delete button, Site Visits tab badge, header chips |
| `mode === 'add'` | Site Visits tab hidden entirely (no unit ID yet to attach visits to) |

---

## 11. Files to Create / Modify

| Action | File |
|---|---|
| **Create** | `components/inventory/UnitDialog.js` — new dialog component |
| **Modify** | `components/inventory/VisualUnitGrid.js` — swap `UnitDrawer` → `UnitDialog` |
| **Modify** | `components/inventory/UnitsView.jsx` — swap `UnitDrawer` → `UnitDialog` |
| **Modify** | `hooks/useSiteVisits.js` — add optional `unitId` filter param if not already supported |
| **Keep** | `components/inventory/UnitDrawer.js` — do not delete until `UnitDialog` is verified |

---

## 12. Future-Proofing Notes

- Additional tabs (Documents, Activity Log, Deals) can be added to the tab row without touching form logic — the tab system is independent of the form
- The `UnitDialog` accepts the same props as `UnitDrawer` to keep call-sites stable
- Feature tag chips pattern (`feat-chip`) can be extracted to `components/ui/feature-chip.tsx` if reused elsewhere
