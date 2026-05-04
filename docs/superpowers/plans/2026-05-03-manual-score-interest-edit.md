# Manual Score & Interest Level Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow agents to manually set a lead's score (0–100) and interest_level (high/medium/low/none) from both the Edit Profile dialog and directly from the sidebar intelligence badges.

**Architecture:** Two UI changes only — no backend work needed. (1) `EditLeadProfileDialog` gains a "Lead Intelligence" form section submitted with the existing PUT payload. (2) `LeadProfileSidebar` makes the score badge and interest pill interactive via a Popover and DropdownMenu respectively, each calling `PUT /api/leads/{id}` directly with optimistic local state updates.

**Tech Stack:** Next.js App Router, React, TailwindCSS, Radix UI (Popover, DropdownMenu from `components/ui/`), `react-hot-toast`

---

## Files Changed

| File | Change |
|------|--------|
| `components/crm/EditLeadProfileDialog.jsx` | Add `score` + `interest_level` fields to formData and form UI |
| `components/crm/LeadProfileSidebar.jsx` | Make score badge and interest pill interactive (Popover + DropdownMenu) |

---

## Task 1: Add score & interest_level to EditLeadProfileDialog

**Files:**
- Modify: `components/crm/EditLeadProfileDialog.jsx`

- [ ] **Step 1: Add `score` and `interest_level` to `formData` initial state**

In `EditLeadProfileDialog.jsx`, locate the `formData` useState (line 23). Add two new fields:

```js
const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectId: 'none',
    stageId: '',
    assignedTo: 'unassigned',
    phone: '',
    mobile: '',
    company: '',
    job_title: '',
    department: '',
    mailing_street: '',
    mailing_city: '',
    mailing_state: '',
    mailing_zip: '',
    mailing_country: '',
    score: '',
    interest_level: ''
})
```

- [ ] **Step 2: Populate the new fields when lead changes**

In the `useEffect` that populates the form (line 48), add `score` and `interest_level`:

```js
setFormData({
    name: lead.name || '',
    email: lead.email || '',
    projectId: lead.project_id || 'none',
    stageId: lead.stage_id || '',
    assignedTo: lead.assigned_to || 'unassigned',
    phone: lead.phone || '',
    mobile: lead.mobile || '',
    company: lead.company || '',
    job_title: lead.job_title || '',
    department: lead.department || '',
    mailing_street: lead.mailing_street || '',
    mailing_city: lead.mailing_city || '',
    mailing_state: lead.mailing_state || '',
    mailing_zip: lead.mailing_zip || '',
    mailing_country: lead.mailing_country || '',
    score: lead.score ?? '',
    interest_level: lead.interest_level || ''
})
```

- [ ] **Step 3: Include the new fields in the PUT payload**

In `handleSubmit`, add `score` and `interest_level` to the payload object (after `mailing_country`):

```js
const payload = {
    name: formData.name,
    email: formData.email,
    projectId: formData.projectId === 'none' ? null : formData.projectId,
    stageId: formData.stageId || undefined,
    assignedTo: formData.assignedTo === 'unassigned' ? null : formData.assignedTo,
    phone: formData.phone,
    mobile: formData.mobile,
    company: formData.company,
    job_title: formData.job_title,
    department: formData.department,
    mailing_street: formData.mailing_street,
    mailing_city: formData.mailing_city,
    mailing_state: formData.mailing_state,
    mailing_zip: formData.mailing_zip,
    mailing_country: formData.mailing_country,
    score: formData.score !== '' ? Number(formData.score) : undefined,
    interest_level: formData.interest_level || undefined
}
```

- [ ] **Step 4: Add the "Lead Intelligence" section to the form UI**

After the closing `</div>` of the Address section (after line 303 in original, now the last section before the overflow div closes), add:

```jsx
{/* Lead Intelligence */}
<div className="space-y-4">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Intelligence</p>

    <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="score">Score (0–100)</Label>
            <Input
                id="score"
                name="score"
                type="number"
                min={0}
                max={100}
                value={formData.score}
                onChange={handleChange}
                placeholder="Auto-set by AI"
            />
        </div>
        <div className="space-y-2">
            <Label>Interest Level</Label>
            <div className="flex gap-1.5 flex-wrap">
                {['high', 'medium', 'low', 'none'].map(level => (
                    <button
                        key={level}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, interest_level: level }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all capitalize ${
                            formData.interest_level === level
                                ? level === 'high' ? 'bg-rose-100 text-rose-700 ring-rose-300'
                                : level === 'medium' ? 'bg-amber-100 text-amber-700 ring-amber-300'
                                : level === 'low' ? 'bg-slate-200 text-slate-600 ring-slate-300'
                                : 'bg-slate-100 text-slate-500 ring-slate-200'
                                : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300'
                        }`}
                    >
                        {level === 'high' ? '🔥 High' : level === 'medium' ? '⚡ Medium' : level === 'low' ? '💤 Low' : 'None'}
                    </button>
                ))}
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 5: Verify the dialog renders and submits correctly**

