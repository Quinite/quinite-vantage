// Stage name pattern matching for site visit pipeline gates.
// We match by name because users control stage naming — there are no hardcoded IDs.
// Patterns are case-insensitive and tolerate spacing variations.

const SCHEDULED_RE = /site[\s-]*visit[\s-]*scheduled/i
const DONE_RE      = /site[\s-]*visit[\s-]*(done|completed?)/i

export function isSiteVisitScheduledStage(stageName) {
    return SCHEDULED_RE.test(stageName ?? '')
}

export function isSiteVisitDoneStage(stageName) {
    return DONE_RE.test(stageName ?? '')
}

export function isSiteVisitStage(stageName) {
    return isSiteVisitScheduledStage(stageName) || isSiteVisitDoneStage(stageName)
}

export const VISIT_STATUS_COLORS = {
    scheduled:  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
    completed:  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    cancelled:  { bg: 'bg-zinc-100',    text: 'text-zinc-500',   border: 'border-zinc-200'   },
    no_show:    { bg: 'bg-red-100',     text: 'text-red-600',    border: 'border-red-200'    },
}

export const VISIT_STATUS_LABELS = {
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show:   'No Show',
}

export const OUTCOME_LABELS = {
    interested:       'Interested',
    not_interested:   'Not Interested',
    follow_up_needed: 'Follow-up Needed',
}
