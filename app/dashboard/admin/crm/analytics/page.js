'use client'

import React from 'react'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { useDynamicTitle } from '@/hooks/useDynamicTitle'

export default function CrmAnalyticsPage() {
    useDynamicTitle('CRM Analytics')
    return (
        <AnalyticsDashboard />
    )
}
