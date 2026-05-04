# Campaigns Backend Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the campaigns backend — remove `draft` status, fix the status machine, centralize ownership checks, clean up duplicate project fields, and properly handle `cancelled`/`failed`/`auto-complete` states.

**Architecture:** DB migration removes `draft` from the status CHECK constraint and backfills `campaign_projects`. API layer gets a shared `assertCampaignOwnership` helper and canonical response shape (projects array only). Queue worker gets explicit `failed` state writes. All changes are additive or constraint-tightening — no destructive rewrites.

**Tech Stack:** Next.js API routes, Supabase/PostgreSQL, Node.js queue worker (quinite-vantage-webserver), `createAdminClient()` for all DB ops.

---

## File Map

| File | What changes |
|---|---|
| `supabase/migrations/20260503_campaigns_remove_draft.sql` | CREATE — remove draft from status CHECK, backfill campaign_projects, migrate existing draft rows |
| `services/campaign.service.js` | ADD `assertCampaignOwnership()`, fix `getCampaignById` to return `projects` array, remove `project_id`/`project_ids` from responses |
| `app/api/campaigns/route.js` | Remove draft default on create, use canonical response shape |
| `app/api/campaigns/[id]/route.js` | Add `assertCampaignOwnership`, use canonical response, unlock all fields for editing with audit |
| `app/api/campaigns/[id]/start/route.js` | Add all 9 blocking guards, fix credit check to use minutes not INR |
| `app/api/campaigns/[id]/resume/route.js` | Same 9 guards as start |
| `app/api/campaigns/[id]/cancel/route.js` | Fix: only running/paused allowed; call_queue queued→deleted not failed; in-flight processing left alone |
| `app/api/campaigns/[id]/complete/route.js` | Fix: finalize stats always, write completed_at |
| `app/api/campaigns/[id]/archive/route.js` | Add `failed` as archivable status |
| `quinite-vantage-webserver/queueWorker.js` | Add failed-state writes for subscription lapse, credit exhaustion, all-leads-unreachable; fix mid-run enrollment pickup |

---

## Task 1: DB Migration — Remove Draft, Backfill campaign_projects

**Files:**
- Create: `supabase/migrations/20260503_campaigns_remove_draft.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Remove 'draft' from campaigns.status and migrate any existing draft rows to 'scheduled'.
-- Backfill campaign_projects for campaigns that only have project_id set.

-- 1. Migrate existing draft campaigns to scheduled
UPDATE public.campaigns
SET status = 'scheduled', updated_at = now()
WHERE status = 'draft';

-- 2. Drop old status CHECK constraint
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- 3. Add new CHECK constraint without 'draft'
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status = ANY (ARRAY[
    'scheduled'::text,
    'running'::text,
    'paused'::text,
    'completed'::text,
    'cancelled'::text,
    'archived'::text,
    'failed'::text
  ]));

-- 4. Fix DEFAULT value (was 'draft')
ALTER TABLE public.campaigns
  ALTER COLUMN status SET DEFAULT 'scheduled';

-- 5. Backfill campaign_projects for campaigns that have project_id but no junction row
INSERT INTO public.campaign_projects (campaign_id, project_id, created_at)
SELECT c.id, c.project_id, c.created_at
FROM public.campaigns c
WHERE c.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_projects cp
    WHERE cp.campaign_id = c.id
  )
ON CONFLICT (campaign_id, project_id) DO NOTHING;
```

- [ ] **Step 2: Apply the migration**

```bash
# From quinite-vantage directory
npx supabase db push
```

Expected: migration applies without error. Verify:
```sql
-- Should return 0 rows
SELECT id, status FROM campaigns WHERE status = 'draft';
-- Should show 'scheduled' as default
\d campaigns
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260503_campaigns_remove_draft.sql
git commit -m "feat(campaigns): remove draft status, backfill campaign_projects"
```

---

## Task 2: assertCampaignOwnership + Canonical Response in campaign.service.js

**Files:**
- Modify: `services/campaign.service.js`

- [ ] **Step 1: Add `assertCampaignOwnership` helper**

Open `services/campaign.service.js`. Add this static method to the `CampaignService` class (or as a standalone export if the file uses module-level functions — match the existing pattern):

