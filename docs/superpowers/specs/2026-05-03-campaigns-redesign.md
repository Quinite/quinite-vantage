# Campaigns System — Full Redesign Spec
**Date:** 2026-05-03  
**Status:** Approved  
**Scope:** Frontend overhaul + targeted backend hardening. Create campaign flow untouched.

---

## Context

The campaigns feature powers AI outbound calling for real estate ops teams. The core backend (queue worker, Plivo/OpenAI Realtime bridge, credit system) is solid. What needs fixing:

- `draft` status adds friction and creates orphaned campaigns — remove it
- Pipeline button on cards is wrong — campaigns are not deal pipelines
- Campaign cards lack contextual actions and proper disabled-state feedback
- Detail page tabs are shallow — no analytics depth, weak overview
- Editing while running has inconsistent locks — should allow all edits with contextual warnings
- `cancelled` vs `failed` distinction is not properly implemented or surfaced
- Duplicate project fields (`project_id`, `project_ids`, `campaign_projects`) — three sources of truth
- No centralized ownership assertion — org-hopping vulnerability across routes
- Archive is a dead end — no read-only view after archiving

---

## Status Machine

### Valid Statuses
`scheduled | running | paused | completed | cancelled | failed | archived`

`draft` is removed entirely. New campaigns go straight to `scheduled`.

### Transitions

| From | To | Trigger | Guards |
|---|---|---|---|
| `scheduled` | `running` | User: Start | today ∈ [start_date, end_date] IST; time ∈ [time_start, time_end] IST; DND ok; credits ≥ 1 min; subscription active/trialing; ≥1 enrolled lead with valid phone; `run_campaigns` permission |
| `running` | `paused` | User: Pause | None — always allowed |
| `paused` | `running` | User: Resume | Same guards as Start |
| `running` | `completed` | Auto (queue empty) OR User: Force Complete | Auto: all campaign_leads in terminal state; Manual: always allowed while running |
| `paused` | `completed` | User: Force Complete | Always allowed |
| `running` | `cancelled` | User: Cancel | Confirmation required |
| `paused` | `cancelled` | User: Cancel | Confirmation required |
| `completed` | `archived` | User: Archive | `edit_campaigns` permission |
| `cancelled` | `archived` | User: Archive | `edit_campaigns` permission |
| `failed` | `archived` | User: Archive | `edit_campaigns` permission |
| `running` | `failed` | System only | Unrecoverable error — see Failed State spec |
| `paused` | `failed` | System only | Credit exhaustion after 30 min |

**Terminal states:** `completed`, `cancelled`, `failed`, `archived` — no further transitions. No restore. No clone.

---

## Date/Time Edge Cases (exhaustive)

All date/time logic evaluated in `Asia/Kolkata` (IST) regardless of user browser timezone.

### At Start/Resume — blocking guards (in priority order)
1. today < start_date → "Campaign starts on {start_date}. Adjust the date or come back then."
2. today > end_date → "Campaign end date has passed. Edit the end date to extend it."
3. time < time_start → "Calling window opens at {time_start}. Opens in {X hrs Y mins}." + countdown
4. time > time_end → "Today's calling window has closed ({time_end}). Come back tomorrow."
5. DND violation (time < 09:00 or time > 21:00) if dnd_compliance=true → "DND rules: calls only 9 AM–9 PM IST."
6. credits < 1 min → "Insufficient call credits. Top up to start."
7. subscription inactive → "Your subscription is inactive."
8. 0 enrolled leads → "No leads enrolled. Enroll leads first."
9. No `run_campaigns` permission → "You don't have permission to run campaigns."

### "Ready to Start" nudge
When `status=scheduled` AND today = start_date AND time ∈ [time_start, time_end]: replace static "Scheduled" badge with pulsing green "Ready to Start" badge on card and detail page header.

### Running outside time window
Campaign stays `running` — queue worker stops processing but doesn't change status. UI shows: `"Running · Paused for night · Resumes at {time_start}"` with moon icon. No user action needed — worker resumes automatically when window opens.

### Campaign end_date passed while running
Do NOT auto-stop. Show orange banner: "Campaign end date passed — calls continue until queue empties or you complete it." Let ops decide.

### end_date editing while running/paused
- Extending → no warning
- Shortening to today → warn: "Calls will stop after today's window closes. Confirm?"
- Shortening to past → warn same

---

## Cancelled State

**Trigger:** User only. Never system.  
**Allowed from:** `running`, `paused`  
**UI:** Confirmation dialog: "Cancel campaign? All queued calls will be stopped. Calls currently in progress will complete naturally. This cannot be undone."

**On cancel:**
1. `campaigns.status` → `cancelled`
2. `call_queue` rows with `status=queued` → deleted
3. `call_queue` rows with `status=processing` → left to complete naturally; worker skips re-queue after call ends
4. `campaign_leads` with `queued` or `enrolled` → `skipped` (skip_reason: `campaign_cancelled`)
5. `campaign_leads` with `calling` → left until call ends → `called` or `failed` normally
6. Already-terminal leads → untouched
7. Final stats written to campaigns row
8. Audit log entry