Run the dev server:
```bash
yarn dev
```

Open a lead → click Edit → scroll to bottom of dialog → confirm "Lead Intelligence" section appears with a number input and 4 segmented buttons. Change both values, click Save Changes. Open the lead again and confirm the new score/interest_level are reflected.

- [ ] **Step 6: Commit**

```bash
git add components/crm/EditLeadProfileDialog.jsx
git commit -m "feat: add manual score and interest_level fields to EditLeadProfileDialog"
```

---

## Task 2: Make score badge interactive in LeadProfileSidebar (Popover)

**Files:**
- Modify: `components/crm/LeadProfileSidebar.jsx`

- [ ] **Step 1: Add imports for Popover and useState**

At the top of `LeadProfileSidebar.jsx`, add:

```js
import { useState, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

`toast` is already imported.

- [ ] **Step 2: Add props and local state for score editing**

The component signature is currently:
```js
export default function LeadProfileSidebar({ lead, project, onEditProfile, onEditAvatar, upcomingVisit }) {
```

Change it to accept an `onLeadFieldUpdate` callback:
```js
export default function LeadProfileSidebar({ lead, project, onEditProfile, onEditAvatar, upcomingVisit, onLeadFieldUpdate }) {
```

Add local state inside the component (after line 87 `if (!lead) return null`):
```js
const [scorePopoverOpen, setScorePopoverOpen] = useState(false)
const [scoreInput, setScoreInput] = useState('')
const [savingScore, setSavingScore] = useState(false)
```

- [ ] **Step 3: Add the saveScore handler**

After the state declarations, add:
```js
const saveScore = async () => {
    const val = Number(scoreInput)
    if (isNaN(val) || val < 0 || val > 100) {
        toast.error('Score must be 0–100')
        return
    }
    setSavingScore(true)
    try {
        const res = await fetch(`/api/leads/${lead.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: val })
        })
        if (!res.ok) throw new Error('Failed to update score')
        toast.success('Score updated')
        setScorePopoverOpen(false)
        onLeadFieldUpdate?.({ score: val })
    } catch {
        toast.error('Failed to update score')
    } finally {
        setSavingScore(false)
    }
}
```

- [ ] **Step 4: Replace the score badge with a Popover-wrapped version**

Find this block in the render (around line 321):
```jsx
{lead.score > 0 && (
    <div className="flex flex-col items-center gap-0.5">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ring-1 ${scoreColor(lead.score)}`}>
            {lead.score}
        </span>
        <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Score</span>
    </div>
)}
```

Replace it with:
```jsx
<div className="flex flex-col items-center gap-0.5">
    <Popover open={scorePopoverOpen} onOpenChange={(open) => {
        setScorePopoverOpen(open)
        if (open) setScoreInput(String(lead.score || ''))
    }}>
        <PopoverTrigger asChild>
            <button
                className={`text-[11px] font-black px-2 py-0.5 rounded-full ring-1 cursor-pointer hover:opacity-75 transition-opacity ${lead.score > 0 ? scoreColor(lead.score) : 'bg-slate-100 text-slate-400 ring-slate-200'}`}
                title="Click to edit score"
            >
                {lead.score > 0 ? lead.score : '—'}
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="center">
            <p className="text-xs font-semibold text-slate-600 mb-2">Edit Score (0–100)</p>
            <div className="flex gap-2">
                <Input
                    type="number"
                    min={0}
                    max={100}
                    value={scoreInput}
                    onChange={e => setScoreInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveScore()}
                    className="h-7 text-xs"
                    autoFocus
                />
                <Button size="sm" className="h-7 px-2 text-xs" onClick={saveScore} disabled={savingScore}>
                    {savingScore ? '…' : 'Save'}
                </Button>
            </div>
        </PopoverContent>
    </Popover>
    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Score</span>
</div>
```

Note: The outer `{lead.score > 0 && ...}` conditional is removed — the badge now always shows (displaying `—` when score is 0) so users can click it to add a score.

Also update the `hasIntelligence` condition (line 94) so it always shows when a lead exists:
```js
const hasIntelligence = true  // always show so score/interest are always editable
```

- [ ] **Step 5: Verify score popover**

With `yarn dev` running, open a lead sidebar, click the score badge — a small popover should appear with a number input and Save button. Change the score and save; the badge should update to the new value.

- [ ] **Step 6: Commit**

```bash
git add components/crm/LeadProfileSidebar.jsx
git commit -m "feat: add inline score edit popover to LeadProfileSidebar"
```

---

## Task 3: Make interest pill interactive in LeadProfileSidebar (DropdownMenu)

**Files:**
- Modify: `components/crm/LeadProfileSidebar.jsx`

- [ ] **Step 1: Add DropdownMenu import**

Add to the imports at the top:
```js
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
```

- [ ] **Step 2: Add state and handler for interest_level**

After `savingScore` state, add:
```js
const [savingInterest, setSavingInterest] = useState(false)
```

Add the handler:
```js
const saveInterest = async (level) => {
    setSavingInterest(true)
    try {
        const res = await fetch(`/api/leads/${lead.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interest_level: level })
        })
        if (!res.ok) throw new Error('Failed to update interest level')
        toast.success('Interest level updated')
        onLeadFieldUpdate?.({ interest_level: level })
    } catch {
        toast.error('Failed to update interest level')
    } finally {
        setSavingInterest(false)
    }
}
```

- [ ] **Step 3: Replace the interest pill with a DropdownMenu-wrapped version**

Find this block (around line 329):
```jsx
{interest && (
    <div className="flex flex-col items-center gap-0.5">
        <IntelPill label={interest.label} cls={interest.cls} />
        <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Interest</span>
    </div>
)}
```

Replace it with (always rendered, like score):
```jsx
<div className="flex flex-col items-center gap-0.5">
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <button
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap cursor-pointer hover:opacity-75 transition-opacity ${
                    interest ? interest.cls : 'bg-slate-100 text-slate-400 ring-slate-200'
                }`}
                title="Click to edit interest level"
                disabled={savingInterest}
            >
                {interest ? interest.label : '— None'}
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-36">
            {[
                { value: 'high', label: '🔥 High', cls: 'text-rose-600' },
                { value: 'medium', label: '⚡ Medium', cls: 'text-amber-600' },
                { value: 'low', label: '💤 Low', cls: 'text-slate-500' },
                { value: 'none', label: '— None', cls: 'text-slate-400' },
            ].map(opt => (
                <DropdownMenuItem
                    key={opt.value}
                    onClick={() => saveInterest(opt.value)}
                    className={`text-xs font-semibold cursor-pointer ${lead.interest_level === opt.value ? 'bg-slate-50' : ''} ${opt.cls}`}
                >
                    {opt.label}
                    {lead.interest_level === opt.value && (
                        <span className="ml-auto text-slate-400">✓</span>
                    )}
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Interest</span>
</div>
```

- [ ] **Step 4: Check where LeadProfileSidebar is used and wire up `onLeadFieldUpdate`**

Search for all usages of `LeadProfileSidebar` in the codebase:
```bash
grep -r "LeadProfileSidebar" c:/Local\ Disk\ \(E\)/0Quinite/quinite-vantage/components --include="*.jsx" --include="*.js" -l
```

For each parent that renders `<LeadProfileSidebar>`, pass an `onLeadFieldUpdate` handler that merges the partial update into the lead state used by that component. For example, if the parent has a `lead` state:

```js
// In the parent component
const [lead, setLead] = useState(initialLead)  // or however the lead is stored

<LeadProfileSidebar
    lead={lead}
    onLeadFieldUpdate={(patch) => setLead(prev => ({ ...prev, ...patch }))}
    // ...other existing props
/>
```

If the parent uses a React Query hook (e.g. `useQuery` for the lead), use the query's `setQueryData` to update the cache optimistically, or simply call `refetch()` after a successful save. The simplest approach is to add `refetch` from the query and call it in `onLeadFieldUpdate`:

```js
// If parent uses React Query
const { data: lead, refetch } = useQuery(...)

<LeadProfileSidebar
    lead={lead}
    onLeadFieldUpdate={() => refetch()}
    // ...other existing props
/>
```

- [ ] **Step 5: Verify interest dropdown**

With `yarn dev` running, open a lead sidebar, click the interest pill (or the `— None` button for leads with no interest set). A dropdown should appear with 4 options; the current value should have a `✓` checkmark. Select a different value — the pill should update immediately (after refetch or optimistic update).

- [ ] **Step 6: Commit**

```bash
git add components/crm/LeadProfileSidebar.jsx
git commit -m "feat: add inline interest_level dropdown to LeadProfileSidebar"
```

---

## Verification Checklist

- [ ] Open Edit Lead dialog → "Lead Intelligence" section visible at bottom
- [ ] Score input accepts 0–100, rejects letters
- [ ] Interest level buttons highlight the active selection
- [ ] Save dialog → changes persist (reopen dialog to confirm)
- [ ] Sidebar: score badge always visible (shows `—` when 0)
- [ ] Sidebar: click score badge → popover opens with current value pre-filled
- [ ] Sidebar: enter new score, press Enter or Save → badge updates
- [ ] Sidebar: interest pill always visible (shows `— None` when unset)
- [ ] Sidebar: click interest pill → dropdown with 4 options, current option has `✓`
- [ ] Sidebar: select new interest → pill updates to new value
- [ ] Both edits trigger pipeline automations (verify by checking `pipeline_automations` logs or Supabase `pipeline_stage_transitions` table for `interest_level_change` / `score_threshold` trigger records)