```javascript
// Add near the top of the file, after existing imports/helpers
export async function assertCampaignOwnership(adminClient, campaignId, organizationId) {
  const { data: campaign, error } = await adminClient
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  if (campaign.organization_id !== organizationId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return campaign;
}
```

- [ ] **Step 2: Fix `getCampaignById` to return canonical `projects` array**

Find the `getCampaignById` function. Replace or add the projects join so the returned object always has `projects: [{id, name}]` and never includes `project_id` or `project_ids`:

```javascript
// Inside getCampaignById, after fetching the campaign row:
const { data: projectRows } = await adminClient
  .from('campaign_projects')
  .select('project:projects(id, name)')
  .eq('campaign_id', campaignId);

const projects = (projectRows || []).map(r => r.project).filter(Boolean);

// Strip legacy fields from the returned object
const { project_id, project_ids, ...cleanCampaign } = campaign;
return { ...cleanCampaign, projects };
```

- [ ] **Step 3: Commit**

```bash
git add services/campaign.service.js
git commit -m "feat(campaigns): add assertCampaignOwnership, canonical projects response"
```

---

## Task 3: Harden cancel route

**Files:**
- Modify: `app/api/campaigns/[id]/cancel/route.js`

- [ ] **Step 1: Read the current file**

Read `app/api/campaigns/[id]/cancel/route.js` in full.

- [ ] **Step 2: Replace handler body**

The current route allows cancelling `draft` and `scheduled` campaigns and sets call_queue to `failed`. Fix:
- Only allow `running` or `paused`
- Delete `queued` call_queue rows (not set to failed)
- Leave `processing` rows alone (in-flight calls complete naturally)
- Set `campaign_leads` with `enrolled` or `queued` → `skipped` with `skip_reason: 'campaign_cancelled'`
- Leave `calling` leads alone (call end handler updates them)

```javascript
import { createAdminClient } from '@/lib/supabase/admin';
import { withPermission } from '@/lib/middleware/withAuth';
import { assertCampaignOwnership } from '@/services/campaign.service';
import { logAudit } from '@/lib/audit';

export const POST = withPermission('edit_campaigns', async (req, { params }) => {
  const { id } = await params;
  const { user, profile } = req;
  const adminClient = createAdminClient();

  const campaign = await assertCampaignOwnership(adminClient, id, profile.organization_id);

  if (!['running', 'paused'].includes(campaign.status)) {
    // Re-fetch full row to get status
    const { data: full } = await adminClient.from('campaigns').select('status').eq('id', id).single();
    if (!['running', 'paused'].includes(full?.status)) {
      return Response.json(
        { error: `Cannot cancel a campaign with status '${full?.status}'. Only running or paused campaigns can be cancelled.` },
        { status: 409 }
      );
    }
  }

  // Delete queued call_queue entries — in-flight (processing) are left to complete naturally
  await adminClient
    .from('call_queue')
    .delete()
    .eq('campaign_id', id)
    .eq('status', 'queued');

  // Skip enrolled/queued leads
  await adminClient
    .from('campaign_leads')
    .update({ status: 'skipped', skip_reason: 'campaign_cancelled', updated_at: new Date().toISOString() })
    .eq('campaign_id', id)
    .in('status', ['enrolled', 'queued']);

  // Set campaign cancelled
  await adminClient
    .from('campaigns')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  await logAudit(adminClient, {
    organization_id: profile.organization_id,
    performed_by: user.id,
    action: 'campaign.cancelled',
    resource_type: 'campaign',
    resource_id: id,
  });

  return Response.json({ success: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/campaigns/[id]/cancel/route.js
git commit -m "fix(campaigns): cancel only running/paused, delete queued items, leave in-flight"
```

---

## Task 4: Fix archive route — allow failed status

**Files:**
- Modify: `app/api/campaigns/[id]/archive/route.js`

- [ ] **Step 1: Read current file**

Read `app/api/campaigns/[id]/archive/route.js`.

- [ ] **Step 2: Add `failed` to archivable statuses**

Find the status guard that currently checks `completed` or `cancelled`. Add `failed`:

```javascript
if (!['completed', 'cancelled', 'failed'].includes(campaign.status)) {
  return Response.json(
    { error: `Cannot archive a campaign with status '${campaign.status}'. Only completed, cancelled, or failed campaigns can be archived.` },
    { status: 409 }
  );
}
```

