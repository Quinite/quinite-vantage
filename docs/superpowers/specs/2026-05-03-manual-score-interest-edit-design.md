# Manual Score & Interest Level Editing

**Date:** 2026-05-03

## Context

Score and interest_level on leads are currently set only by AI call analysis (`POST /api/calls/[id]/analyze`). There is no UI to override them manually. Agents need to correct AI assessments or set these fields for leads that haven't had a call yet. The backend (`PUT /api/leads/[id]`) already accepts and processes both fields — only UI changes are needed.

## Design

### Edit Dialog — `components/crm/EditLeadProfileDialog.jsx`

Add a **Lead Intelligence** section at the bottom of the existing form with:

- **Score** — `<input type="number" min={0} max={100}>` with the color-coded badge rendered inline as a live preview. Added to `formData` and submitted with the existing PUT payload.
- **Interest Level** — segmented button group: `High | Medium | Low | None`. Maps to `interest_level` string values `'high' | 'medium' | 'low' | 'none'`.

### Inline Quick-Edit — `components/crm/LeadProfileSidebar.jsx`

The read-only score badge and interest pill in the Lead Intelligence row become interactive:

**Score badge:**
- Clicking opens a small Popover anchored to the badge
- Popover contains a number input (0–100) and a Save button
- On save: fires `PUT /api/leads/{id}` with `{ score }`, updates local state optimistically, closes popover

**Interest pill:**
- Clicking opens a small dropdown (4 options: High, Medium, Low, None)
- On select: fires `PUT /api/leads/{id}` with `{ interest_level }`, updates local state optimistically, closes dropdown
- Selected option is highlighted to show current value

Both use the existing `onLeadUpdate` callback pattern already present in the sidebar for other field edits. No new state management needed.

### Backend

No changes. `PUT /api/leads/[id]` at `app/api/leads/[id]/route.js` already:
- Accepts `body.score` and `body.interest_level`
- Triggers `score_threshold` and `interest_level_change` pipeline automations on change

## Files Changed

| File | Change |
|------|--------|
| `components/crm/EditLeadProfileDialog.jsx` | Add Lead Intelligence form section (score input + interest segmented buttons) |
| `components/crm/LeadProfileSidebar.jsx` | Make score badge and interest pill click-to-edit (popover + dropdown) |

## Verification

1. Open a lead detail view
2. Click Edit → confirm Score (0-100 input) and Interest Level (High/Medium/Low/None buttons) appear in form
3. Change both values, save → confirm values update in sidebar badges immediately
4. In sidebar, click score badge → popover appears → change value → save → badge updates
5. In sidebar, click interest pill → dropdown shows 4 options with current highlighted → select new → pill updates
6. Confirm pipeline automations fire: check `pipeline_stage_transitions` or automation logs after changing interest_level or crossing a score threshold
