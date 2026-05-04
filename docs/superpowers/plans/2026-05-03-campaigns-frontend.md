# Campaigns Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the campaigns UI — new card actions, "Open Campaign" replacing Pipeline, exhaustive disabled-state tooltips, and a full 5-tab detail page (Overview with ops dashboard, Enrolled Leads, Call Results with analytics sub-tabs, Settings with inline warnings, Danger Zone).

**Architecture:** All changes are in `app/dashboard/admin/crm/campaigns/`. The list page (`page.js`) gets a redesigned `CampaignCard` component extracted to `components/crm/campaigns/CampaignCard.jsx`. The detail page (`[id]/page.js`) is restructured around 5 tabs. New hooks added to `hooks/useCampaigns.js` for analytics and pipeline movement. No backend changes required — uses existing API endpoints.

**Tech Stack:** Next.js App Router, TanStack React Query v5, Radix UI (`Tabs`, `Tooltip`, `AlertDialog`), Tailwind CSS, Lucide React icons, Recharts (already used in analytics page), `react-hot-toast`.

---

## File Map

| File | What changes |
|---|---|
| `components/crm/campaigns/CampaignCard.jsx` | CREATE — extracted, redesigned campaign card component |
| `app/dashboard/admin/crm/campaigns/page.js` | MODIFY — use new CampaignCard, remove Pipeline button, remove draft status handling |
| `hooks/useCampaigns.js` | MODIFY — add `useCampaignCallLogs`, `useCampaignAnalytics`, `useCampaignPipelineMovement` |
| `app/dashboard/admin/crm/campaigns/[id]/page.js` | MODIFY — full 5-tab redesign |
| `components/crm/campaigns/CampaignOverviewTab.jsx` | CREATE — Overview tab content |
| `components/crm/campaigns/CampaignCallResultsTab.jsx` | CREATE — Call Results tab with 2 sub-tabs |
| `components/crm/campaigns/CampaignStatusBadge.jsx` | CREATE — reusable status badge with all variants |
| `components/crm/campaigns/CampaignActionButton.jsx` | CREATE — reusable primary action button with disabled logic + tooltips |

---

## Task 1: CampaignStatusBadge component

**Files:**
- Create: `components/crm/campaigns/CampaignStatusBadge.jsx`

- [ ] **Step 1: Create the component**

```jsx
// components/crm/campaigns/CampaignStatusBadge.jsx
'use client';

import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  running: { label: 'Running', dot: 'bg-green-400 animate-pulse', badge: 'bg-green-50 text-green-700 border-green-200' },
  paused: { label: 'Paused', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200' },
  failed: { label: 'Failed', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
  archived: { label: 'Archived', dot: 'bg-gray-300', badge: 'bg-gray-50 text-gray-500 border-gray-200' },
};

/**
 * @param {'scheduled'|'running'|'paused'|'completed'|'cancelled'|'failed'|'archived'} status
 * @param {boolean} isReadyToStart — shows pulsing green "Ready to Start" variant
 * @param {boolean} isPausedForNight — shows moon variant for running-but-outside-window
 */
export function CampaignStatusBadge({ status, isReadyToStart = false, isPausedForNight = false }) {
  let config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  let label = config.label;
  let dotClass = config.dot;
  let badgeClass = config.badge;

  if (isReadyToStart && status === 'scheduled') {
    label = 'Ready to Start';
    dotClass = 'bg-green-400 animate-ping';
    badgeClass = 'bg-green-50 text-green-700 border-green-300 font-semibold';
  }

  if (isPausedForNight && status === 'running') {
    label = 'Paused for night';
    dotClass = 'bg-amber-400';
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium', badgeClass)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crm/campaigns/CampaignStatusBadge.jsx
git commit -m "feat(campaigns): CampaignStatusBadge with all status variants"
```

---

## Task 2: Shared utility — campaign time-window helpers

**Files:**
- Create: `lib/campaigns/timeWindow.js`

- [ ] **Step 1: Create the helper**