- [ ] **Step 3: Add `assertCampaignOwnership` call**

Add at the top of the handler after getting `profile`:

```javascript
const campaign = await assertCampaignOwnership(adminClient, id, profile.organization_id);
```

- [ ] **Step 4: Commit**

```bash
git add app/api/campaigns/[id]/archive/route.js
git commit -m "fix(campaigns): allow archiving failed campaigns, add ownership check"
```

---

## Task 5: Fix start/resume route — 9 blocking guards + credit minutes

**Files:**
- Modify: `app/api/campaigns/[id]/start/route.js`
- Modify: `app/api/campaigns/[id]/resume/route.js`

- [ ] **Step 1: Read both files in full**

Read `app/api/campaigns/[id]/start/route.js` and `app/api/campaigns/[id]/resume/route.js`.

- [ ] **Step 2: Extract shared validation into campaign.service.js**

Add this function to `services/campaign.service.js`:

```javascript
/**
 * Validates all preconditions for starting or resuming a campaign.
 * Returns { valid: true } or { valid: false, error: string, code: string }
 * All date/time checks are performed in Asia/Kolkata (IST).
 */
export function validateCampaignStartConditions(campaign, orgCredits, subscriptionStatus) {
  const nowIST = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', hour12: false });
  const [datePart, timePart] = nowIST.split(', ');
  const todayIST = datePart; // YYYY-MM-DD
  const timeIST = timePart?.slice(0, 5); // HH:MM

  // 1. Before start_date
  if (campaign.start_date && todayIST < campaign.start_date) {
    const d = new Date(campaign.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return { valid: false, code: 'BEFORE_START_DATE', error: `Campaign starts on ${d}. Adjust the date or come back then.` };
  }

  // 2. After end_date
  if (campaign.end_date && todayIST > campaign.end_date) {
    return { valid: false, code: 'AFTER_END_DATE', error: 'Campaign end date has passed. Edit the end date to extend it.' };
  }

  // 3. Before time window
  if (campaign.time_start && timeIST < campaign.time_start) {
    return { valid: false, code: 'BEFORE_TIME_WINDOW', error: `Calling window opens at ${campaign.time_start}. Come back then.` };
  }

  // 4. After time window
  if (campaign.time_end && timeIST > campaign.time_end) {
    return { valid: false, code: 'AFTER_TIME_WINDOW', error: `Today's calling window has closed (${campaign.time_end}). Come back tomorrow.` };
  }

  // 5. DND compliance
  if (campaign.dnd_compliance !== false && (timeIST < '09:00' || timeIST > '21:00')) {
    return { valid: false, code: 'DND_VIOLATION', error: 'DND rules restrict calls to 9 AM–9 PM IST.' };
  }

  // 6. Credits (minutes)
  if (typeof orgCredits === 'number' && orgCredits < 1) {
    return { valid: false, code: 'INSUFFICIENT_CREDITS', error: 'Insufficient call credits. Top up to start.' };
  }

  // 7. Subscription
  if (!['active', 'trialing'].includes(subscriptionStatus)) {
    return { valid: false, code: 'SUBSCRIPTION_INACTIVE', error: 'Your subscription is inactive.' };
  }

  return { valid: true };
}
```

- [ ] **Step 3: Update start route to use shared validation**

In `app/api/campaigns/[id]/start/route.js`, replace the inline date/time/credit checks with:

```javascript
import { assertCampaignOwnership, validateCampaignStartConditions } from '@/services/campaign.service';

// After fetching campaign and org data:
const validation = validateCampaignStartConditions(campaign, orgCredits, org.subscription_status);
if (!validation.valid) {
  return Response.json({ error: validation.error, code: validation.code }, { status: 422 });
}
```

- [ ] **Step 4: Update resume route the same way**

In `app/api/campaigns/[id]/resume/route.js`, replace inline checks with the same `validateCampaignStartConditions` call. Add `assertCampaignOwnership` at the top.

- [ ] **Step 5: Commit**

```bash
git add services/campaign.service.js app/api/campaigns/[id]/start/route.js app/api/campaigns/[id]/resume/route.js
git commit -m "feat(campaigns): shared start/resume validation — 9 blocking guards, credit minutes"
```

---

## Task 6: Fix [id]/route.js — ownership check, unlock all fields, canonical response

**Files:**
- Modify: `app/api/campaigns/[id]/route.js`

- [ ] **Step 1: Read current file**

Read `app/api/campaigns/[id]/route.js` in full.

- [ ] **Step 2: Add ownership check to GET and PUT and DELETE handlers**

At the top of each handler in the file, add:

```javascript
import { assertCampaignOwnership } from '@/services/campaign.service';

