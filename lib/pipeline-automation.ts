import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TriggerType =
    | 'stage_enter'
    | 'stage_exit'
    | 'stale_in_stage'
    | 'ai_call_outcome'
    | 'interest_level_change'
    | 'score_threshold'
    | 'call_logged'

export type ActionType = 'move_stage' | 'assign_agent' | 'create_task'

export interface AutomationContext {
    leadId: string
    organizationId: string
    trigger: TriggerType
    triggerData: Record<string, unknown>
    userId?: string
    supabase?: SupabaseClient
}

interface AutomationRule {
    id: string
    organization_id: string
    pipeline_id: string
    name: string
    is_active: boolean
    trigger_type: TriggerType
    trigger_config: Record<string, unknown>
    action_type: ActionType
    action_config: Record<string, unknown>
}

/**
 * Log a stage transition to stage_transitions table.
 * Call this whenever a lead moves between stages, regardless of source.
 */
export async function logStageTransition(
    leadId: string,
    organizationId: string,
    fromStageId: string | null | undefined,
    toStageId: string,
    source: 'manual' | 'automation' | 'ai_call' | 'import',
    userId?: string,
    automationId?: string
): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase.from('pipeline_stage_transitions').insert({
        lead_id: leadId,
        organization_id: organizationId,
        from_stage_id: fromStageId ?? null,
        to_stage_id: toStageId,
        moved_by: userId ?? null,
        source,
        automation_id: automationId ?? null,
    })
    if (error) console.error('[Pipeline] logStageTransition error:', error.message)
}

/**
 * Run all active automation rules matching the given trigger.
 * Executes sequentially; a single rule failure doesn't block others.
 */
export async function runAutomations(ctx: AutomationContext): Promise<void> {
    const supabase = ctx.supabase ?? createAdminClient()

    // Fetch lead to get current stage and assigned_to
    const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .select('id, stage_id, assigned_to, organization_id, metadata')
        .eq('id', ctx.leadId)
        .maybeSingle()

    if (leadErr || !lead) return

    // Fetch the pipeline for this lead's stage
    const { data: stage } = await supabase
        .from('pipeline_stages')
        .select('id, pipeline_id')
        .eq('id', lead.stage_id)
        .maybeSingle()

    if (!stage) return

    // Fetch matching active automation rules for this pipeline
    const { data: rules, error: rulesErr } = await supabase
        .from('pipeline_automations')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .eq('pipeline_id', stage.pipeline_id)
        .eq('is_active', true)
        .eq('trigger_type', ctx.trigger)

    if (rulesErr || !rules?.length) return

    for (const rule of rules as AutomationRule[]) {
        try {
            if (!matchesTrigger(rule, ctx)) continue
            await executeAction(rule, lead, ctx.organizationId, supabase, ctx)
        } catch (err: any) {
            console.error(`[Pipeline] Automation rule ${rule.id} failed:`, err.message)
        }
    }
}

function matchesTrigger(rule: AutomationRule, ctx: AutomationContext): boolean {
    const cfg = rule.trigger_config
    const data = ctx.triggerData

    switch (rule.trigger_type) {
        case 'stage_enter':
            return !cfg.stage_id || cfg.stage_id === data.toStageId
        case 'stage_exit':
            return !cfg.stage_id || cfg.stage_id === data.fromStageId
        case 'ai_call_outcome':
            return !cfg.outcome || cfg.outcome === data.outcome
        case 'interest_level_change':
            return !cfg.interest_level || cfg.interest_level === data.interestLevel
        case 'score_threshold':
            if (typeof cfg.score_above === 'number' && typeof data.score === 'number') {
                return data.score >= cfg.score_above && (data.prevScore as number) < cfg.score_above
            }
            return false
        case 'call_logged':
            return true
        case 'stale_in_stage':
            return !cfg.stage_id || cfg.stage_id === data.stageId
        default:
            return false
    }
}

async function executeAction(
    rule: AutomationRule,
    lead: Record<string, any>,
    organizationId: string,
    supabase: SupabaseClient,
    ctx: AutomationContext
): Promise<void> {
    const cfg = rule.action_config

    switch (rule.action_type) {
        case 'move_stage': {
            if (!cfg.stage_id || cfg.stage_id === lead.stage_id) break
            const { error } = await supabase
                .from('leads')
                .update({ stage_id: cfg.stage_id, updated_at: new Date().toISOString() })
                .eq('id', lead.id)
            if (!error) {
                await logStageTransition(
                    lead.id,
                    organizationId,
                    lead.stage_id,
                    cfg.stage_id as string,
                    'automation',
                    undefined,
                    rule.id
                )
                // Recurse: run automations for the new stage_enter trigger
                await runAutomations({
                    leadId: lead.id,
                    organizationId,
                    trigger: 'stage_enter',
                    triggerData: { toStageId: cfg.stage_id, fromStageId: lead.stage_id },
                    supabase,
                })
            }
            break
        }

        case 'assign_agent': {
            let assignTo: string | null = null
            if (cfg.mode === 'round_robin') {
                assignTo = await getRoundRobinAgent(organizationId, supabase)
            } else if (cfg.user_id) {
                assignTo = cfg.user_id as string
            }
            if (assignTo) {
                await supabase
                    .from('leads')
                    .update({ assigned_to: assignTo, updated_at: new Date().toISOString() })
                    .eq('id', lead.id)
            }
            break
        }

        case 'create_task': {
            const dueHours = typeof cfg.due_in_hours === 'number' ? cfg.due_in_hours : 48
            const dueDate = new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString()
            await supabase.from('lead_tasks').insert({
                lead_id: lead.id,
                organization_id: organizationId,
                title: cfg.title ?? `Follow up (auto)`,
                description: cfg.description ?? null,
                due_date: dueDate,
                priority: (cfg.priority as string) ?? 'medium',
                status: 'pending',
                assigned_to: lead.assigned_to ?? null,
                created_by: null,
            })
            break
        }

    }
}

async function getRoundRobinAgent(organizationId: string, supabase: SupabaseClient): Promise<string | null> {
    // Get all active agents in the org
    const { data: agents } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('role', 'employee')
        .order('created_at', { ascending: true })

    if (!agents?.length) return null

    // Pick agent with fewest active leads
    const { data: counts } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('organization_id', organizationId)
        .is('archived_at', null)
        .in('assigned_to', agents.map(a => a.id))

    const countMap: Record<string, number> = {}
    for (const agent of agents) countMap[agent.id] = 0
    for (const row of (counts ?? [])) {
        if (row.assigned_to) countMap[row.assigned_to] = (countMap[row.assigned_to] ?? 0) + 1
    }

    return agents.reduce((min, agent) =>
        (countMap[agent.id] ?? 0) < (countMap[min.id] ?? 0) ? agent : min
    ).id
}
