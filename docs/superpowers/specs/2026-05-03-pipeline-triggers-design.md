# Pipeline Triggers — Design Spec
**Date:** 2026-05-03  
**Status:** Approved for implementation

---

## Context

The CRM pipeline currently has two problems:

1. **Hardcoded site visit stage detection** — the system uses regex matching on stage names (`/site[\s-]*visit[\s-]*scheduled/i`) to decide when to show booking dialogs. This breaks if users rename stages and couples business logic to naming conventions.

2. **No automated lead routing for key events** — when a site visit is booked/completed, when an AI call succeeds or exhausts retries, or when a deal changes status, leads stay wherever they are. Users must manually move leads after each event, creating friction and inconsistency.

**Goal:** Replace hardcoded stage detection with a flexible "Pipeline Triggers" system — an org-wide set of event→stage mappings that users configure themselves, accessible from a side sheet on the pipeline board.

---

## What We're Building

A **Pipeline Triggers sheet** — a right-side sheet (matching the visual style of `ManageStagesSheet` and `StageSettingsSheet`) accessible from a new button in the pipeline board header. It lets users configure org-wide triggers: when event X happens, move the lead to stage Y, regardless of current stage.

Triggers fire via **API-side hooks** in existing route handlers — no Supabase DB triggers. Each hook reads the org's trigger config and calls the existing lead stage update path which handles logging and downstream automation rules.

---

## Removing Hardcoded Site Visit Stage Detection

### What to Remove
- `lib/site-visit-stages.js` — delete entirely
- All imports and usages of `isSiteVisitScheduledStage()` and `isSiteVisitDoneStage()` in `PipelineBoard.js`
- `SiteVisitStageGateDialog.jsx` — remove (the gate that intercepts drag to "scheduled" stage)
- `SiteVisitOutcomeDialog.jsx` — remove (the gate that intercepts drag to "done" stage)

### What Replaces It
The `BookSiteVisitDialog` remains and is still accessible from the lead card / lead detail view. The difference: dragging a lead to any stage now just moves them — no interception. Instead, when a site visit is booked or its outcome is recorded, the Pipeline Trigger fires and moves the lead to the configured stage automatically.

---

## Data Model

### New Table: `org_pipeline_triggers`

```sql
CREATE TABLE public.org_pipeline_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_key text NOT NULL,         -- e.g. 'site_visit_booked', 'call_exhausted'
  is_enabled boolean DEFAULT true,
  target_stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, trigger_key)
);
```

**Trigger keys:**

| Key | Event |
|---|---|
| `site_visit_booked` | Any site visit created |
| `site_visit_completed_interested` | Visit completed, outcome = interested |
| `site_visit_completed_not_interested` | Visit completed, outcome = not_interested |
| `site_visit_completed_follow_up` | Visit completed, outcome = follow_up_needed |
| `site_visit_no_show` | Visit status set to no_show |
| `call_answered` | First successful AI call connection (call_status: called) |
| `call_transferred` | AI call transferred to human |
| `call_callback_requested` | AI call outcome = callback |
| `call_exhausted` | campaign_leads.status → failed (all retries done) |
| `deal_created` | First deal created on lead |
| `deal_won` | Deal marked won |
| `deal_lost` | Deal marked lost |

### Lead Card Badge

Add `call_failed_at timestamptz` column to `leads` table (nullable). Set when `call_exhausted` trigger fires. Clear when a new call is successfully made. Used to show "Call Failed" badge on lead card.

---

## API

### `GET /api/pipeline/triggers`
Returns all triggers for the org with current config.

```json
[
  {
    "trigger_key": "site_visit_booked",
    "is_enabled": true,
    "target_stage_id": "uuid-of-stage",
    "target_stage_name": "Site Visit Scheduled"
  },
  ...
]
```

### `PUT /api/pipeline/triggers`
Upsert all triggers in one call (save all button).

```json
{
  "triggers": [
    { "trigger_key": "site_visit_booked", "is_enabled": true, "target_stage_id": "uuid" },
    { "trigger_key": "call_exhausted", "is_enabled": false, "target_stage_id": null }
  ]
}
```

### Internal helper: `firePipelineTrigger(triggerKey, leadId, organizationId)`
Shared utility in `lib/pipeline-triggers.ts`:
1. Fetch trigger config for `triggerKey` + `organizationId`
2. If not enabled or no `target_stage_id`, return early
3. If lead already in `target_stage_id`, return early (no-op)
4. Call `PUT /api/leads/[id]` internally (or call the DB update + `logStageTransition` + `runAutomations` directly)
5. Log transition with `source: 'pipeline_trigger'`

---

## Hook Points in Existing Routes