```javascript
// lib/campaigns/timeWindow.js

/**
 * Returns current date and time in IST.
 * @returns {{ todayIST: string, timeIST: string }} — 'YYYY-MM-DD' and 'HH:MM'
 */
export function getNowIST() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
  return { todayIST: dateStr, timeIST: timeStr.slice(0, 5) };
}

/**
 * Returns whether a campaign is "ready to start" —
 * status=scheduled, today=start_date, and current time is within the calling window.
 */
export function isReadyToStart(campaign) {
  if (campaign.status !== 'scheduled') return false;
  const { todayIST, timeIST } = getNowIST();
  return (
    todayIST === campaign.start_date &&
    (!campaign.time_start || timeIST >= campaign.time_start) &&
    (!campaign.time_end || timeIST <= campaign.time_end)
  );
}

/**
 * Returns whether a running campaign is currently outside its time window.
 */
export function isRunningButPausedForNight(campaign) {
  if (campaign.status !== 'running') return false;
  const { timeIST } = getNowIST();
  if (!campaign.time_start || !campaign.time_end) return false;
  return timeIST < campaign.time_start || timeIST > campaign.time_end;
}

/**
 * Returns the human-readable reason why Start/Resume is disabled, or null if allowed.
 */
export function getStartBlockReason(campaign, orgCredits, subscriptionStatus) {
  const { todayIST, timeIST } = getNowIST();

  if (campaign.start_date && todayIST < campaign.start_date) {
    const d = new Date(campaign.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Campaign starts on ${d}`;
  }
  if (campaign.end_date && todayIST > campaign.end_date) {
    return 'Campaign end date has passed — edit to extend';
  }
  if (campaign.time_start && timeIST < campaign.time_start) {
    return `Calling window opens at ${campaign.time_start}`;
  }
  if (campaign.time_end && timeIST > campaign.time_end) {
    return `Today's calling window closed at ${campaign.time_end}`;
  }
  if (campaign.dnd_compliance !== false && (timeIST < '09:00' || timeIST > '21:00')) {
    return 'DND rules: calls only 9 AM–9 PM IST';
  }
  if (typeof orgCredits === 'number' && orgCredits < 1) {
    return 'Insufficient call credits — top up to start';
  }
  if (!['active', 'trialing'].includes(subscriptionStatus)) {
    return 'Your subscription is inactive';
  }
  if (!campaign.total_enrolled || campaign.total_enrolled === 0) {
    return 'No leads enrolled — enroll leads first';
  }
  return null; // no block
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/campaigns/timeWindow.js
git commit -m "feat(campaigns): shared IST time-window helpers for UI"
```

---

## Task 3: CampaignActionButton component

**Files:**
- Create: `components/crm/campaigns/CampaignActionButton.jsx`

- [ ] **Step 1: Create the component**

```jsx
// components/crm/campaigns/CampaignActionButton.jsx
'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStartBlockReason, isRunningButPausedForNight } from '@/lib/campaigns/timeWindow';

/**
 * Primary action button for a campaign — handles all status states with
 * correct disabled conditions and tooltip explanations.
 *
 * @param {object} campaign
 * @param {number|null} orgCredits — org's current call credit minutes
 * @param {string} subscriptionStatus — org subscription status
 * @param {boolean} canRun — has run_campaigns permission
 * @param {boolean} canEdit — has edit_campaigns permission
 * @param {Function} onStart
 * @param {Function} onPause
 * @param {Function} onResume
 * @param {Function} onArchive
 * @param {boolean} isLoading
 * @param {string} [className]
 */
export function CampaignActionButton({
  campaign,
  orgCredits,
  subscriptionStatus,
  canRun,
  canEdit,
  onStart,
  onPause,
  onResume,
  onArchive,
  isLoading = false,
  className,
}) {
  const { status } = campaign;
  const pausedForNight = isRunningButPausedForNight(campaign);

  // --- Running ---
  if (status === 'running') {
    if (pausedForNight) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className={cn('gap-2 cursor-default', className)} disabled>
                <Moon className="w-4 h-4" />
                Paused for night
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Outside calling window. Resumes automatically at {campaign.time_start}.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Button
        variant="outline"
        className={cn('gap-2 border-amber-300 text-amber-700 hover:bg-amber-50', className)}
        onClick={onPause}
        disabled={isLoading || !canRun}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Pause
      </Button>
    );
  }

  // --- Paused ---
  if (status === 'paused') {
    const blockReason = canRun ? getStartBlockReason(campaign, orgCredits, subscriptionStatus) : null;
    const isDisabled = !canRun || !!blockReason || isLoading;
    const tooltipText = !canRun
      ? "You don't have permission to run campaigns"
      : blockReason;

    const btn = (
      <Button
        className={cn('gap-2 bg-green-600 hover:bg-green-700 text-white', className)}
        onClick={onResume}
        disabled={isDisabled}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (!canRun ? <Lock className="w-4 h-4" /> : null)}
        Resume
      </Button>
    );

    if (!isDisabled) return btn;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
          <TooltipContent><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // --- Scheduled ---
  if (status === 'scheduled') {
    const blockReason = canRun ? getStartBlockReason(campaign, orgCredits, subscriptionStatus) : null;
    const isDisabled = !canRun || !!blockReason || isLoading;
    const tooltipText = !canRun
      ? "You don't have permission to run campaigns"
      : blockReason;

    const btn = (
      <Button
        className={cn('gap-2 bg-green-600 hover:bg-green-700 text-white', className)}
        onClick={onStart}
        disabled={isDisabled}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (!canRun ? <Lock className="w-4 h-4" /> : null)}
        Start Campaign
      </Button>
    );

    if (!isDisabled) return btn;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
          <TooltipContent><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // --- Terminal: completed, cancelled, failed ---
  if (['completed', 'cancelled', 'failed'].includes(status)) {
    return (
      <Button
        variant="outline"
        className={cn('gap-2 text-gray-600', className)}
        onClick={onArchive}
        disabled={isLoading || !canEdit}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Archive
      </Button>
    );
  }

  // --- Archived: no action ---
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crm/campaigns/CampaignActionButton.jsx
git commit -m "feat(campaigns): CampaignActionButton with exhaustive disabled states + tooltips"
```

---

## Task 4: CampaignCard component

**Files:**
- Create: `components/crm/campaigns/CampaignCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
// components/crm/campaigns/CampaignCard.jsx
'use client';

