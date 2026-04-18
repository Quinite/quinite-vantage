// fixed defaultProperty error

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Building, CheckCircle2, DollarSign, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'

export default function AddDealDialog({ leadId, isOpen, onClose, onSuccess, defaultUnit, defaultProject }) {
    const [step, setStep] = useState(1) // 1: Select Unit, 2: Deal Details
    const [activeTab, setActiveTab] = useState('unit') // 'unit' or 'project'
    const [search, setSearch] = useState('')
    const [units, setUnits] = useState([])
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedUnit, setSelectedUnit] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)

    const [dealDetails, setDealDetails] = useState({
        amount: '',
        status: 'active',
        close_date: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setSearch('')
            setDealDetails({ amount: '', status: 'active', close_date: '' })

            // Pre-fill logic
            if (defaultUnit) {
                setSelectedUnit(defaultUnit)
                setSelectedProject(null)
                setActiveTab('unit')
                setStep(2) // Jump to details if specific unit is known
            } else if (defaultProject) {
                setSelectedProject(defaultProject)
                setSelectedUnit(null)
                setActiveTab('project')
                setStep(1) // Stay on selection to allow unit picking or confirmation
            } else {
                setSelectedUnit(null)
                setSelectedProject(null)
                setStep(1)
            }

            fetchUnits()
            fetchProjects()
        }
    }, [isOpen, defaultUnit, defaultProject])

    const fetchUnits = async () => {
        setLoading(true)
        try {
            // Fetch available units
            const res = await fetch('/api/inventory/units?status=available')
            const data = await res.json()
            setUnits(data.units || [])
        } catch (error) {
            console.error('Failed to load units:', error)
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
        } catch (error) {
            console.error('Failed to load projects:', error)
        }
    }

    const filteredUnits = units.filter(p =>
        (p.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase())
    )

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = {
                lead_id: leadId,
                unit_id: selectedUnit?.id,
                project_id: selectedProject?.id,
                name: selectedUnit ? `Deal for ${selectedUnit.unit_number}` : (selectedProject ? `Deal for ${selectedProject.name}` : 'New Deal'),
                amount: dealDetails.amount,
                status: dealDetails.status,
                close_date: dealDetails.close_date || null
            }

            const res = await fetch('/api/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to create deal')

            toast.success('Deal created successfully')
            if (onSuccess) onSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to create deal')
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{step === 1 ? 'Select Unit or Project' : 'Deal Details'}</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Link a specific unit or a general project to this deal' : 'Enter the deal value and status'}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-2 space-y-4">
                        <div className="flex p-1 bg-muted rounded-lg">
                            <button
                                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === 'unit' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setActiveTab('unit')}
                            >
                                Specific Unit
                            </button>
                            <button
                                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === 'project' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setActiveTab('project')}
                            >
                                General Project
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={activeTab === 'unit' ? "Search units..." : "Search projects..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <div className="h-[280px] overflow-y-auto border rounded-xl bg-muted/10 p-2 space-y-2">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Loading...
                                </div>
                            ) : activeTab === 'unit' ? (
                                filteredUnits.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                                        No available units found.
                                    </div>
                                ) : (
                                    filteredUnits.map(unit => (
                                        <div
                                            key={unit.id}
                                            onClick={() => { setSelectedUnit(unit); setSelectedProject(null); }}
                                            className={`
                                                group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                ${selectedUnit?.id === unit.id
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                                }
                                            `}
                                        >
                                            <div className="mt-1 p-1.5 bg-secondary rounded-md shrink-0">
                                                <Building className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-medium text-sm text-foreground truncate">
                                                        {unit.unit_number} {unit.title ? `- ${unit.title}` : ''}
                                                    </h4>
                                                    {selectedUnit?.id === unit.id && (
                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-background">
                                                        {unit.config?.property_type || unit.type || 'Unit'}
                                                    </Badge>
                                                    <span className="text-xs font-semibold text-foreground">
                                                        ₹{parseInt(unit.total_price || unit.base_price || unit.price || 0).toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                                {unit.project_name && (
                                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                                        {unit.project_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                filteredProjects.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                                        No projects found.
                                    </div>
                                ) : (
                                    filteredProjects.map(project => (
                                        <div
                                            key={project.id}
                                            onClick={() => { setSelectedProject(project); setSelectedProperty(null); }}
                                            className={`
                                                group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                ${selectedProject?.id === project.id
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-transparent bg-card hover:bg-accent/50 hover:border-border'
                                                }
                                            `}
                                        >
                                            <div className="mt-1 p-1.5 bg-secondary rounded-md shrink-0">
                                                <Building className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-medium text-sm text-foreground truncate">{project.name}</h4>
                                                    {selectedProject?.id === project.id && (
                                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                    {project.address}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>

                        <div className="flex justify-center">
                            <Button variant="link" size="sm" className="text-xs text-muted-foreground" onClick={() => {
                                setSelectedUnit(null)
                                setSelectedProject(null)
                                setStep(2)
                            }}>
                                Skip selection
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="py-4 space-y-6">
                        {(selectedUnit || selectedProject) ? (
                            <div className="p-3 bg-muted/30 rounded-lg border flex items-center gap-3">
                                <Building className="w-5 h-5 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {selectedUnit ? selectedUnit.unit_number : selectedProject.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedUnit ? selectedUnit.project_name : 'Project Deal'}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setStep(1)}>Change</Button>
                            </div>
                        ) : (
                            <div className="p-3 bg-muted/30 rounded-lg border flex items-center gap-3">
                                <div className="p-1.5 bg-secondary rounded-md">
                                    <Building className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">General Deal</p>
                                    <p className="text-xs text-muted-foreground">No specific unit or project linked</p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setStep(1)}>Link</Button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Deal Value</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-9"
                                        value={dealDetails.amount}
                                        onChange={e => setDealDetails({ ...dealDetails, amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <Select
                                        value={dealDetails.status}
                                        onValueChange={val => setDealDetails({ ...dealDetails, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="negotiation">Negotiation</SelectItem>
                                            <SelectItem value="won">Closed Won</SelectItem>
                                            <SelectItem value="lost">Lost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Expected Close</label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={dealDetails.close_date}
                                            onChange={e => setDealDetails({ ...dealDetails, close_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
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
                            <Button onClick={handleSave} disabled={saving || !dealDetails.amount}>
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : 'Create Deal'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
