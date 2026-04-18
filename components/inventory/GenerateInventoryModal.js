'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Loader2, Layers, Building2, TowerControl } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function GenerateInventoryModal({ project, unitConfigs, isOpen, onClose, onGenerated }) {
    const [loading, setLoading] = useState(false)
    const [towers, setTowers] = useState([])
    const [formData, setFormData] = useState({
        tower_id: '',
        startFloor: '1',
        endFloor: '10',
        unitsPerFloor: '4',
        config_id: unitConfigs?.[0]?.id || ''
    })

    useEffect(() => {
        if (isOpen && project?.id) {
            fetchTowers()
        }
    }, [isOpen, project?.id])

    const fetchTowers = async () => {
        const { data, error } = await supabase
            .from('towers')
            .select('*')
            .eq('project_id', project.id)
            .order('order_index')
        
        if (data) {
            setTowers(data)
            if (data.length > 0 && !formData.tower_id) {
                setFormData(prev => ({ ...prev, tower_id: data[0].id }))
            }
        }
    }

    const handleGenerate = async () => {
        if (!formData.config_id) {
            toast.error('Please select a unit configuration')
            return
        }
        if (!formData.tower_id) {
            toast.error('Please select a tower')
            return
        }
        
        setLoading(true)
        try {
            const res = await fetch(`/api/projects/${project.id}/generate-inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tower_id: formData.tower_id,
                    config_id: formData.config_id,
                    startFloor: formData.startFloor,
                    endFloor: formData.endFloor,
                    unitsPerFloor: formData.unitsPerFloor,
                    namingPattern: '{tower}-{floor}{unit}'
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Generation failed')

            toast.success(data.message || 'Inventory generated successfully')
            if (onGenerated) onGenerated()
            onClose()
        } catch (error) {
            console.error('Generation error', error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Preview generation count
    const totalUnitsCount = (parseInt(formData.endFloor) - parseInt(formData.startFloor) + 1) * parseInt(formData.unitsPerFloor)
    const selectedTower = towers.find(t => t.id === formData.tower_id)
    const towerName = selectedTower?.name || 'Tower'
    const previewNameStart = `${towerName}-${formData.startFloor}01`
    const previewNameEnd = `${towerName}-${formData.endFloor}${formData.unitsPerFloor.toString().padStart(2, '0')}`

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl border-0 shadow-2xl overflow-hidden p-0">
                <div className="bg-blue-600 p-6 text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">Bulk Inventory Engine</DialogTitle>
                        </div>
                        <DialogDescription className="text-blue-100 font-bold text-xs uppercase tracking-widest opacity-80">
                            Automate unit generation for project <span className="text-white bg-blue-500 px-1.5 rounded">{project?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Tower & Config Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Tower</Label>
                            <Select
                                value={formData.tower_id}
                                onValueChange={v => setFormData({ ...formData, tower_id: v })}
                            >
                                <SelectTrigger className="h-11 bg-slate-50 border-slate-100 font-bold text-sm rounded-xl">
                                    <SelectValue placeholder="Select Tower" />
                                </SelectTrigger>
                                <SelectContent>
                                    {towers.length === 0 ? (
                                        <SelectItem value="none" disabled>No Towers Found</SelectItem>
                                    ) : (
                                        towers.map((tower) => (
                                            <SelectItem key={tower.id} value={tower.id} className="font-bold">
                                                {tower.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Base Config</Label>
                            <Select
                                value={formData.config_id}
                                onValueChange={v => setFormData({ ...formData, config_id: v })}
                            >
                                <SelectTrigger className="h-11 bg-slate-50 border-slate-100 font-bold text-sm rounded-xl">
                                    <SelectValue placeholder="Select Config" />
                                </SelectTrigger>
                                <SelectContent>
                                    {unitConfigs?.map((config) => (
                                        <SelectItem key={config.id} value={config.id} className="font-bold">
                                            {config.config_name} ({config.bedrooms}BHK)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Floor & Units Logic */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Floor</Label>
                            <Input
                                type="number"
                                value={formData.startFloor}
                                className="h-10 bg-white border-slate-200 font-black text-center"
                                onChange={e => setFormData({ ...formData, startFloor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Floor</Label>
                            <Input
                                type="number"
                                value={formData.endFloor}
                                className="h-10 bg-white border-slate-200 font-black text-center"
                                onChange={e => setFormData({ ...formData, endFloor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Units/Floor</Label>
                            <Input
                                type="number"
                                value={formData.unitsPerFloor}
                                className="h-10 bg-white border-slate-200 font-black text-center"
                                onChange={e => setFormData({ ...formData, unitsPerFloor: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Preview Summary */}
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Computation Result</span>
                            <Badge className="bg-blue-600 text-white font-black text-xs h-6 px-3 rounded-full">
                                {totalUnitsCount} UNITS READY
                            </Badge>
                        </div>
                        <div className="h-px bg-blue-100 my-1" />
                        <div className="flex justify-between items-center group">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sequence Preview</span>
                            <span className="text-[11px] font-black text-slate-800 tracking-tight">
                                {previewNameStart} <span className="text-slate-300 font-normal mx-1">→</span> {previewNameEnd}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600">Cancel</Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || totalUnitsCount <= 0}
                        className="bg-blue-600 hover:bg-blue-700 h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        EXECUTE GENERATION
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