| Route | Event | Trigger Key(s) |
|---|---|---|
| `POST /api/site-visits` | After insert | `site_visit_booked` |
| `PATCH /api/site-visits/[id]` | After update, status = completed | `site_visit_completed_interested/not_interested/follow_up` |
| `PATCH /api/site-visits/[id]` | After update, status = no_show | `site_visit_no_show` |
| Campaign call API | After call_log insert, call_status = called, first time | `call_answered` |
| Campaign call API | After call_log insert, transferred = true | `call_transferred` |
| Campaign call API | After call_log insert, outcome = callback | `call_callback_requested` |
| Campaign call API | After campaign_leads.status → failed | `call_exhausted` + set `leads.call_failed_at` |
| `POST /api/deals` | After insert | `deal_created` |
| `PATCH /api/deals/[id]` | After status → won | `deal_won` |
| `PATCH /api/deals/[id]` | After status → lost | `deal_lost` |

For `call_answered`: only fire if this is the lead's first successful call (check `call_logs` count for this lead with `call_status: 'called'` = 1).

---

## UI

### Entry Point
New button **"Pipeline Triggers"** in `PipelineBoard.js` header area, next to or near the existing "Manage Stages" button. Uses `Zap` icon from lucide-react. Opens `PipelineTriggersSheet`.

### `PipelineTriggersSheet.jsx`
New component at `components/crm/PipelineTriggersSheet.jsx`.

**Structure (matching StageSettingsSheet pattern):**
```
SheetHeader
  Title: "Pipeline Triggers"
  Description: "Automatically move leads when key events happen, from any stage."

ScrollableContent (space-y-6)
  Section: SITE VISIT  (text-xs font-semibold uppercase)
    TriggerRow × 5

  Section: CALLS & CAMPAIGNS
    TriggerRow × 4
    (call_exhausted row also has "Show badge on lead card" — always on, not configurable)

  Section: DEALS
    TriggerRow × 3

Footer
  Cancel button
  Save Changes button (disabled if no changes, shows Loader2 while saving)
```

**`TriggerRow` component:**
```
flex items-center gap-3 p-3 rounded-xl border bg-card

Left:
  Event label (text-sm font-medium)
  Description (text-xs text-muted-foreground)

Right:
  Stage picker Select (compact, shows stage name or "Select stage…")
  Toggle Switch (scale-75, enable/disable)
```

Toggle disabled state: grays out the stage picker but keeps the value.  
If no stage selected and toggle is on: show inline validation "Select a stage to enable".

### Lead Card Badge
In `PipelineColumn.js` or lead card component: if `lead.call_failed_at` is set, show a small red badge:
```
bg-destructive/10 text-destructive border border-destructive/20
text-[10px] font-semibold
"Call Failed"
```
Badge disappears when `call_failed_at` is cleared (on next successful call).

---

## Conflict & Edge Case Rules

| Scenario | Behavior |
|---|---|
| Lead already in target stage | Skip silently, no log entry |
| Target stage deleted | `target_stage_id` → null (ON DELETE SET NULL), trigger effectively disabled |
| Two triggers fire simultaneously | Both execute sequentially; last one wins (logged separately) |
| Trigger fires on archived lead | Skip — check `archived_at` before moving |
| `call_answered` for lead with existing calls | Only fire if this is lead's first `call_status: 'called'` log |

---

## Files to Create / Modify

**Create:**
- `components/crm/PipelineTriggersSheet.jsx`
- `lib/pipeline-triggers.ts` — `firePipelineTrigger()` helper
- `app/api/pipeline/triggers/route.js` — GET + PUT
- `supabase/migrations/YYYYMMDD_pipeline_triggers.sql` — new table + leads.call_failed_at column

**Modify:**
- `components/crm/PipelineBoard.js` — add button, remove site-visit gate logic
- `components/crm/PipelineColumn.js` or lead card — add Call Failed badge
- `app/api/site-visits/route.js` + `[id]/route.js` — add trigger hooks
- Campaign call API route — add trigger hooks
- `app/api/deals/route.js` + `[id]/route.js` — add trigger hooks

**Delete:**
- `lib/site-visit-stages.js`
- `components/crm/site-visits/SiteVisitStageGateDialog.jsx`
- `components/crm/site-visits/SiteVisitOutcomeDialog.jsx`

---

## Verification

1. **Remove gate logic:** Drag a lead to any stage on pipeline board — no dialog should intercept.
2. **Site visit booked trigger:** Book a site visit for a lead → lead moves to configured stage automatically.
3. **Site visit outcome trigger:** Mark a visit completed with "Interested" → lead moves to configured stage.
4. **No show trigger:** Mark visit as no-show → lead moves to configured stage.
5. **Call exhausted:** Exhaust all retries on a campaign lead → "Call Failed" badge appears on lead card + lead moves to stage.
6. **Call answered:** First successful call on a lead → lead moves to stage. Second call does NOT re-trigger.
7. **Deal triggers:** Create/win/lose a deal → lead moves accordingly.
8. **Toggle disabled:** Disable a trigger in sheet → event fires but lead does not move.
9. **No stage selected + toggle on:** Sheet shows validation error, Save is blocked.
10. **Deleted stage:** Delete a target stage → trigger gracefully becomes no-op (null stage).
11. **Lead timeline:** Stage moves from triggers show `source: pipeline_trigger` in transition log.