---

## Failed State

**Trigger:** System only. Never user.

| Scenario | Condition | fail_reason |
|---|---|---|
| All leads exhausted, 0 calls made | Every lead hit max_attempts (4), called_count=0 | `all_leads_unreachable` |
| Subscription lapsed mid-run | Subscription check fails in worker | `subscription_lapsed` |
| Credits hit zero, no recovery in 30 min | credit_minutes ≤ 0 for 30+ min | `insufficient_credits` |
| Critical provider error | Plivo 5xx on every attempt for 15+ min | `provider_error` |
| Worker unrecoverable exception | Uncaught Node.js exception in queueWorker | `worker_error` |

**Rule:** If ≥1 call was ever made → `completed` (not `failed`). Failed = 0 calls made AND something went wrong.

**On fail:**
1. `campaigns.status` → `failed`
2. `campaigns.metadata.fail_reason` → set
3. `campaigns.metadata.failed_at` → timestamp
4. `call_queue` queued entries → deleted
5. `campaign_leads` with `queued/enrolled` → stay as `enrolled` (preserved, not lost)
6. In-flight calls → complete naturally
7. Audit log entry

**UI:** Red banner on detail page: human-readable message per fail_reason with fix-prompt link where applicable.

---

## Duplicate Field Cleanup

**Single source of truth: `campaign_projects` junction table.**

- `project_id` (legacy column) — never write, never return in API responses. Keep in DB silently.
- `project_ids` (array column) — remove from all code. `campaign_projects` is canonical.
- All API routes: read projects via `campaign_projects` join, return as `projects: [{id, name}]` array.
- Migration: for any campaign where `campaign_projects` is empty but `project_id` is set → backfill `campaign_projects` row.

---

## Security Hardening

**Add `assertCampaignOwnership(campaignId, organizationId)` helper** in `services/campaign.service.js`:
- Fetches campaign by ID
- Throws 403 if `campaign.organization_id !== organizationId`
- Call at the top of every mutating API route (start, pause, resume, cancel, complete, archive, restart, leads mutations)

**Canonical API response shape** — never include `project_id` or `project_ids`. Always `projects` array.

---

## Campaign Card Redesign

### Action Buttons by Status

| Status | Primary Button | Secondary Actions |
|---|---|---|
| `scheduled` | Start Campaign (green) | Open Campaign, Enroll Leads, Edit, Delete |
| `scheduled` + ready | Start Campaign (pulsing green "Ready") | Open Campaign, Enroll Leads, Edit, Delete |
| `running` | Pause (amber) | Open Campaign, Cancel (red), Force Complete (purple), Enroll Leads |
| `running` + outside window | "Paused for night" (moon, disabled) | Open Campaign, Cancel, Force Complete, Enroll Leads |
| `paused` | Resume (green) | Open Campaign, Cancel (red), Force Complete (purple), Enroll Leads |
| `completed` | Archive (gray) | Open Campaign |
| `cancelled` | Archive (gray) | Open Campaign |
| `failed` | Archive (gray) | Open Campaign |
| `archived` | — | Open Campaign (view only) |

**Pipeline button → replaced with "Open Campaign"** linking to `/dashboard/admin/crm/campaigns/[id]`.

**Delete guard:** Only for `scheduled` with zero call history. If any call_logs exist → hide Delete, show "Archive instead."

### Disabled State Tooltips (Start/Resume)
All 9 blocking conditions from the Date/Time section above, surfaced as tooltip on disabled button.

---

## Campaign Detail Page — 5 Tabs

### Header
- Campaign name (inline editable)
- Status badge (with "Paused for night" and "Ready to Start" variants)
- Project badges
- Primary action button (matches card logic)
- Failed: red banner with fail_reason + fix link

### Tab 1: Overview

**Health Bar:**
- Pulsing dot if running
- Amber banner if running outside time window: "Calling paused for night · Resumes at {time_start} IST"
- Orange banner if end_date passed: "Campaign end date passed — calls continue until queue empties or you complete it"
- Credit progress bar (only if credit_cap set): `{spent} / {cap} mins`
- ETA: "At current pace, ~{X hrs} remaining" (avg call rate × remaining leads)

**Key Metrics Row:**
Total Calls · Answered · Transferred · Avg Sentiment · Conversion Rate · Completion Rate

**Lead Pipeline Movement:**
Table of leads whose interest_level or stage changed post-call. Columns: Lead Name, Previous Interest, New Interest, Stage Change, Call Date. Empty state: "No lead movements yet."

**Today's Activity:**
Calls made today · Failed today · Queued for today · ETA

### Tab 2: Enrolled Leads
- Search (name/phone), filter by status, paginated table
- Columns: Avatar, Name, Phone, Status, Last Attempt, Attempt Count, Actions
- Per-lead actions (status-gated): Remove, View Call Log, Opt-out (+global DNC option)
- Status counts summary bar
- "Enroll More Leads" button — visible for `scheduled/running/paused`

### Tab 3: Call Results (2 sub-tabs)

