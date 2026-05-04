# Enrolled Leads Tab Redesign

**Date:** 2026-05-01  
**Status:** Approved  
**Scope:** `app/dashboard/admin/crm/campaigns/[id]/page.js` + `services/campaign.service.js`

---

## Problem

The enrolled leads tab has three pain points:
1. **Dense table** — hard to scan, poor visual hierarchy
2. **8 status tabs** — cluttered, overflow-prone on smaller screens
3. **Minimal lead rows** — score, interest level, call summary not visible; failed leads show no actionable failure info

---

## Solution: Card Layout with Failure Context

Replace the table with a card-per-lead grid and a scrollable pill filter bar. Failed leads get a highlighted banner showing failure reason, attempt count, and retry countdown.

---

## Section 1: Status Filter Bar

- Replace `TabsList` / `TabsTrigger` (8 items) with a **horizontally scrollable pill row**
- Each pill: label + inline count badge (e.g. "Failed 3")
- Active pill: solid filled style. Inactive: ghost/outline
- No visible scrollbar on mobile (`scrollbar-hide` or `overflow-x-auto`)
- Pills: All · Enrolled · Queued · Calling · Called · Failed · Opted Out · Skipped
- Toolbar (search, refresh, add leads) remains above this row, unchanged

---

## Section 2: Lead Card

**Layout:** 1-column on mobile, 2-column on `lg` screens (`grid grid-cols-1 lg:grid-cols-2 gap-3`)

**Card structure (top to bottom):**

```
[ ☐ ]  Lead Name (bold)                    [Status Badge]
       +91 98765 43210 (muted, sm)

       [High Interest] [Score 82] [↑ Positive]   ← omit nulls

       Last called: 2 days ago         [Remove] [Opt-out]

────────────────────────────────────────────────  ← only for failed
  [no-answer]  Attempt 2 of 4          Retry in 47m
```

**Details:**
- Checkbox: top-left, only when `canModify`
- Interest level pill: maps `interest_level` field from lead
- Score pill: `score` field from lead
- Sentiment pill: uses existing `SentimentIcon` logic (TrendingUp/Down/Minus) — omitted if `call_log` is null
- Action buttons: icon-only (`UserMinus`, `Ban`) with tooltips
- "Last called" uses relative time (e.g. "2 days ago") via `formatDistanceToNow` or similar

**Failed banner (conditional — only when `status === 'failed'`)**
- `bg-red-50 border-t border-red-200 dark:bg-red-950/20 dark:border-red-900`
- Left: failure reason badge (`call_log.call_status` — e.g. `no-answer`, `busy`, `rejected`) + "Attempt N of 4"
- Right: retry countdown OR "Max attempts reached"
- When max attempts reached: banner switches to `bg-muted border-t` (gray, neutral)

---

## Section 3: Data & Retry Countdown

**API change — `CampaignService.getEnrolledLeads`:**

Extend the Supabase select to join `call_queue` on `lead_id` + `campaign_id`:

```js
call_queue:call_queue(attempt_count, next_retry_at, max_attempts)
```

Select only: `attempt_count`, `next_retry_at`, `max_attempts`. No new API route needed.

**Retry countdown (client-side):**

- Computed from `next_retry_at` timestamp
- `useEffect` with 60-second interval, updates display string
- Format: "Retry in 47m" / "Retry in 2h 10m"
- When `attempt_count >= max_attempts` (or `next_retry_at` is null): show "Max attempts reached"
- Banner color: red-tinted when retries remain, gray-tinted when maxed out

---

## Section 4: Bulk Actions & Pagination

**Bulk select:**
- "Select all on this page" checkbox in toolbar row (replaces current floating bar pattern)
- When any selected: inline strip below toolbar — "X leads selected · [Remove] [Clear]"

**Pagination:** No change — previous/next buttons with "Page X" label stay as-is.

**Empty states (contextual):**
- Failed filter, no results: "No failed leads — all calls connected successfully"
- Enrolled filter, no results: "No leads enrolled yet"
- Default: "No leads match your search"

---

## Files to Change

| File | Change |
|------|--------|
| `app/dashboard/admin/crm/campaigns/[id]/page.js` | Replace `EnrolledLeadsTab` table+tabs with card grid + pill filters; add `LeadCard` + `FailedBanner` + `RetryCountdown` components in same file |
| `services/campaign.service.js` | Extend `getEnrolledLeads` select to join `call_queue(attempt_count, next_retry_at, max_attempts)` |

---

## Out of Scope

- Mobile-specific layout changes beyond 1-col grid (already handled by responsive grid)
- Changes to other campaign tabs
- Backend retry logic changes
- Any new API routes
