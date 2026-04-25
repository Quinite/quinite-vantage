import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasDashboardPermission } from '@/lib/dashboardPermissions'
import { withAuth } from '@/lib/middleware/withAuth'
import { corsJSON } from '@/lib/cors'
import { logAudit } from '@/lib/permissions' // Assuming logAudit export location, checked via route.js

export const POST = withAuth(async (request, context) => {
    return corsJSON({ 
        success: false, 
        message: 'Bulk hard deletion is disabled in the CRM. Please use Bulk Archive. This action is reserved for the Platform Control Plane.' 
    }, { status: 403 })
})