**Sub-tab: Call Logs**
- Paginated list: Lead, Phone, Date/Time, Duration, Status, Sentiment, Transferred
- Expandable: full transcript, AI metadata, sentiment breakdown, summary
- Filters: date range, status, transferred only, sentiment

**Sub-tab: Analytics**
- Call volume per day (bar chart)
- Sentiment trend per day (line chart)
- Outcome breakdown (donut: answered/no_answer/failed)
- Transfer rate trend per day
- Interest level distribution (bar: high/medium/low/none)
- Top objections (aggregated from AI metadata)
- Graceful empty state if < 3 data points

### Tab 4: Settings
All fields editable. Contextual inline warnings:

| Field | Warning condition |
|---|---|
| end_date | Shortening to past/today while running |
| time_start/time_end | Running: "Applies from next queue cycle (~4s)" |
| credit_cap | Reducing below credit_spent |
| dnd_compliance | Running: "Applies immediately to next queue cycle" |
| ai_script | Running: "Applies to upcoming calls, not current active call" |
| call_settings | Running: same as ai_script |
| projects | Running: "Adding projects enrolls new leads. Removing does not unenroll existing." |

Single Save button. Optimistic update with rollback on error.

**Danger Zone (bottom of Settings):**
- Force Complete — "Mark as completed. All queued calls cancelled."
- Cancel Campaign — confirmation dialog
- Archive — only for terminal states
- Delete — only for `scheduled` with no call history; otherwise hidden

---

## In-Flight Call Safety

The invariant: `call_queue.status=processing` + `campaign_leads.status=calling` = active Plivo WebSocket. No transition kills it.

| Action | In-flight call |
|---|---|
| Pause / Cancel / Force Complete | Completes naturally. Worker skips re-queue. |
| Archive | Only on terminal campaigns — no active calls possible. |
| Edit any field | Active session unaffected. New value applies to next call. |
| Credit exhaustion | Mid-call credit pulse: if 0 credit minutes remain, current call continues to natural end, no new calls queued. |

---

## Queue Worker Additions

1. **Auto-complete trigger:** When worker detects all campaign_leads in terminal state (called + failed + opted_out + skipped + archived = total_enrolled) → set `campaigns.status = 'completed'`, write final stats.

2. **Failed state writes:** Add explicit handlers for:
   - Subscription lapse → `failed` with `fail_reason: 'subscription_lapsed'`
   - Credit minutes ≤ 0 for 30+ min → `failed` with `fail_reason: 'insufficient_credits'`
   - All leads hit max_attempts with 0 calls made → `failed` with `fail_reason: 'all_leads_unreachable'`
   - Unrecoverable provider error (15+ min) → `failed` with `fail_reason: 'provider_error'`

3. **Mid-run enrollment support:** Verify worker picks up newly `enrolled` leads (status=enrolled, not in call_queue yet) — add to queue on next cycle.

---

## What's NOT Changing
- Create campaign flow — untouched
- Lead enrollment dialog/filters — untouched
- Permissions model — untouched
- Credit/billing system — untouched
- Plivo/OpenAI Realtime integration — untouched
- Queue worker core logic (only additions, no rewrites)

---

## Critical Files

| File | Change |
|---|---|
| `app/dashboard/admin/crm/campaigns/page.js` | Card redesign — actions, badges, tooltips |
| `app/dashboard/admin/crm/campaigns/[id]/page.js` | Full 5-tab detail page redesign |
| `app/api/campaigns/route.js` | Remove draft from create, canonical response shape |
| `app/api/campaigns/[id]/route.js` | assertCampaignOwnership, canonical response, project field cleanup |
| `app/api/campaigns/[id]/start/route.js` | All 9 blocking guards |
| `app/api/campaigns/[id]/resume/route.js` | Same guards as start |
| `app/api/campaigns/[id]/cancel/route.js` | Harden in-flight handling |
| `app/api/campaigns/[id]/complete/route.js` | Final stats write |
| `services/campaign.service.js` | assertCampaignOwnership helper, project field cleanup |
| `hooks/useCampaigns.js` | Any new queries (analytics, pipeline movement) |
| `supabase/migrations/` | Remove draft from status CHECK, backfill campaign_projects |
| `quinite-vantage-webserver/queueWorker.js` | Auto-complete trigger, failed state writes |

---

## Verification

1. Create a campaign → confirm status is `scheduled` (not `draft`)
2. Try to start outside date range → confirm correct blocking message per condition
3. Try to start in window → confirm campaign goes to `running`
4. Pause → confirm queue stops, in-flight call completes
5. Resume outside window → confirm correct blocking message
6. Resume in window → confirm queue resumes
7. Cancel while running → confirm in-flight call completes, queued leads → skipped
8. Force complete → confirm stats written, status → completed
9. Archive completed campaign → confirm read-only, all tabs viewable
10. Edit ai_script while running → confirm inline warning shown, save succeeds
11. Enroll leads while running → confirm new leads picked up by worker
12. Exhaust all credits mid-run → confirm campaign → failed with correct fail_reason
13. Open Campaign button on card → confirm navigates to detail page
14. Delete on campaign with call history → confirm Delete hidden, Archive shown
15. Verify no `project_id` or `project_ids` in any API response