// In GET handler:
await assertCampaignOwnership(adminClient, id, profile.organization_id);

// In PUT handler (replace existing org check):
await assertCampaignOwnership(adminClient, id, profile.organization_id);

// In DELETE handler:
await assertCampaignOwnership(adminClient, id, profile.organization_id);
```

- [ ] **Step 3: Remove field locks on PUT, allow all fields while running with audit**

In the PUT handler, remove the block that rejects edits to `project_id`, `project_ids`, `start_date`, `end_date` when running. Replace with audit logging for sensitive mid-run changes:

```javascript
const isRunning = ['running', 'paused'].includes(campaign.status);
const sensitiveFields = ['ai_script', 'call_settings', 'time_start', 'time_end', 'dnd_compliance'];
const changedSensitive = sensitiveFields.filter(f => body[f] !== undefined && body[f] !== campaign[f]);

if (isRunning && changedSensitive.length > 0) {
  await logAudit(adminClient, {
    organization_id: profile.organization_id,
    performed_by: user.id,
    action: 'campaign.mid_run_edit',
    resource_type: 'campaign',
    resource_id: id,
    metadata: { changed_fields: changedSensitive },
  });
}
```

- [ ] **Step 4: Fix GET response to use canonical shape**

In the GET handler, replace the response construction to call `getCampaignById` from the service (which now returns the canonical shape with `projects` array):

```javascript
import { getCampaignById } from '@/services/campaign.service';

// In GET handler:
const campaign = await getCampaignById(id, profile.organization_id, adminClient);
return Response.json({ campaign });
```

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/[id]/route.js
git commit -m "feat(campaigns): ownership check, unlock all fields mid-run, canonical response"
```

---

## Task 7: Fix route.js (list/create) — remove draft default, canonical response

**Files:**
- Modify: `app/api/campaigns/route.js`

- [ ] **Step 1: Read current file**

Read `app/api/campaigns/route.js` in full.

- [ ] **Step 2: Fix POST to default to `scheduled`**

Find the campaign insert in the POST handler. Ensure `status` defaults to `'scheduled'` (not `'draft'`):

```javascript
const campaignData = {
  ...body,
  status: 'scheduled', // always scheduled on create — draft is removed
  organization_id: profile.organization_id,
  created_by: user.id,
};
```

- [ ] **Step 3: Remove `project_id` / `project_ids` from POST body handling**

The POST already writes to `campaign_projects`. Ensure the response does not include `project_id` or `project_ids`. After creating the campaign, fetch via `getCampaignById` and return that canonical shape.

- [ ] **Step 4: Fix GET list response**

In the GET handler, for each campaign in the list, join `campaign_projects` to build a `projects` array and strip `project_id`/`project_ids` from the returned objects.

```javascript
// After fetching campaigns list:
const campaignIds = campaigns.map(c => c.id);
const { data: allProjectRows } = await adminClient
  .from('campaign_projects')
  .select('campaign_id, project:projects(id, name)')
  .in('campaign_id', campaignIds);

const projectsByCampaign = {};
for (const row of allProjectRows || []) {
  if (!projectsByCampaign[row.campaign_id]) projectsByCampaign[row.campaign_id] = [];
  if (row.project) projectsByCampaign[row.campaign_id].push(row.project);
}

const result = campaigns.map(({ project_id, project_ids, ...c }) => ({
  ...c,
  projects: projectsByCampaign[c.id] || [],
}));
```

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/route.js
git commit -m "feat(campaigns): scheduled default on create, canonical list/create response"
```

---

## Task 8: Queue Worker — failed state writes + mid-run enrollment pickup

**Files:**
- Modify: `quinite-vantage-webserver/queueWorker.js`

- [ ] **Step 1: Read the current file**

Read `quinite-vantage-webserver/queueWorker.js` in full (already done above — use the content captured earlier).

- [ ] **Step 2: Add credit exhaustion → failed write**

The current worker skips leads with `NO_CREDITS` but never marks the campaign as `failed`. Add a check after the credit check loop. Add a new helper function at the bottom of `queueWorker.js`:

```javascript
// Track per-campaign credit failure start times in memory
const creditFailureSince = {};

