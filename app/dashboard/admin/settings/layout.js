'use client'

import SettingsSidebar from '@/components/admin/SettingsSidebar'
import CustomBreadcrumbs from '@/components/ui/CustomBreadcrumbs'

export default function SettingsLayout({ children }) {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <SettingsSidebar />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="flex-1 w-full overflow-y-auto scroll-smooth">
                    <div className="px-4 pt-4 pb-2">
                        <CustomBreadcrumbs />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
