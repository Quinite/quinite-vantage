'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Search, X, Filter, Plus,
    IndianRupee, Building2, BedDouble, Info, Home,
    MoreHorizontal, Edit, RefreshCcw, Table as TableIcon
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Label } from '@/components/ui/label'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { usePermission } from '@/contexts/PermissionContext'
import { useInventoryProjects, useInventoryUnits } from '@/hooks/useInventory'
import UnitDrawer from './UnitDrawer'
import StatusChangeModal from './StatusChangeModal'
import { formatINR, getStatusConfig } from '@/lib/inventory'
import { cn } from '@/lib/utils'

export function UnitsView({ projectId = null }) {
    const canManage = usePermission('manage_inventory')
    const canEdit = usePermission('edit_inventory')

    // Data fetching logic
    const { 
        data: units = [], 
        isLoading: unitsLoading,
        refetch: refetchUnits
    } = useInventoryUnits(projectId)

    const { 
        data: projects = [], 
        isLoading: projectsLoading 
    } = useInventoryProjects()

    const loading = unitsLoading || projectsLoading

    // Search & Filter state
    const [search, setSearch] = useState('')
    const [selectedTypes, setSelectedTypes] = useState([])
    const [selectedStatuses, setSelectedStatuses] = useState([])
    const [selectedProjects, setSelectedProjects] = useState([])
    const [priceRange, setPriceRange] = useState({ min: '', max: '' })
    const [areaRange, setAreaRange] = useState({ min: '', max: '' })
    const [bedrooms, setBedrooms] = useState([])

    // UI States
    const [drawerState, setDrawerState] = useState({ open: false, mode: 'add', unit: null })
    const [statusModalState, setStatusModalState] = useState({ open: false, unit: null })

    const unitTypes = [
        { value: 'apartment', label: 'Apartment' },
        { value: 'villa', label: 'Villa' },
        { value: 'plot', label: 'Plot' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'penthouse', label: 'Penthouse' },
        { value: 'studio', label: 'Studio' }
    ]

    const statuses = [
        { value: 'available', label: 'Available', key: 'available' },
        { value: 'sold', label: 'Sold', key: 'sold' },
        { value: 'reserved', label: 'Reserved', key: 'reserved' },
        { value: 'blocked', label: 'Blocked', key: 'blocked' },
        { value: 'under_maintenance', label: 'Maintenance', key: 'under_maintenance' }
    ]

    // Memoized filtered units
    const filteredUnits = useMemo(() => {
        return units.filter(unit => {
            const matchesSearch = !search ||
                unit.unit_number?.toLowerCase().includes(search.toLowerCase()) ||
                unit.title?.toLowerCase().includes(search.toLowerCase())

            const unitType = unit.config?.property_type || unit.type
            const matchesType = selectedTypes.length === 0 || selectedTypes.includes(unitType)

            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(unit.status)

            const matchesProject = !projectId ? (selectedProjects.length === 0 || selectedProjects.includes(unit.project_id)) : true

            const price = parseInt(unit.total_price || unit.base_price) || 0
            const matchesPriceMin = !priceRange.min || price >= parseInt(priceRange.min)
            const matchesPriceMax = !priceRange.max || price <= parseInt(priceRange.max)

            const area = parseInt(unit.carpet_area || unit.size_sqft) || 0
            const matchesAreaMin = !areaRange.min || area >= parseInt(areaRange.min)
            const matchesAreaMax = !areaRange.max || area <= parseInt(areaRange.max)

            const unitBeds = unit.bedrooms || unit.config?.bedrooms || 0
            const matchesBeds = bedrooms.length === 0 || bedrooms.includes(unitBeds.toString())

            return matchesSearch && matchesType && matchesStatus && matchesProject &&
                matchesPriceMin && matchesPriceMax && matchesAreaMin && matchesAreaMax &&
                matchesBeds
        })
    }, [units, search, selectedTypes, selectedStatuses, selectedProjects, priceRange, areaRange, bedrooms, projectId])

    const toggleFilter = (filterArray, setFilterArray, value) => {
        if (filterArray.includes(value)) {
            setFilterArray(filterArray.filter(v => v !== value))
        } else {
            setFilterArray([...filterArray, value])
        }
    }

    const clearAllFilters = () => {
        setSelectedTypes([])
        setSelectedStatuses([])
        setPriceRange({ min: '', max: '' })
        setAreaRange({ min: '', max: '' })
        setBedrooms([])
        if (!projectId) setSelectedProjects([])
        setSearch('')
    }

    const hasActiveFilters = selectedTypes.length > 0 ||
        selectedStatuses.length > 0 ||
        selectedProjects.length > 0 ||
        search ||
        priceRange.min || priceRange.max ||
        areaRange.min || areaRange.max ||
        bedrooms.length > 0

    const openEditDrawer = (unit) => {
        setDrawerState({ open: true, mode: 'edit', unit })
    }

    const openAddDrawer = () => {
        setDrawerState({ open: true, mode: 'add', unit: null })
    }

    const openStatusModal = (unit) => {
        setStatusModalState({ open: true, unit })
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/30">
            {/* Minimal Header/Filters Bar */}
            <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative flex-1 w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by unit number..."
                                className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm rounded-lg"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {canManage && (
                                <Button 
                                    onClick={openAddDrawer} 
                                    className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Unit
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Project Filter */}
                        {!projectId && projects.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 rounded-md border-slate-200 text-slate-600">
                                        <Building2 className="w-3.5 h-3.5 mr-2" />
                                        Project
                                        {selectedProjects.length > 0 && (
                                            <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-slate-100 text-slate-900 border-0">
                                                {selectedProjects.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-xl border-slate-100">
                                    <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Projects</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <div className="max-h-64 overflow-y-auto">
                                        {projects.map(project => (
                                            <DropdownMenuCheckboxItem
                                                key={project.id}
                                                checked={selectedProjects.includes(project.id)}
                                                onCheckedChange={() => toggleFilter(selectedProjects, setSelectedProjects, project.id)}
                                                className="text-sm py-2"
                                            >
                                                {project.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Status Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 rounded-md border-slate-200 text-slate-600">
                                    <Info className="w-3.5 h-3.5 mr-2" />
                                    Status
                                    {selectedStatuses.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-slate-100 text-slate-900 border-0">
                                            {selectedStatuses.length}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 rounded-xl shadow-xl border-slate-100">
                                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {statuses.map(status => (
                                    <DropdownMenuCheckboxItem
                                        key={status.value}
                                        checked={selectedStatuses.includes(status.value)}
                                        onCheckedChange={() => toggleFilter(selectedStatuses, setSelectedStatuses, status.value)}
                                        className="text-sm py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", getStatusConfig(status.key).dot)} />
                                            {status.label}
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Type Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 rounded-md border-slate-200 text-slate-600">
                                    <Home className="w-3.5 h-3.5 mr-2" />
                                    Type
                                    {selectedTypes.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-slate-100 text-slate-900 border-0">
                                            {selectedTypes.length}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 rounded-xl shadow-xl border-slate-100">
                                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Type</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {unitTypes.map(type => (
                                    <DropdownMenuCheckboxItem
                                        key={type.value}
                                        checked={selectedTypes.includes(type.value)}
                                        onCheckedChange={() => toggleFilter(selectedTypes, setSelectedTypes, type.value)}
                                        className="text-sm py-2"
                                    >
                                        {type.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Bedrooms Filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 rounded-md border-slate-200 text-slate-600">
                                    <BedDouble className="w-3.5 h-3.5 mr-2" />
                                    Beds
                                    {bedrooms.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-slate-100 text-slate-900 border-0">
                                            {bedrooms.length}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 rounded-xl shadow-xl border-slate-100">
                                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Config</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {[1, 2, 3, 4, 5].map(num => (
                                    <DropdownMenuCheckboxItem
                                        key={num}
                                        checked={bedrooms.includes(num.toString())}
                                        onCheckedChange={() => toggleFilter(bedrooms, setBedrooms, num.toString())}
                                        className="text-sm py-2"
                                    >
                                        {num} {num === 5 ? '+' : ''} BHK
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* More Filters */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 rounded-md border-slate-200 text-slate-600">
                                    <Filter className="w-3.5 h-3.5 mr-2" />
                                    More
                                    {(priceRange.min || priceRange.max || areaRange.min || areaRange.max) && (
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px] bg-blue-100 text-blue-600 border-0">
                                            Active
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-72 p-4 rounded-xl shadow-xl border-slate-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Price Range (₹)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input 
                                            placeholder="Min" 
                                            type="number" 
                                            className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md" 
                                            value={priceRange.min}
                                            onChange={e => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                        />
                                        <Input 
                                            placeholder="Max" 
                                            type="number" 
                                            className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md" 
                                            value={priceRange.max}
                                            onChange={e => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Area Range (SQFT)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input 
                                            placeholder="Min" 
                                            type="number" 
                                            className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md" 
                                            value={areaRange.min}
                                            onChange={e => setAreaRange(prev => ({ ...prev, min: e.target.value }))}
                                        />
                                        <Input 
                                            placeholder="Max" 
                                            type="number" 
                                            className="h-8 text-xs bg-slate-50 border-slate-100 rounded-md" 
                                            value={areaRange.max}
                                            onChange={e => setAreaRange(prev => ({ ...prev, max: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <Button 
                                    className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800 rounded-md" 
                                    onClick={() => {}}
                                >
                                    Apply Ranges
                                </Button>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md px-2"
                                onClick={clearAllFilters}
                            >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* List Table Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <Table>
                                <TableHeader className="bg-slate-50/50 sticky top-0 bg-white z-[5]">
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="w-[120px] font-semibold text-slate-500 text-[10px] uppercase tracking-wider pl-6">Unit #</TableHead>
                                        <TableHead className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Tower / Floor</TableHead>
                                        <TableHead className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Type / Configuration</TableHead>
                                        <TableHead className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Area (SQFT)</TableHead>
                                        <TableHead className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Total Value</TableHead>
                                        <TableHead className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider text-center">Status</TableHead>
                                        <TableHead className="w-[80px] text-right pr-6"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUnits.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center p-8">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                        <Search className="w-6 h-6" />
                                                    </div>
                                                    <p className="font-semibold text-slate-900">No units found</p>
                                                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                                                    <Button variant="link" size="sm" onClick={clearAllFilters} className="mt-2 text-blue-600">Clear all filters</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUnits.map((unit) => {
                                            const status = getStatusConfig(unit.status || 'available');
                                            return (
                                                <TableRow key={unit.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                                                    <TableCell className="pl-6 font-bold text-slate-900 text-sm">
                                                        {unit.unit_number}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-slate-600">{unit.tower?.name || 'Main Tower'}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">Floor {unit.floor_number ?? 'N/A'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-slate-700 capitalize">
                                                                {unit.config?.config_name || unit.config?.property_type || 'Residential'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {(unit.bedrooms || unit.config?.bedrooms) ? `${unit.bedrooms || unit.config?.bedrooms} BHK` : 'N/A'} • {(unit.facing || unit.config?.facing) || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-semibold text-slate-600 tabular-nums">
                                                        {unit.carpet_area || unit.config?.carpet_area || 0}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-bold text-slate-900 tabular-nums">
                                                        {formatINR(unit.total_price || unit.base_price || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn(
                                                                "border-0 font-bold text-[10px] uppercase h-6 px-3 rounded-full inline-flex items-center gap-1.5",
                                                                status.badge
                                                            )}
                                                        >
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                                                            {unit.status?.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-slate-100">
                                                                {canEdit && (
                                                                    <DropdownMenuItem onClick={() => openEditDrawer(unit)} className="text-xs font-medium py-2 cursor-pointer flex items-center gap-2">
                                                                        <Edit className="w-3.5 h-3.5 text-slate-400" /> 
                                                                        Edit Details
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canManage && (
                                                                    <DropdownMenuItem onClick={() => openStatusModal(unit)} className="text-xs font-medium py-2 cursor-pointer flex items-center gap-2">
                                                                        <RefreshCcw className="w-3.5 h-3.5 text-slate-400" /> 
                                                                        Update Status
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <div className="bg-white border-t border-slate-100 p-3 px-6 shrink-0 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Found {filteredUnits.length} results
                        </span>
                    </div>
                </div>
            </div>

            {/* Reuse Refactored Drawer Component */}
            <UnitDrawer
                open={drawerState.open}
                onClose={() => setDrawerState({ ...drawerState, open: false })}
                mode={drawerState.mode}
                unit={drawerState.unit}
                projectId={projectId || drawerState.unit?.project_id}
                onSave={async (payload) => {
                    const isNew = drawerState.mode === 'add'
                    const url = isNew ? '/api/inventory/units' : `/api/inventory/units/${drawerState.unit?.id}`
                    const method = isNew ? 'POST' : 'PATCH'
                    
                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                    
                    if (!res.ok) {
                        const err = await res.json()
                        throw new Error(err.error || 'Failed to save unit')
                    }
                    
                    refetchUnits()
                    return true
                }}
            />

            <StatusChangeModal
                isOpen={statusModalState.open}
                property={statusModalState.unit}
                onClose={() => setStatusModalState({ ...statusModalState, open: false })}
                onStatusChanged={() => {
                    refetchUnits()
                }}
            />
        </div>
    )
}
