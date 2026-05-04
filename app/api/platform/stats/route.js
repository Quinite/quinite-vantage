import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsJSON } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const adminClient = createAdminClient()
        const tablesToCheck = [
            'organizations', 'profiles', 'projects', 'campaigns',
            'leads', 'call_logs', 'audit_logs', 'impersonation_sessions'
        ]

        const stats = {
            counts: {},
            tableStatus: {},
            systemHealth: 100
        }

        // 1. Check all tables and get counts
        for (const table of tablesToCheck) {
            try {
                const { count, error } = await adminClient
                    .from(table)
                    .select('*', { count: 'exact', head: true })

                if (error) {
                    // If code is 42P01, table likely missing (or permission denied)
                    stats.tableStatus[table] = { exists: false, error: error.message }
                    stats.systemHealth -= 10 // Deduct health
                } else {
                    stats.tableStatus[table] = { exists: true, count: count || 0 }
                    stats.counts[table] = count || 0
                }
            } catch (err) {
                stats.tableStatus[table] = { exists: false, error: err.message }
                stats.systemHealth -= 10
            }
        }

        // 2. Specific Stats
        stats.counts.platformAdmins = 0
        try {
            const { count } = await adminClient
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'platform_admin')
            stats.counts.platformAdmins = count || 0
        } catch (e) { console.error('Error counting admins', e) }

        // 3. Get Database Project ID
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const projectId = supabaseUrl ? supabaseUrl.split('//')[1].split('.')[0] : 'Unknown'

        return corsJSON({
            ...stats.counts,
            tableStatus: stats.tableStatus,
            systemHealth: Math.max(0, stats.systemHealth),
            database: {
                projectId: projectId,
                url: supabaseUrl
            },
            overview: {
                totalOrgs: stats.counts.organizations || 0,
                activeOrgs: -1,
                totalUsers: stats.counts.profiles || 0,
                totalCalls: stats.counts.call_logs || 0
            }
        })
    } catch (e) {
        console.error('Platform stats error:', e)
        return corsJSON({ error: e.message }, { status: 500 })
    }
}
