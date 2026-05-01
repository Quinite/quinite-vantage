import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LeadFilters({
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    projectId,
    setProjectId,
    projects = [],
    stages = [], // Stages can be passed or fetched inside if needed
    users = [],
    assignedTo,
    setAssignedTo,
    viewMode,
    setViewMode,
    onRefresh,
    loading
}) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 h-10 bg-slate-100 rounded animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-3 p-3 min-w-max">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search leads..."
                            className="pl-10 h-10 border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-indigo-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={stageFilter} onValueChange={setStageFilter}>
                            <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="All Stages" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                {stages.map(stage => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={projectId || "all"}
                            onValueChange={(val) => setProjectId(val === "all" ? null : val)}
                        >
                            <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map(project => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={assignedTo || "all"}
                            onValueChange={(val) => setAssignedTo(val === "all" ? null : val)}
                        >
                            <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="All Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Agents</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.full_name || user.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={viewMode} onValueChange={setViewMode}>
                            <SelectTrigger className="h-10 w-[130px] rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="View Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={onRefresh} 
                            disabled={loading} 
                            className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