import { useRouter } from 'next/navigation';
import { Building2, Calendar, Clock, Phone, UserPlus, X, CheckCircle, Pencil, Trash2, ArchiveIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignActionButton } from './CampaignActionButton';
import { isReadyToStart, isRunningButPausedForNight } from '@/lib/campaigns/timeWindow';

/**
 * @param {object} campaign
 * @param {object} permissions — { canRun, canEdit, canDelete, canCreate }
 * @param {number|null} orgCredits
 * @param {string} subscriptionStatus
 * @param {object} mutations — { start, pause, resume, cancel, archive, delete, enroll }
 * @param {object} loadingStates — { starting, pausing, resuming, cancelling, archiving, deleting }
 */
export function CampaignCard({ campaign, permissions, orgCredits, subscriptionStatus, mutations, loadingStates }) {
  const router = useRouter();
  const { canRun, canEdit, canDelete } = permissions;
  const readyToStart = isReadyToStart(campaign);
  const pausedForNight = isRunningButPausedForNight(campaign);
  const isTerminal = ['completed', 'cancelled', 'failed', 'archived'].includes(campaign.status);
  const isActive = ['running', 'paused'].includes(campaign.status);
  const hasCallHistory = (campaign.total_calls || 0) > 0;

  const sentimentEmoji = !campaign.avg_sentiment_score ? null
    : campaign.avg_sentiment_score > 0.3 ? '😊'
    : campaign.avg_sentiment_score < -0.1 ? '😞' : '😐';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm leading-tight">{campaign.name}</h3>
          <div className="mt-1.5">
            <CampaignStatusBadge
              status={campaign.status}
              isReadyToStart={readyToStart}
              isPausedForNight={pausedForNight}
            />
          </div>
        </div>
        {/* Edit / Delete */}
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && !isTerminal && campaign.status !== 'archived' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/dashboard/admin/crm/campaigns/${campaign.id}?tab=settings`)}>
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </Button>
          )}
          {canDelete && campaign.status === 'scheduled' && !hasCallHistory && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone. The campaign and all its settings will be permanently deleted.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => mutations.delete(campaign.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canEdit && campaign.status === 'scheduled' && hasCallHistory && (
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Archive instead of delete" onClick={() => mutations.archive(campaign.id)}>
              <ArchiveIcon className="w-3.5 h-3.5 text-gray-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 flex-1 space-y-2">
        {/* Projects */}
        {campaign.projects?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {campaign.projects.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                <Building2 className="w-3 h-3" />{p.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {campaign.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{campaign.description}</p>
        )}

        {/* Schedule */}
        <div className="space-y-0.5">
          {(campaign.start_date || campaign.end_date) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{campaign.start_date} – {campaign.end_date}</span>
            </div>
          )}
          {(campaign.time_start || campaign.time_end) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{campaign.time_start} – {campaign.time_end}</span>
              {pausedForNight && <span className="text-amber-600 font-medium">· Resumes at {campaign.time_start}</span>}
            </div>
          )}
        </div>

        {/* Stats */}
        {hasCallHistory && (
          <div className="grid grid-cols-4 gap-1 pt-1 border-t border-gray-50">
            <Stat label="Calls" value={campaign.total_calls} />
            <Stat label="Answered" value={campaign.answered_calls} />
            <Stat label="Transferred" value={campaign.transferred_calls} />
            <Stat label="Sentiment" value={sentimentEmoji || '—'} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 space-y-2">
        {/* Primary action */}
        <CampaignActionButton
          campaign={campaign}
          orgCredits={orgCredits}
          subscriptionStatus={subscriptionStatus}
          canRun={canRun}
          canEdit={canEdit}
          onStart={() => mutations.start(campaign.id)}
          onPause={() => mutations.pause(campaign.id)}
          onResume={() => mutations.resume(campaign.id)}
          onArchive={() => mutations.archive(campaign.id)}
          isLoading={loadingStates.starting || loadingStates.pausing || loadingStates.resuming || loadingStates.archiving}
          className="w-full"
        />

        {/* Secondary actions row */}
        <div className="flex gap-2">
          {/* Open Campaign — always visible */}
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => router.push(`/dashboard/admin/crm/campaigns/${campaign.id}`)}>
            <ExternalLink className="w-3.5 h-3.5" />
            Open Campaign
          </Button>

          {/* Enroll leads — for non-terminal, non-archived */}
          {!isTerminal && campaign.status !== 'archived' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs px-2.5" onClick={() => mutations.enroll(campaign.id)} title="Enroll leads">
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Cancel — for active campaigns */}
          {isActive && canRun && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50" title="Cancel campaign">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel campaign?</AlertDialogTitle>
                  <AlertDialogDescription>All queued calls will be stopped. Calls currently in progress will complete naturally. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Running</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => mutations.cancel(campaign.id)}>
                    Cancel Campaign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Force Complete — for active campaigns */}
          {isActive && canRun && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs px-2.5 border-purple-200 text-purple-600 hover:bg-purple-50" title="Force complete">
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark as completed?</AlertDialogTitle>
                  <AlertDialogDescription>All remaining queued calls will be cancelled. Already-completed calls are preserved.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Running</AlertDialogCancel>
                  <AlertDialogAction className="bg-purple-600 hover:bg-purple-700" onClick={() => mutations.complete(campaign.id)}>
                    Complete Campaign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-sm font-semibold text-gray-800">{value ?? '—'}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crm/campaigns/CampaignCard.jsx
git commit -m "feat(campaigns): CampaignCard with Open Campaign, contextual actions, no Pipeline button"
```

---

## Task 5: Update campaigns list page to use new CampaignCard

**Files:**
- Modify: `app/dashboard/admin/crm/campaigns/page.js`

- [ ] **Step 1: Read the current file header and CampaignCard section**

Read `app/dashboard/admin/crm/campaigns/page.js` lines 1–200 to understand imports and the existing CampaignCard definition.

- [ ] **Step 2: Replace the existing CampaignCard with an import**

Remove the inline `CampaignCard` function definition from `page.js`. Add at the top of the file:

```javascript
import { CampaignCard } from '@/components/crm/campaigns/CampaignCard';
```

- [ ] **Step 3: Remove `draft` from status filters**

Find the status filter tabs/buttons at the top of the campaigns list page. Remove `draft` from the list. The tabs should be:

```javascript
const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
  { value: 'archived', label: 'Archived' },
];
```

- [ ] **Step 4: Wire new CampaignCard props**

Where the card is rendered in the grid, replace with:

```jsx
<CampaignCard
  key={campaign.id}
  campaign={campaign}
  permissions={{ canRun, canEdit, canDelete, canCreate }}
  orgCredits={orgCredits}
  subscriptionStatus={org?.subscription_status}
  mutations={{
    start: (id) => startCampaign.mutate({ id }),
    pause: (id) => pauseCampaign.mutate({ id }),
    resume: (id) => resumeCampaign.mutate({ id }),
    cancel: (id) => cancelCampaign.mutate({ id }),
    archive: (id) => archiveCampaign.mutate({ id }),
    delete: (id) => deleteCampaign.mutate(id),
    complete: (id) => completeCampaign.mutate({ id }),
    enroll: (id) => setEnrollCampaignId(id), // opens existing enrollment dialog
  }}
  loadingStates={{
    starting: startCampaign.isPending,
    pausing: pauseCampaign.isPending,
    resuming: resumeCampaign.isPending,
    cancelling: cancelCampaign.isPending,
    archiving: archiveCampaign.isPending,
    deleting: deleteCampaign.isPending,
  }}
/>
```

- [ ] **Step 5: Remove restore/restart mutation calls**

Search the file for `useRestoreCampaign` and `useRestartCampaign` and remove those lines.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/admin/crm/campaigns/page.js
git commit -m "feat(campaigns): use new CampaignCard, remove draft tab, remove restore/restart"
```

---

## Task 6: Add analytics + pipeline movement hooks

**Files:**
- Modify: `hooks/useCampaigns.js`

- [ ] **Step 1: Read current hooks file**

Read `hooks/useCampaigns.js` in full.

- [ ] **Step 2: Add new hooks at the bottom**

```javascript
// Fetch call logs for a campaign (paginated)
async function fetchCampaignCallLogs(campaignId, { page = 1, limit = 20, status, transferred } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (transferred) params.set('transferred', 'true');
  const res = await fetch(`/api/campaigns/${campaignId}/logs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch call logs');
  return res.json();
}

export function useCampaignCallLogs(campaignId, filters = {}) {
  return useQuery({
    queryKey: ['campaign-call-logs', campaignId, filters],
    queryFn: () => fetchCampaignCallLogs(campaignId, filters),
    enabled: !!campaignId,
    staleTime: 30 * 1000,
  });
}

// Aggregate analytics derived from call logs (client-side aggregation from logs)
export function useCampaignAnalytics(campaignId) {
  return useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/logs?limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch logs for analytics');
      const data = await res.json();
      const logs = data.logs || [];

      // Group by date
      const byDate = {};
      for (const log of logs) {
        const date = log.created_at?.slice(0, 10);
        if (!date) continue;
        if (!byDate[date]) byDate[date] = { date, total: 0, answered: 0, transferred: 0, sentimentSum: 0, sentimentCount: 0 };
        byDate[date].total++;
        if (['called', 'completed'].includes(log.call_status)) byDate[date].answered++;
        if (log.transferred) byDate[date].transferred++;
        if (log.sentiment_score != null) { byDate[date].sentimentSum += log.sentiment_score; byDate[date].sentimentCount++; }
      }

      const dailyData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
        ...d,
        avgSentiment: d.sentimentCount > 0 ? +(d.sentimentSum / d.sentimentCount).toFixed(2) : null,
        transferRate: d.total > 0 ? +(d.transferred / d.total * 100).toFixed(1) : 0,
      }));

      // Interest level distribution
      const interestCounts = { high: 0, medium: 0, low: 0, none: 0 };
      for (const log of logs) {
        const lvl = log.interest_level?.toLowerCase();
        if (lvl && interestCounts[lvl] !== undefined) interestCounts[lvl]++;
        else interestCounts.none++;
      }

      // Outcome breakdown
      const outcomeCounts = { answered: 0, no_answer: 0, failed: 0 };
      for (const log of logs) {
        if (['called', 'completed'].includes(log.call_status)) outcomeCounts.answered++;
        else if (log.call_status === 'no_answer') outcomeCounts.no_answer++;
        else outcomeCounts.failed++;
      }

      return { dailyData, interestCounts, outcomeCounts, totalLogs: logs.length };
    },
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000,
  });
}

// Leads whose interest_level changed after a campaign call
export function useCampaignPipelineMovement(campaignId) {
  return useQuery({
    queryKey: ['campaign-pipeline-movement', campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/logs?limit=500`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      const logs = data.logs || [];
      // Return logs where interest_level is set (post-call AI analysis set it)
      return logs
        .filter(l => l.interest_level && l.lead)
        .map(l => ({
          leadId: l.lead_id,
          leadName: l.lead?.name,
          interestLevel: l.interest_level,
          sentimentScore: l.sentiment_score,
          callDate: l.created_at,
          callDuration: l.duration,
        }));
    },
    enabled: !!campaignId,
    staleTime: 60 * 1000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useCampaigns.js
git commit -m "feat(campaigns): add useCampaignCallLogs, useCampaignAnalytics, useCampaignPipelineMovement"
```

---

## Task 7: CampaignOverviewTab component

**Files:**
- Create: `components/crm/campaigns/CampaignOverviewTab.jsx`

- [ ] **Step 1: Create the component**

```jsx
// components/crm/campaigns/CampaignOverviewTab.jsx
'use client';

import { useCampaignProgress, useCampaignPipelineMovement } from '@/hooks/useCampaigns';
import { isRunningButPausedForNight } from '@/lib/campaigns/timeWindow';
import { getNowIST } from '@/lib/campaigns/timeWindow';
import { AlertTriangle, Moon, TrendingUp, Phone, ArrowRightLeft, Smile, Target, CalendarClock } from 'lucide-react';

export function CampaignOverviewTab({ campaign }) {
  const { data: progress } = useCampaignProgress(campaign.id, campaign.status === 'running');
  const { data: movements = [] } = useCampaignPipelineMovement(campaign.id);
  const pausedForNight = isRunningButPausedForNight(campaign);

  const { todayIST } = getNowIST();
  const endDatePassed = campaign.end_date && todayIST > campaign.end_date && campaign.status === 'running';

  const creditUsedPct = campaign.credit_cap && campaign.credit_spent
    ? Math.min(100, (campaign.credit_spent / campaign.credit_cap) * 100)
    : null;

  const conversionRate = campaign.total_calls > 0
    ? ((campaign.transferred_calls / campaign.total_calls) * 100).toFixed(1)
    : null;

  const completionRate = progress?.total > 0
    ? (((progress.called || 0) + (progress.failed || 0) + (progress.skipped || 0) + (progress.opted_out || 0)) / progress.total * 100).toFixed(0)
    : null;

  const remainingLeads = progress ? (progress.enrolled_pending || 0) + (progress.queued || 0) : 0;
  const avgCallsPerHour = 10; // conservative estimate — could be derived from call logs
  const etaHours = remainingLeads > 0 ? Math.ceil(remainingLeads / avgCallsPerHour) : null;

  return (
    <div className="space-y-6 py-4">
      {/* Banners */}
      {pausedForNight && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Moon className="w-4 h-4 shrink-0" />
          <span>Calling paused for night · Resumes at <strong>{campaign.time_start}</strong> IST</span>
        </div>
      )}
      {endDatePassed && (
        <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Campaign end date passed — calls continue until queue empties or you complete it</span>
        </div>
      )}

      {/* Credit bar */}
      {creditUsedPct !== null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Credit Usage</span>
            <span>{campaign.credit_spent} / {campaign.credit_cap} mins</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${creditUsedPct > 80 ? 'bg-red-500' : creditUsedPct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${creditUsedPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard icon={<Phone className="w-4 h-4 text-blue-500" />} label="Total Calls" value={campaign.total_calls ?? 0} />
        <MetricCard icon={<Phone className="w-4 h-4 text-green-500" />} label="Answered" value={campaign.answered_calls ?? 0} />
        <MetricCard icon={<ArrowRightLeft className="w-4 h-4 text-purple-500" />} label="Transferred" value={campaign.transferred_calls ?? 0} />
        <MetricCard icon={<Smile className="w-4 h-4 text-amber-500" />} label="Avg Sentiment"
          value={campaign.avg_sentiment_score != null ? campaign.avg_sentiment_score.toFixed(2) : '—'} />
        <MetricCard icon={<Target className="w-4 h-4 text-indigo-500" />} label="Conversion" value={conversionRate ? `${conversionRate}%` : '—'} />
        <MetricCard icon={<TrendingUp className="w-4 h-4 text-teal-500" />} label="Completion" value={completionRate ? `${completionRate}%` : '—'} />
      </div>

      {/* Today's Activity */}
      {progress && (
        <div className="border border-gray-100 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarClock className="w-4 h-4" />
            Queue Status
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Queued" value={progress.queued ?? 0} color="text-blue-600" />
            <Stat label="In Call" value={progress.calling ?? 0} color="text-green-600" />
            <Stat label="Remaining" value={remainingLeads} color="text-gray-600" />
          </div>
          {etaHours && campaign.status === 'running' && (
            <p className="text-xs text-gray-400">At current pace, ~{etaHours} hr{etaHours !== 1 ? 's' : ''} remaining</p>
          )}
        </div>
      )}

      {/* Lead Pipeline Movement */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Lead Interest After Calls</h4>
        {movements.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No lead movements yet</p>
        ) : (
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Lead</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Interest</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Sentiment</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Call Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.slice(0, 10).map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800 font-medium">{m.leadName || m.leadId}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        m.interestLevel === 'high' ? 'bg-green-100 text-green-700' :
                        m.interestLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{m.interestLevel}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{m.sentimentScore != null ? m.sentimentScore.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{m.callDate?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crm/campaigns/CampaignOverviewTab.jsx
git commit -m "feat(campaigns): CampaignOverviewTab — health bar, metrics, ETA, pipeline movement"
```

---

## Task 8: CampaignCallResultsTab component

**Files:**
- Create: `components/crm/campaigns/CampaignCallResultsTab.jsx`

- [ ] **Step 1: Create the component**

```jsx
// components/crm/campaigns/CampaignCallResultsTab.jsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCampaignCallLogs, useCampaignAnalytics } from '@/hooks/useCampaigns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Phone, ChevronDown, ChevronRight } from 'lucide-react';

const SENTIMENT_COLOR = (val) => val > 0.3 ? '#22c55e' : val < -0.1 ? '#ef4444' : '#f59e0b';
const OUTCOME_COLORS = { answered: '#22c55e', no_answer: '#f59e0b', failed: '#ef4444' };

export function CampaignCallResultsTab({ campaignId }) {
  return (
    <Tabs defaultValue="logs" className="mt-4">
      <TabsList>
        <TabsTrigger value="logs">Call Logs</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="logs"><CallLogsSubTab campaignId={campaignId} /></TabsContent>
      <TabsContent value="analytics"><AnalyticsSubTab campaignId={campaignId} /></TabsContent>
    </Tabs>
  );
}

function CallLogsSubTab({ campaignId }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const { data, isLoading } = useCampaignCallLogs(campaignId, { page, limit: 20 });
  const logs = data?.logs || [];

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading call logs...</div>;
  if (!logs.length) return <div className="py-8 text-center text-sm text-gray-400">No calls yet</div>;

  return (
    <div className="space-y-2 mt-2">
      {logs.map(log => (
        <div key={log.id} className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
          >
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-800">{log.lead?.name || log.callee_number}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  ['called','completed'].includes(log.call_status) ? 'bg-green-100 text-green-700' :
                  log.call_status === 'no_answer' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>{log.call_status}</span>
                {log.transferred && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Transferred</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : '—'} ·
                {log.sentiment_score != null ? ` Sentiment: ${log.sentiment_score.toFixed(2)}` : ''} ·
                {log.created_at?.slice(0, 10)}
              </div>
            </div>
            {expandedId === log.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedId === log.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
              {log.summary && <p className="text-sm text-gray-600 mt-3"><strong>Summary:</strong> {log.summary}</p>}
              {log.conversation_transcript && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Transcript</p>
                  <pre className="text-xs text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {log.conversation_transcript}
                  </pre>
                </div>
              )}
              {log.interest_level && <p className="text-xs text-gray-500"><strong>Interest:</strong> {log.interest_level}</p>}
            </div>
          )}
        </div>
      ))}
      {/* Pagination */}
      <div className="flex justify-between items-center pt-2">
        <button className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
        <span className="text-xs text-gray-400">Page {page}</span>
        <button className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30" disabled={logs.length < 20} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}

function AnalyticsSubTab({ campaignId }) {
  const { data, isLoading } = useCampaignAnalytics(campaignId);

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">Loading analytics...</div>;
  if (!data || data.totalLogs < 3) return <div className="py-8 text-center text-sm text-gray-400">Not enough data yet (need at least 3 calls)</div>;

  const { dailyData, interestCounts, outcomeCounts } = data;
  const outcomeData = Object.entries(outcomeCounts).map(([name, value]) => ({ name, value }));
  const interestData = Object.entries(interestCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 mt-4">
      {/* Call volume */}
      <ChartSection title="Calls per Day">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData}><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="total" fill="#6366f1" radius={[3,3,0,0]} /></BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Sentiment trend */}
      <ChartSection title="Sentiment Trend">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData.filter(d => d.avgSentiment != null)}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} /><Tooltip />
            <Line type="monotone" dataKey="avgSentiment" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Outcome + Interest side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ChartSection title="Call Outcomes">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {outcomeData.map((entry) => <Cell key={entry.name} fill={OUTCOME_COLORS[entry.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection title="Interest Distribution">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={interestData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
              <Tooltip /><Bar dataKey="value" fill="#22c55e" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      </div>

      {/* Transfer rate trend */}
      <ChartSection title="Transfer Rate (%)">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dailyData}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
            <Line type="monotone" dataKey="transferRate" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}

function ChartSection({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-600 mb-3">{title}</h4>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/crm/campaigns/CampaignCallResultsTab.jsx
git commit -m "feat(campaigns): CampaignCallResultsTab — call logs + analytics sub-tabs with charts"
```

---

## Task 9: Redesign campaign detail page — 5 tabs

**Files:**
- Modify: `app/dashboard/admin/crm/campaigns/[id]/page.js`

- [ ] **Step 1: Read the current file**

Read `app/dashboard/admin/crm/campaigns/[id]/page.js` lines 1–100 to understand imports and state structure.

- [ ] **Step 2: Update imports**

Add at the top of the file:

```javascript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignStatusBadge } from '@/components/crm/campaigns/CampaignStatusBadge';
import { CampaignActionButton } from '@/components/crm/campaigns/CampaignActionButton';
import { CampaignOverviewTab } from '@/components/crm/campaigns/CampaignOverviewTab';
import { CampaignCallResultsTab } from '@/components/crm/campaigns/CampaignCallResultsTab';
import { isReadyToStart, isRunningButPausedForNight } from '@/lib/campaigns/timeWindow';
import { AlertTriangle, X, CheckCircle, ArchiveIcon, UserPlus, AlertDialog } from 'lucide-react';
```

- [ ] **Step 3: Replace the header section**

Find the existing header with action buttons. Replace with:

```jsx
{/* Header */}
<div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
  <div className="flex-1 min-w-0">
    <h1 className="text-xl font-bold text-gray-900 truncate">{campaign.name}</h1>
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <CampaignStatusBadge
        status={campaign.status}
        isReadyToStart={isReadyToStart(campaign)}
        isPausedForNight={isRunningButPausedForNight(campaign)}
      />
      {campaign.projects?.map(p => (
        <span key={p.id} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{p.name}</span>
      ))}
    </div>
  </div>

  {/* Action buttons */}
  <div className="flex items-center gap-2 shrink-0">
    {/* Enroll leads — for non-terminal */}
    {['scheduled','running','paused'].includes(campaign.status) && (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEnrollPanel(true)}>
        <UserPlus className="w-4 h-4" />
        Enroll Leads
      </Button>
    )}
    <CampaignActionButton
      campaign={campaign}
      orgCredits={orgCredits}
      subscriptionStatus={org?.subscription_status}
      canRun={canRun}
      canEdit={canEdit}
      onStart={() => startCampaign.mutate({ id: campaign.id })}
      onPause={() => pauseCampaign.mutate({ id: campaign.id })}
      onResume={() => resumeCampaign.mutate({ id: campaign.id })}
      onArchive={() => archiveCampaign.mutate({ id: campaign.id })}
      isLoading={startCampaign.isPending || pauseCampaign.isPending || resumeCampaign.isPending || archiveCampaign.isPending}
    />
  </div>
</div>

{/* Failed banner */}
{campaign.status === 'failed' && campaign.metadata?.fail_reason && (
  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm text-red-800">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <div>
      <p className="font-medium">Campaign stopped unexpectedly</p>
      <p className="mt-0.5 text-red-700">{FAIL_REASON_MESSAGES[campaign.metadata.fail_reason] || campaign.metadata.fail_reason}</p>
    </div>
  </div>
)}
```

Add the `FAIL_REASON_MESSAGES` constant near the top of the component:

```javascript
const FAIL_REASON_MESSAGES = {
  insufficient_credits: 'Campaign stopped: insufficient call credits. Top up credits and then archive or start a new campaign.',
  subscription_lapsed: 'Campaign stopped: your subscription is inactive. Reactivate your subscription to continue.',
  all_leads_unreachable: 'Campaign stopped: all leads were unreachable after maximum retry attempts.',
  provider_error: 'Campaign stopped: persistent calling provider errors. Please contact support.',
  worker_error: 'Campaign stopped due to an internal error. Please contact support.',
};
```

- [ ] **Step 4: Replace the tabs structure**

Find the existing Tabs component (with Overview, Enrolled Leads, Call Results, Settings tabs). Replace with:

```jsx
<Tabs defaultValue={searchParams.tab || 'overview'} className="mt-2">
  <TabsList className="mb-6">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="leads">Enrolled Leads</TabsTrigger>
    <TabsTrigger value="results">Call Results</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    <CampaignOverviewTab campaign={campaign} />
  </TabsContent>

  <TabsContent value="leads">
    {/* Keep existing EnrolledLeadsTab content — just rename to match */}
    <EnrolledLeadsTab campaign={campaign} canRun={canRun} canEdit={canEdit} />
  </TabsContent>

  <TabsContent value="results">
    <CampaignCallResultsTab campaignId={campaign.id} />
  </TabsContent>

  <TabsContent value="settings">
    <SettingsTab campaign={campaign} canEdit={canEdit} />
    {/* Danger Zone — at bottom of settings */}
    <DangerZone campaign={campaign} canRun={canRun} canEdit={canEdit} canDelete={canDelete} mutations={{ cancel: cancelCampaign, complete: completeCampaign, archive: archiveCampaign, delete: deleteCampaign }} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 5: Add inline field warnings to SettingsTab**

In the SettingsTab section (or wherever the settings form fields are rendered), add warning banners next to specific fields when the campaign is running/paused:

```jsx
const isActive = ['running', 'paused'].includes(campaign.status);

// After each relevant field in the form:
// ai_script field:
{isActive && <p className="text-xs text-amber-600 mt-1">⚠ Applies to upcoming calls — not the current active call</p>}

// time_start/time_end fields:
{isActive && <p className="text-xs text-amber-600 mt-1">⚠ Applies from the next queue cycle (~4 seconds)</p>}

// dnd_compliance toggle:
{isActive && <p className="text-xs text-amber-600 mt-1">⚠ Applies immediately to the next queue cycle</p>}

// projects field:
{isActive && <p className="text-xs text-amber-600 mt-1">⚠ Adding projects enrolls new leads. Removing does not unenroll existing leads.</p>}

// credit_cap field — warn if reducing below credit_spent:
{campaign.credit_spent > 0 && <p className="text-xs text-gray-400 mt-1">Already spent: {campaign.credit_spent} mins</p>}
```

- [ ] **Step 6: Add DangerZone section**

Add this component inline at the bottom of the Settings tab:

```jsx
function DangerZone({ campaign, canRun, canEdit, canDelete, mutations }) {
  const isActive = ['running', 'paused'].includes(campaign.status);
  const isTerminal = ['completed', 'cancelled', 'failed'].includes(campaign.status);
  const hasCallHistory = (campaign.total_calls || 0) > 0;

  return (
    <div className="mt-10 border border-red-100 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>

      {/* Force Complete */}
      {isActive && canRun && (
        <DangerRow
          title="Force Complete"
          description="Mark campaign as completed now. All remaining queued calls will be cancelled."
          buttonLabel="Complete Campaign"
          buttonClass="bg-purple-600 hover:bg-purple-700"
          onConfirm={() => mutations.complete.mutate({ id: campaign.id, force: true })}
          confirmTitle="Mark as completed?"
          confirmDesc="All remaining queued calls will be cancelled. Already-completed calls and their data are preserved."
        />
      )}

      {/* Cancel */}
      {isActive && canRun && (
        <DangerRow
          title="Cancel Campaign"
          description="Stop all queued calls. Calls in progress will complete naturally. Cannot be undone."
          buttonLabel="Cancel Campaign"
          buttonClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => mutations.cancel.mutate({ id: campaign.id })}
          confirmTitle="Cancel campaign?"
          confirmDesc="All queued calls will be stopped. Calls currently in progress will complete naturally. This cannot be undone."
        />
      )}

      {/* Archive */}
      {isTerminal && canEdit && (
        <DangerRow
          title="Archive Campaign"
          description="Move to archive. All data is preserved and viewable. No further actions will be possible."
          buttonLabel="Archive"
          buttonClass="bg-gray-600 hover:bg-gray-700"
          onConfirm={() => mutations.archive.mutate({ id: campaign.id })}
          confirmTitle="Archive this campaign?"
          confirmDesc="The campaign will be moved to archive. All call logs, transcripts, and analytics remain viewable."
        />
      )}

      {/* Delete — only scheduled with no history */}
      {campaign.status === 'scheduled' && !hasCallHistory && canDelete && (
        <DangerRow
          title="Delete Campaign"
          description="Permanently delete this campaign and all its settings. Cannot be undone."
          buttonLabel="Delete Campaign"
          buttonClass="bg-red-700 hover:bg-red-800"
          onConfirm={() => mutations.delete.mutate(campaign.id)}
          confirmTitle="Delete campaign?"
          confirmDesc="This campaign will be permanently deleted. This action cannot be undone."
        />
      )}
    </div>
  );
}

function DangerRow({ title, description, buttonLabel, buttonClass, onConfirm, confirmTitle, confirmDesc }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className={`shrink-0 text-white border-0 ${buttonClass}`}>{buttonLabel}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonClass} onClick={onConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 7: Remove restore/restart buttons from the header**

Search for `useRestoreCampaign` and `useRestartCampaign` usages and button renders in this file. Remove them entirely.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/admin/crm/campaigns/[id]/page.js
git commit -m "feat(campaigns): 5-tab detail page — overview, enrolled leads, call results, settings, danger zone"
```

---

## Verification

1. Open campaigns list page → confirm no Pipeline button, see "Open Campaign" button on every card
2. Campaign with `status=scheduled` and today = start_date, within time window → confirm pulsing "Ready to Start" badge
3. Campaign `running` outside time window → confirm "Paused for night" badge and disabled primary button with tooltip
4. Click "Open Campaign" → confirm navigates to `/dashboard/admin/crm/campaigns/[id]`
5. Click Start on a campaign where today < start_date → confirm button is disabled with correct tooltip text
6. On detail page → confirm 5 tabs: Overview, Enrolled Leads, Call Results, Settings
7. Call Results → confirm two sub-tabs: Call Logs and Analytics
8. Analytics sub-tab with < 3 calls → confirm "Not enough data yet" empty state
9. Settings tab while running → confirm inline warnings appear next to ai_script, time window, dnd_compliance fields
10. Danger Zone in Settings → confirm Force Complete and Cancel only appear for running/paused, Archive for terminal, Delete only for scheduled with no history
11. Cancel confirmation dialog → confirm "Keep Running" dismisses without action
12. `failed` campaign → confirm red banner with human-readable fail_reason message
13. No `draft` in status filter tabs on list page
14. `archived` campaign card → confirm no primary action button, only "Open Campaign"
