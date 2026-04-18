'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Building, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'

export default function LinkUnitDialog({ lead, isOpen, onClose, onLinkSuccess }) {
    const [search, setSearch] = useState('')
    const [units, setUnits] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedUnitId, setSelectedUnitId] = useState(null)
    const [linking, setLinking] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setSearch('')
            setSelectedUnitId(null)
            fetchUnits()
        }
    }, [isOpen])

    const fetchUnits = async () => {
        setLoading(true)
        try {
            // Only fetch available units
            const res = await fetch('/api/inventory/units?status=available')
            const data = await res.json()
            setUnits(data.units || [])
        } catch (error) {
            console.error('Failed to load units:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUnits = units.filter(p =>
        (p.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase())
    )

    const handleLink = async () => {
        if (!selectedUnitId) return
        if (!lead?.id) {
            toast.error("Cannot link: Invalid lead ID")
            return
        }

        setLinking(true)
        try {
            const res = await fetch(`/api/leads/${lead.id}/link-unit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit_id: selectedUnitId })
            })

            if (!res.ok) throw new Error('Failed to link unit')

            toast.success('Unit linked to lead')
            if (onLinkSuccess) onLinkSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to link unit')
        } finally {
            setLinking(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Link Unit</DialogTitle>
                    <DialogDescription>
                        Select a unit to link to this lead. Only available units are shown.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search units..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="h-[300px] overflow-y-auto border rounded-xl bg-muted/10 p-2 space-y-2">
                        {loading ? (
                            <div className="text-center p-4 text-sm text-muted-foreground">Loading...</div>
                        ) : filteredUnits.length === 0 ? (
                            <div className="text-center p-8 text-sm text-muted-foreground">
                                No available units found.
                            </div>
                        ) : (
                            filteredUnits.map(unit => (
                                <div
                                    key={unit.id}
                                    onClick={() => setSelectedUnitId(unit.id)}
                                    className={`
                                        group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                        ${selectedUnitId === unit.id
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
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
                                            {selectedUnitId === unit.id && (
                                                <CheckCircle2 className="w-4 h-4 text-blue-600" />
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
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={linking}>Cancel</Button>
                    <Button onClick={handleLink} disabled={!selectedUnitId || linking}>
                        {linking ? 'Linking...' : 'Link Selected Unit'}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}
