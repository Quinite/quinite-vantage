'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Search, RefreshCw, Filter, X, Zap, Globe, Users, Target, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MultiSelect } from '@/components/ui/multi-select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from '@/lib/utils'

const INTEREST_OPTIONS = [
    { value: 'high', label: 'High', color: 'bg-emerald-500' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
    { value: 'low', label: 'Low', color: 'bg-slate-400' },
]

export function LeadFilters({
    searchQuery,
    setSearchQuery,
    stageIds,
    setStageIds,
    projectIds,
    setProjectIds,
    assignedToIds,
    setAssignedToIds,
    interestLevels,
    setInterestLevels,
    sources,
    setSources,
    scoreRange,
    setScoreRange,
    projects = [],
    stages = [],
    users = [],
    viewMode,
    setViewMode,
    onRefresh,
    loading
}) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

    const activeFilterCount = [
        stageIds.length > 0,
        projectIds.length > 0,
        assignedToIds.length > 0,
        interestLevels.length > 0,
        sources.length > 0,
        scoreRange[0] !== 0 || scoreRange[1] !== 100
    ].filter(Boolean).length

    const handleClearFilters = () => {
        setStageIds([])
        setProjectIds([])
        setAssignedToIds([])
        setInterestLevels([])
        setSources([])
        setScoreRange([0, 100])
        setSearchQuery('')
    }

    const availableSources = Array.from(new Set(stages.map(s => s.source).filter(Boolean)))
    // If sources are not available in stages, we might need to hardcode or fetch them.
    // Given the context, let's use some common ones or empty array.
    const commonSources = ['manual', 'website', 'facebook', 'google', 'referral', 'agent']

    return (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
                {/* Search and Main Filters */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email or phone..."
                        className="pl-9 h-11 bg-white border-slate-200 focus:ring-indigo-500 transition-all shadow-sm rounded-xl outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={viewMode} onValueChange={setViewMode}>
                        <SelectTrigger className="h-11 w-[120px] bg-white border-slate-200 rounded-xl shadow-sm">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="outline" 
                                className={cn(
                                    "h-11 rounded-xl gap-2 px-4 border-slate-200 shadow-sm transition-all",
                                    activeFilterCount > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white"
                                )}
                            >
                                <Filter className="h-4 w-4" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="bg-indigo-600 text-white border-none h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[340px] p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden" align="end">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-indigo-500" />
                                    Advanced Filters
                                </h3>
                                {activeFilterCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold uppercase tracking-wider">
                                        Clear All
                                    </Button>
                                )}
                            </div>
                            
                            <div className="p-4 space-y-5 max-h-[450px] overflow-y-auto">
                                {/* Project MultiSelect */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Target className="w-3 h-3" /> Projects
                                    </label>
                                    <MultiSelect
                                        options={projects.map(p => ({ label: p.name, value: p.id }))}
                                        selected={projectIds}
                                        onChange={setProjectIds}
                                        placeholder="Select projects..."
                                        className="min-h-[40px] rounded-lg"
                                    />
                                </div>

                                {/* Stage MultiSelect */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <BarChart3 className="w-3 h-3" /> Pipeline Stages
                                    </label>
                                    <MultiSelect
                                        options={stages.map(s => ({ label: s.name, value: s.id }))}
                                        selected={stageIds}
                                        onChange={setStageIds}
                                        placeholder="Select stages..."
                                        className="min-h-[40px] rounded-lg"
                                    />
                                </div>

                                {/* Agent MultiSelect */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Assigned Agents
                                    </label>
                                    <MultiSelect
                                        options={users.map(u => ({ label: u.full_name || u.email, value: u.id }))}
                                        selected={assignedToIds}
                                        onChange={setAssignedToIds}
                                        placeholder="Select agents..."
                                        className="min-h-[40px] rounded-lg"
                                    />
                                </div>

                                {/* Interest Level */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Zap className="w-3 h-3" /> Interest Level
                                    </label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {INTEREST_OPTIONS.map(opt => {
                                            const isActive = interestLevels.includes(opt.value)
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        if (isActive) setInterestLevels(interestLevels.filter(v => v !== opt.value))
                                                        else setInterestLevels([...interestLevels, opt.value])
                                                    }}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                                                        isActive 
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Sources */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-3 h-3" /> Sources
                                    </label>
                                    <MultiSelect
                                        options={commonSources.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
                                        selected={sources}
                                        onChange={setSources}
                                        placeholder="Select sources..."
                                        className="min-h-[40px] rounded-lg"
                                    />
                                </div>

                                {/* Score Range */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            Lead Score Range
                                        </label>
                                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                            {scoreRange[0]} - {scoreRange[1]}
                                        </span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={scoreRange}
                                        onValueChange={setScoreRange}
                                        className="py-1"
                                    />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={onRefresh} 
                        disabled={loading} 
                        className="h-11 w-11 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all shrink-0"
                    >
                        <RefreshCw className={cn("h-4 w-4 text-slate-600", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Active Filters Summary Chips */}
            {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
                    
                    {projectIds.length > 0 && (
                        <Badge variant="secondary" className="h-6 bg-slate-100 text-slate-600 border-none gap-1 px-2 rounded-full font-medium text-[10px]">
                            {projectIds.length} Projects
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setProjectIds([])} />
                        </Badge>
                    )}

                    {stageIds.length > 0 && (
                        <Badge variant="secondary" className="h-6 bg-slate-100 text-slate-600 border-none gap-1 px-2 rounded-full font-medium text-[10px]">
                            {stageIds.length} Stages
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setStageIds([])} />
                        </Badge>
                    )}

                    {assignedToIds.length > 0 && (
                        <Badge variant="secondary" className="h-6 bg-slate-100 text-slate-600 border-none gap-1 px-2 rounded-full font-medium text-[10px]">
                            {assignedToIds.length} Agents
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setAssignedToIds([])} />
                        </Badge>
                    )}

                    {interestLevels.length > 0 && (
                        <Badge variant="secondary" className="h-6 bg-slate-100 text-slate-600 border-none gap-1 px-2 rounded-full font-medium text-[10px]">
                            {interestLevels.length} Interest
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setInterestLevels([])} />
                        </Badge>
                    )}

                    {sources.length > 0 && (
                        <Badge variant="secondary" className="h-6 bg-slate-100 text-slate-600 border-none gap-1 px-2 rounded-full font-medium text-[10px]">
                            {sources.length} Sources
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setSources([])} />
                        </Badge>
                    )}

                    {(scoreRange[0] !== 0 || scoreRange[1] !== 100) && (
                        <Badge variant="secondary" className="h-6 bg-slate-100 text-slate-600 border-none gap-1 px-2 rounded-full font-medium text-[10px]">
                            Score: {scoreRange[0]}-{scoreRange[1]}
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setScoreRange([0, 100])} />
                        </Badge>
                    )}
                </div>
            )}
        </div>
    )
}
