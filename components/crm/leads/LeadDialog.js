import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'




export function LeadDialog({
    open,
    onOpenChange,
    lead,
    projects = [],
    users = [],
    onSubmit,
    submitting
}) {
    // We can keep local state for the form or use uncontrolled inputs with a ref/formData.
    // Controlled state is often easier for conditional rendering (like stages based on project)
    // But extraction from FormData is also fine. Let's stick to FormData to match existing pattern if possible,
    // or switch to controlled if we need dynamic stages logic inside here.

    // For this refactor, let's use internal state for projectId to fetch stages dynamically if needed, 
    // or better yet, pass the relevant stages as a prop if possible. 
    // Given the previous code fetched stages when projectId changed, we might want to lift that logic or 
    // keep it in the parent. Let's keep it in the parent for now to assume 'stages' are calculated there?
    // Actually, the original code fetched stages inside the component.
    // Let's make this component dumb and receive "stages" as a prop. 
    // The parent (Page) should handle fetching stages when the selected Project changes (even in the form).
    // Or we can query stages inside here using a hook? 
    // Let's use internal state for values to allow for the dynamic nature.

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        projectId: 'none',
        status: 'New',
        stageId: 'none',
        notes: '',
        assignedTo: 'unassigned'
    })

    // Update state when lead changes (edit mode)
    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                projectId: lead.project_id || 'none',
                status: lead.status || 'New',
                stageId: lead.stage_id || 'none',
                notes: lead.notes || '',
                assignedTo: lead.assigned_to || 'unassigned'
            })
        } else {
            // Reset for create mode
            setFormData({
                name: '',
                email: '',
                phone: '',
                projectId: 'none',
                status: 'New',
                stageId: 'none',
                notes: '',
                assignedTo: 'unassigned'
            })
        }
    }, [lead, open])

    // We need to fetch stages when projectId changes in the form.
    // Ideally this component uses a hook `useStages(projectId)`.
    // For now, let's assume we pass a `onProjectChange` prop or simply fetch internally?
    // Let's try to keep it simple: pass `projectId` to a `usePipelineStages` hook inside here?
    // Or just fetch? To match the existing pattern, let's keep it simple.

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
 
        // Basic Validations
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error('Please enter a valid email address')
            return
        }
 
        if (formData.phone) {
            const digits = formData.phone.replace(/\D/g, '')
            if (digits.length < 7 || digits.length > 15) {
                toast.error('Please enter a valid phone number')
                return
            }
        }
 
        // Convert 'none'/'unassigned' back to null
        const payload = {
            ...formData,
            phone: formData.phone,
            projectId: formData.projectId === 'none' ? null : formData.projectId,
            stageId: formData.stageId === 'none' ? null : formData.stageId,
            assignedTo: formData.assignedTo === 'unassigned' ? null : formData.assignedTo
        }
        onSubmit(payload)
    }

    // Special logic: Fetch stages for the selected project
    // We can use a simplified fetch here or rely on parent.
    // Let's rely on a `usePipelineStages` hook if we had one.
    // Since we don't, let's try to fetch normally.
    const [stages, setStages] = useState([])
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        const fetchStages = async () => {
            if (formData.projectId && formData.projectId !== 'none') {
                const res = await fetch(`/api/pipeline/stages?projectId=${formData.projectId}`)
                if (res.ok) {
                    const data = await res.json()
                    setStages(data.stages || [])
                }
            } else {
                setStages([])
            }
        }
        if (isMounted) fetchStages()
    }, [formData.projectId, isMounted])

    if (!isMounted) {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                    <DialogDescription>
                        {lead ? 'Update lead details and status.' : 'Enter the details for the new lead.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <PhoneInput
                                id="phone"
                                value={formData.phone}
                                onChange={(value) => handleChange('phone', value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="project">Project</Label>
                            <Select
                                value={formData.projectId}
                                onValueChange={(val) => handleChange('projectId', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Pipeline Stage</Label>
                            <Select
                                value={formData.stageId}
                                onValueChange={(val) => handleChange('stageId', val)}
                                disabled={stages.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={stages.length === 0 ? "Select Project First" : "Select Stage"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {stages.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assignedTo">Assign To</Label>
                            <Select
                                value={formData.assignedTo}
                                onValueChange={(val) => handleChange('assignedTo', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any initial notes..."
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : (lead ? 'Save Changes' : 'Add Lead')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