async function checkCreditExhaustion(campaignId, orgId) {
  const creditsAvailable = await hasAvailableCredits(orgId);
  if (creditsAvailable) {
    delete creditFailureSince[campaignId];
    return;
  }

  if (!creditFailureSince[campaignId]) {
    creditFailureSince[campaignId] = Date.now();
    return;
  }

  const elapsed = Date.now() - creditFailureSince[campaignId];
  if (elapsed >= 30 * 60 * 1000) {
    // 30 minutes without credits — mark campaign failed
    await supabase.from('campaigns').update({
      status: 'failed',
      metadata: supabase.rpc ? undefined : {}, // preserve existing metadata via separate call
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId).eq('status', 'running');

    // Store fail_reason in metadata separately
    await supabase.from('campaigns')
      .update({ metadata: { fail_reason: 'insufficient_credits', failed_at: new Date().toISOString() } })
      .eq('id', campaignId);

    delete creditFailureSince[campaignId];
    logger.error('Campaign failed — insufficient credits for 30 min', { campaignId, orgId });
  }
}
```

- [ ] **Step 3: Add all-leads-unreachable → failed write**

Add a new helper that checks if all leads hit max_attempts and 0 calls were made:

```javascript
async function checkAllLeadsUnreachable(campaignId) {
  const { data: leads } = await supabase
    .from('campaign_leads')
    .select('status')
    .eq('campaign_id', campaignId);

  if (!leads?.length) return;

  const terminal = ['called', 'failed', 'skipped', 'opted_out', 'archived'];
  const allTerminal = leads.every(l => terminal.includes(l.status));
  if (!allTerminal) return;

  const calledCount = leads.filter(l => l.status === 'called').length;
  if (calledCount > 0) return; // At least one call succeeded — auto-complete handles this

  // 0 calls made, all leads in terminal state — mark failed
  await supabase.from('campaigns').update({
    status: 'failed',
    updated_at: new Date().toISOString(),
  }).eq('id', campaignId).eq('status', 'running');

  await supabase.from('campaigns')
    .update({ metadata: { fail_reason: 'all_leads_unreachable', failed_at: new Date().toISOString() } })
    .eq('id', campaignId);

  logger.error('Campaign failed — all leads unreachable', { campaignId });
}
```

- [ ] **Step 4: Add subscription lapse → failed write**

In the `queueItems` filter section of `processQueue`, add:

```javascript
// After filtering by campaign status and subscription status:
const lapsedCampaignIds = (rawItems || [])
  .filter(item => {
    const campStatus = item.campaign?.status;
    const subStatus = item.campaign?.organization?.subscription_status;
    return campStatus === 'running' && !['active', 'trialing'].includes(subStatus);
  })
  .map(item => item.campaign_id)
  .filter((v, i, a) => a.indexOf(v) === i); // unique

for (const campaignId of lapsedCampaignIds) {
  await supabase.from('campaigns').update({
    status: 'failed',
    updated_at: new Date().toISOString(),
  }).eq('id', campaignId).eq('status', 'running');
  await supabase.from('campaigns')
    .update({ metadata: { fail_reason: 'subscription_lapsed', failed_at: new Date().toISOString() } })
    .eq('id', campaignId);
  logger.error('Campaign failed — subscription lapsed', { campaignId });
}
```

- [ ] **Step 5: Call the new checks in processQueue**

At the end of `processQueue`, after `Promise.allSettled`, add:

```javascript
// Check for campaigns that need to be marked failed
const runningCampaignIds = [...new Set(queueItems.map(i => i.campaign_id).filter(Boolean))];
await Promise.allSettled(runningCampaignIds.map(async (campaignId) => {
  const item = queueItems.find(i => i.campaign_id === campaignId);
  const orgId = item?.organization_id || item?.campaign?.organization_id;
  if (orgId) await checkCreditExhaustion(campaignId, orgId);
  await checkAllLeadsUnreachable(campaignId);
}));
```

- [ ] **Step 6: Ensure mid-run enrolled leads get queued**

In `processQueue`, the current query only fetches `call_queue` items. Newly enrolled leads (in `campaign_leads` with `status='enrolled'`) won't be picked up until they're inserted into `call_queue`. Add a step that inserts missing enrolled leads into the queue:

```javascript
async function enqueueNewlyEnrolledLeads() {
  // Find campaign_leads with status=enrolled that have no call_queue row
  const { data: unenqueued } = await supabase
    .from('campaign_leads')
    .select('campaign_id, lead_id, organization_id, campaign:campaigns(status)')
    .eq('status', 'enrolled')
    .not('campaign_id', 'is', null);

  const eligible = (unenqueued || []).filter(r => r.campaign?.status === 'running');
  if (!eligible.length) return;

  // Check which ones already have a call_queue row
  const pairs = eligible.map(r => `(campaign_id.eq.${r.campaign_id},lead_id.eq.${r.lead_id})`);
  // Use a simpler approach: bulk insert with ON CONFLICT DO NOTHING
  const inserts = eligible.map(r => ({
    campaign_id: r.campaign_id,
    lead_id: r.lead_id,
    organization_id: r.organization_id,
    status: 'queued',
    priority: 5,
  }));

  if (inserts.length > 0) {
    await supabase.from('call_queue').upsert(inserts, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true });
    await supabase.from('campaign_leads')
      .update({ status: 'queued', updated_at: new Date().toISOString() })
      .in('campaign_id', eligible.map(r => r.campaign_id))
      .in('lead_id', eligible.map(r => r.lead_id))
      .eq('status', 'enrolled');
  }
}
```

Add `enqueueNewlyEnrolledLeads()` call in the `setInterval(processQueue, ...)` loop — call it once per cycle:

```javascript
async function processQueue() {
  try {
    await enqueueNewlyEnrolledLeads(); // pick up any newly enrolled leads
    // ... rest of existing processQueue logic
  }
}
```

- [ ] **Step 7: Commit**

```bash
# From quinite-vantage-webserver directory
git add queueWorker.js
git commit -m "feat(campaigns): failed state writes, mid-run enrollment pickup in queue worker"
```

---

## Task 9: Remove restore/restart hooks (useCampaigns.js cleanup)

**Files:**
- Modify: `hooks/useCampaigns.js`

- [ ] **Step 1: Remove useRestoreCampaign and useRestartCampaign hooks**

Open `hooks/useCampaigns.js`. Find and remove:
- `useRestoreCampaign()` — restore is no longer supported
- `useRestartCampaign()` — restart is no longer supported

Also remove `fetchCampaignProgress` refetch when status is anything other than `running` (the 4s poll only makes sense while running).

- [ ] **Step 2: Verify no other files import the removed hooks**

```bash
grep -r "useRestoreCampaign\|useRestartCampaign" app/ components/ --include="*.js" --include="*.jsx"
```

Expected: only the detail page (`app/dashboard/admin/crm/campaigns/[id]/page.js`) — will be cleaned up in the frontend plan.

- [ ] **Step 3: Commit**

```bash
git add hooks/useCampaigns.js
git commit -m "feat(campaigns): remove restore/restart hooks — no longer in lifecycle"
```

---

## Verification

Run through these manually after all tasks are complete:

1. Create a campaign via the UI → confirm DB shows `status='scheduled'` (not `draft`)
2. Call `GET /api/campaigns/[id]` → confirm response has `projects: [...]` and no `project_id` or `project_ids` fields
3. Call `POST /api/campaigns/[id]/cancel` on a `scheduled` campaign → expect 409
4. Call `POST /api/campaigns/[id]/cancel` on a `running` campaign → expect 200, call_queue queued rows deleted, leads skipped
5. Call `POST /api/campaigns/[id]/archive` on a `failed` campaign → expect 200
6. Call `POST /api/campaigns/[id]/start` with a campaign where today < start_date → expect 422 with `BEFORE_START_DATE` code
7. Call `POST /api/campaigns/[id]/start` with another org's campaign ID → expect 403
8. Call `PUT /api/campaigns/[id]` with `ai_script` change while running → expect 200 + audit log entry
9. Enroll a lead to a running campaign → confirm queue worker picks it up within 4s
10. Check DB: `SELECT status FROM campaigns WHERE status = 'draft'` → returns 0 rows
