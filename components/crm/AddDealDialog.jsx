import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Building, CheckCircle2, IndianRupee, Loader2, BedDouble, Maximize2, Layers } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const DEAL_STATUSES = [
    { value: 'interested',   label: 'Interested',   color: 'bg-violet-100 text-violet-700 border-violet-200' },
    { value: 'negotiation',  label: 'Negotiation',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'reserved',     label: 'Reserved',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'won',          label: 'Won',           color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'lost',         label: 'Lost',          color: 'bg-gray-100 text-gray-500 border-gray-200' },
]

function formatPrice(val) {
    if (!val) return null
    const n = Number(val)
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
    return `₹${n.toLocaleString('en-IN')}`
}

const UNIT_STATUS_COLORS = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    reserved:  'bg-orange-50 text-orange-700 border-orange-200',
    sold:      'bg-red-50 text-red-600 border-red-200',
}

export default function AddDealDialog({ leadId, leadName, isOpen, onClose, onSuccess, defaultUnit, defaultProject }) {
    const [step, setStep] = useState(1)
    const [activeTab, setActiveTab] = useState('unit')
    const [search, setSearch] = useState('')
    const [units, setUnits] = useState([])
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedUnit, setSelectedUnit] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    const [unitProjectFilter, setUnitProjectFilter] = useState(null)
    const [dealDetails, setDealDetails] = useState({ amount: '', status: 'interested', notes: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setSearch('')
            setDealDetails({ amount: '', status: 'interested', notes: '' })
            if (defaultUnit) {
                setSelectedUnit(defaultUnit)
                setSelectedProject(null)
                setUnitProjectFilter(null)
                setActiveTab('unit')
                setStep(2)
            } else {
                setSelectedUnit(null)
                setSelectedProject(null)
                setUnitProjectFilter(defaultProject || null)
                setActiveTab('unit')
                setStep(1)
            }
            fetchUnits()
            fetchProjects()
        }
    }, [isOpen, defaultUnit, defaultProject])

    const fetchUnits = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/inventory/units')
            const data = await res.json()
            setUnits(data.units || [])
        } catch {
            toast.error('Failed to load units')
        } finally {
            setLoading(false)
        }
    }

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/inventory/projects')
            const data = await res.json()
            setProjects(data.projects || [])
        } catch {}
    }

    const filteredUnits = units.filter(u => {
        // only show available and reserved units
        if (!['available', 'reserved'].includes(u.status)) return false
        const matchesSearch =
            (u.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.tower_name || '').toLowerCase().includes(search.toLowerCase())
        const matchesProject = !unitProjectFilter || u.project_id === unitProjectFilter.id
        return matchesSearch && matchesProject
    })

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    )

    const handleSave = async () => {
        if (!dealDetails.amount) {
            toast.error('Please enter a deal amount')
            return
        }
        setSaving(true)
        try {
            const unitLabel = selectedUnit?.unit_number || ''
            const name = unitLabel
                ? `${leadName || 'Lead'} — ${unitLabel}`
                : (selectedProject ? `${leadName || 'Lead'} — ${selectedProject.name}` : `${leadName || 'Lead'} — Deal`)

            const projectId = selectedProject?.id
                || selectedUnit?.project_id
                || unitProjectFilter?.id
                || null

            const payload = {
                lead_id: leadId,
                unit_id: selectedUnit?.id || null,
                project_id: projectId,
                name,
                amount: dealDetails.amount || null,
                status: dealDetails.status,
                notes: dealDetails.notes || null,
            }

            const res = await fetch('/api/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create deal')

            toast.success('Deal created')
            onSuccess?.()
            onClose()
        } catch (error) {
            toast.error(error.message || 'Failed to create deal')
        } finally {
            setSaving(false)
        }
    }

    const selectedLabel = selectedUnit
        ? `Unit ${selectedUnit.unit_number}${selectedUnit.tower_name ? ` · ${selectedUnit.tower_name}` : ''}`
        : selectedProject?.name || null

    const selectedSub = selectedUnit
        ? selectedUnit.project_name || ''
        : selectedProject ? 'General project interest' : ''

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{step === 1 ? 'Select Unit or Project' : 'Deal Details'}</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Link a specific unit or a general project to this deal' : 'Enter amount, status and notes'}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-2 space-y-3">
                        {/* Tab toggle */}
                        <div className="flex p-1 bg-muted rounded-lg">
                            {['unit', 'project'].map(tab => (
                                <button
                                    key={tab}
                                    className={cn(
                                        'flex-1 text-sm font-medium py-1.5 rounded-md transition-all',
                                        activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    onClick={() => { setActiveTab(tab); setSearch('') }}
                                >
                                    {tab === 'unit' ? 'Specific Unit' : 'General Project'}
                                </button>
                            ))}
                        </div>

                        {/* Project filter (unit tab only) */}
                        {activeTab === 'unit' && (
                            <Select
                                value={unitProjectFilter?.id || 'all'}
                                onValueChange={val => {
                                    if (val === 'all') { setUnitProjectFilter(null); return }
                                    const p = projects.find(p => p.id === val)
                                    setUnitProjectFilter(p || null)
                                    if (selectedUnit && selectedUnit.project_id !== val) setSelectedUnit(null)
                                }}
                            >
                                <SelectTrigger className="text-sm h-9">
                                    <SelectValue placeholder="All projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All projects</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={activeTab === 'unit' ? 'Search by unit no, tower...' : 'Search projects...'}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        {/* List */}
                        <div className="h-[260px] overflow-y-auto rounded-xl border bg-muted/10 p-2 space-y-1.5">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
                                </div>
                            ) : activeTab === 'unit' ? (
                                filteredUnits.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-1">
                                        <Building className="w-7 h-7 opacity-20" />
                                        No available units found
                                    </div>
                                ) : filteredUnits.map(unit => {
                                    const selected = selectedUnit?.id === unit.id
                                    return (
                                        <div
                                            key={unit.id}
                                            onClick={() => { 
                                                setSelectedUnit(unit); 
                                                setSelectedProject(null);
                                                setDealDetails(d => ({ ...d, amount: unit.total_price || unit.base_price || '' }));
                                            }}
                                            className={cn(
                                                'p-3 rounded-lg border cursor-pointer transition-all',
                                                selected
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-sm text-foreground">
                                                            Unit {unit.unit_number}
                                                        </p>
                                                        {unit.tower_name && (
                                                            <span className="text-[11px] text-muted-foreground font-medium">· {unit.tower_name}</span>
                                                        )}
                                                        <Badge
                                                            variant="outline"
                                                            className={cn('text-[10px] h-4 px-1.5 capitalize border', UNIT_STATUS_COLORS[unit.status] || '')}
                                                        >
                                                            {unit.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        {unit.bedrooms && (
                                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                <BedDouble className="w-3 h-3" />{unit.bedrooms} BHK
                                                            </span>
                                                        )}
                                                        {unit.floor_number != null && (
                                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                <Layers className="w-3 h-3" />Floor {unit.floor_number === 0 ? 'G' : unit.floor_number}
                                                            </span>
                                                        )}
                                                        {unit.carpet_area && (
                                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                <Maximize2 className="w-3 h-3" />{unit.carpet_area} sqft
                                                            </span>
                                                        )}
                                                        {(unit.base_price || unit.total_price) && (
                                                            <span className="text-[11px] font-semibold text-foreground">
                                                                {formatPrice(unit.total_price || unit.base_price)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {unit.project_name && (
                                                        <p className="text-[10px] text-muted-foreground mt-1 truncate">{unit.project_name}</p>
                                                    )}
                                                </div>
                                                {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                filteredProjects.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No projects found.</div>
                                ) : filteredProjects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => { 
                                            setSelectedProject(project); 
                                            setSelectedUnit(null);
                                            setDealDetails(d => ({ ...d, amount: '' }));
                                        }}
                                        className={cn(
                                            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                            selectedProject?.id === project.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                        )}
                                    >
                                        <div className="mt-0.5 p-1.5 bg-secondary rounded-md shrink-0">
                                            <Building className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className="font-medium text-sm truncate">{project.name}</p>
                                                {selectedProject?.id === project.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                            </div>
                                            {project.city && <p className="text-[11px] text-muted-foreground mt-0.5">{project.city}</p>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-center">
                            <Button
                                variant="link"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => { 
                                    setSelectedUnit(null); 
                                    setSelectedProject(null); 
                                    setDealDetails(d => ({ ...d, amount: '' }));
                                    setStep(2);
                                }}
                            >
                                Skip — add without a unit
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="py-4 space-y-5">
                        {/* Selected unit/project summary */}
                        {selectedLabel && (
                            <div className="p-3 bg-muted/30 rounded-lg border flex items-center gap-3">
                                <div className="p-1.5 bg-secondary rounded-md shrink-0">
                                    <Building className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{selectedLabel}</p>
                                    {selectedSub && <p className="text-xs text-muted-foreground truncate">{selectedSub}</p>}
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0" onClick={() => setStep(1)}>Change</Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {DEAL_STATUSES.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setDealDetails(d => ({ ...d, status: s.value }))}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                                            dealDetails.status === s.value
                                                ? cn(s.color, 'ring-2 ring-offset-1 ring-current/30')
                                                : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                                        )}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Deal Amount <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="Enter deal amount"
                                    className="pl-9 pr-24"
                                    value={dealDetails.amount}
                                    onChange={e => setDealDetails(d => ({ ...d, amount: e.target.value }))}
                                    required
                                />
                                {dealDetails.amount && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-700 bg-orange-50/80 px-2 py-1 rounded border border-orange-200 pointer-events-none">
                                        {formatPrice(dealDetails.amount)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <Textarea
                                placeholder="Add any notes about this deal..."
                                rows={2}
                                value={dealDetails.notes}
                                onChange={e => setDealDetails(d => ({ ...d, notes: e.target.value }))}
                                className="resize-none text-sm"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={() => setStep(2)} disabled={!selectedUnit && !selectedProject}>Next</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Deal'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
