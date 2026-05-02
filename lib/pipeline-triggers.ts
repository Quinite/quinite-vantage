import { createAdminClient } from '@/lib/supabase/admin'
import { runAutomations } from '@/lib/pipeline-automation'

export const TRIGGER_KEYS = {
    SITE_VISIT_BOOKED:                    'site_visit_booked',
    SITE_VISIT_COMPLETED_INTERESTED:      'site_visit_completed_interested',
    SITE_VISIT_COMPLETED_NOT_INTERESTED:  'site_visit_completed_not_interested',
    SITE_VISIT_COMPLETED_FOLLOW_UP:       'site_visit_completed_follow_up',
    SITE_VISIT_NO_SHOW:                   'site_visit_no_show',
    CALL_ANSWERED:                        'call_answered',
    CALL_TRANSFERRED:                     'call_transferred',
    CALL_CALLBACK_REQUESTED:              'call_callback_requested',
    CALL_EXHAUSTED:                       'call_exhausted',
    DEAL_CREATED:                         'deal_created',
    DEAL_WON:                             'deal_won',
    DEAL_LOST:                            'deal_lost',
} as const

export type TriggerKey = typeof TRIGGER_KEYS[keyof typeof TRIGGER_KEYS]

export async function firePipelineTrigger(
    triggerKey: TriggerKey,
    leadId: string,
    organizationId: string
): Promise<void> {
    try {
        const supabase = createAdminClient()

        const { data: trigger } = await supabase
            .from('org_pipeline_triggers')
            .select('is_enabled, target_stage_id')
            .eq('organization_id', organizationId)
            .eq('trigger_key', triggerKey)
            .maybeSingle()

        if (!trigger || !trigger.is_enabled || !trigger.target_stage_id) return

        const { data: lead } = await supabase
            .from('leads')
            .select('id, stage_id, archived_at')
            .eq('id', leadId)
            .maybeSingle()

        if (!lead || lead.archived_at) return
        if (lead.stage_id === trigger.target_stage_id) return

        const fromStageId = lead.stage_id

        await supabase
            .from('leads')
            .update({ stage_id: trigger.target_stage_id, updated_at: new Date().toISOString() })
            .eq('id', leadId)

        await supabase.from('pipeline_stage_transitions').insert({
            lead_id:         leadId,
            organization_id: organizationId,
            from_stage_id:   fromStageId ?? null,
            to_stage_id:     trigger.target_stage_id,
            moved_by:        null,
            source:          'pipeline_trigger',
            automation_id:   null,
        })

        await runAutomations({
            leadId,
            organizationId,
            trigger:     'stage_enter',
            triggerData: { toStageId: trigger.target_stage_id, fromStageId },
        })
    } catch (err: any) {
        console.error(`[PipelineTrigger] ${triggerKey} failed for lead ${leadId}:`, err.message)
    }
}
