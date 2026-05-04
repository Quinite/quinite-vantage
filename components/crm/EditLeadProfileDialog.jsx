'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { usePermission } from '@/contexts/PermissionContext'
import { useProjects } from '@/hooks/useProjects'

export default function EditLeadProfileDialog({ open, onOpenChange, lead, onSave }) {
    const canAssign = usePermission('assign_leads')
    const [loading, setLoading] = useState(false)

    const { data: projects = [] } = useProjects({ status: 'active' })
    const [users, setUsers] = useState([])
    const [stages, setStages] = useState([])
    const [loadingStages, setLoadingStages] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        projectId: 'none',
        stageId: '',
        assignedTo: 'unassigned',
        phone: '',
        mobile: '',
        company: '',
        job_title: '',
        department: '',
        mailing_street: '',
        mailing_city: '',
        mailing_state: '',
        mailing_zip: '',
        mailing_country: '',
        score: '',
        interest_level: ''
    })

    // Fetch users once on open
    useEffect(() => {
        if (!open) return
        fetch('/api/admin/users').then(r => r.ok ? r.json() : { users: [] }).then(d => setUsers(d.users || []))
    }, [open])

    // Populate form when lead changes
    useEffect(() => {
        if (lead && open) {
            setFormData({
                name: lead.name || '',
                email: lead.email || '',
                projectId: lead.project_id || 'none',
                stageId: lead.stage_id || '',
                assignedTo: lead.assigned_to || 'unassigned',
                phone: lead.phone || '',
                mobile: lead.mobile || '',
                company: lead.company || '',
                job_title: lead.job_title || '',
                department: lead.department || '',
                mailing_street: lead.mailing_street || '',
                mailing_city: lead.mailing_city || '',
                mailing_state: lead.mailing_state || '',
                mailing_zip: lead.mailing_zip || '',
                mailing_country: lead.mailing_country || '',
                score: lead.score ?? '',
                interest_level: lead.interest_level || ''
            })
            // Fetch stages for the lead's current project
            fetchStages(lead.project_id || 'none', lead.stage_id)
        }
    }, [lead, open])

    const fetchStages = async (projectId, preserveStageId) => {
        setLoadingStages(true)
        try {
            const url = (!projectId || projectId === 'none')
                ? '/api/pipeline/stages'
                : `/api/pipeline/stages?projectId=${projectId}`
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                const newStages = data.stages || []
                setStages(newStages)
                if (preserveStageId) {
                    const exists = newStages.find(s => s.id === preserveStageId)
                    if (!exists && newStages.length > 0) {
                        setFormData(prev => ({ ...prev, stageId: newStages[0].id }))
                    }
                } else if (newStages.length > 0) {
                    setFormData(prev => ({ ...prev, stageId: newStages[0].id }))
                }
            }
        } catch (e) {
            console.error('Failed to fetch stages', e)
            setStages([])
        } finally {
            setLoadingStages(false)
        }
    }

    const handleProjectChange = (val) => {
        setFormData(prev => ({ ...prev, projectId: val, stageId: '' }))
        fetchStages(val, null)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!lead?.id) {
            toast.error('Cannot update: Invalid lead ID')
            return
        }
        if (!formData.name?.trim()) {
            toast.error('Name is required')
            return
        }
        setLoading(true)
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                projectId: formData.projectId === 'none' ? null : formData.projectId,
                stageId: formData.stageId || undefined,
                assignedTo: formData.assignedTo === 'unassigned' ? null : formData.assignedTo,
                phone: formData.phone,
                mobile: formData.mobile,
                company: formData.company,
                job_title: formData.job_title,
                department: formData.department,
                mailing_street: formData.mailing_street,
                mailing_city: formData.mailing_city,
                mailing_state: formData.mailing_state,
                mailing_zip: formData.mailing_zip,
                mailing_country: formData.mailing_country,
                score: formData.score !== '' ? Number(formData.score) : undefined,
                interest_level: formData.interest_level || undefined
            }
            const res = await fetch(`/api/leads/${lead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to update profile')
            }
            toast.success('Profile updated successfully')
            onSave()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(error.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Profile Details</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 pr-1 space-y-6 py-4">

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Basic Info</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="bg-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Project</Label>
                                    <Select value={formData.projectId} onValueChange={handleProjectChange}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Project</SelectItem>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pipeline Stage</Label>
                                    <Select
                                        value={formData.stageId}
                                        onValueChange={val => setFormData(prev => ({ ...prev, stageId: val }))}
                                        disabled={loadingStages || stages.length === 0}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={loadingStages ? 'Loading...' : stages.length === 0 ? 'No stages' : 'Select stage'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stages.map(stage => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                                        {stage.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {canAssign && (
                                    <div className="space-y-2">
                                        <Label>Assign To</Label>
                                        <Select value={formData.assignedTo} onValueChange={val => setFormData(prev => ({ ...prev, assignedTo: val }))}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select user" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {users.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="score">Score (0–100)</Label>
                                    <Input
                                        id="score"
                                        name="score"
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formData.score}
                                        onChange={handleChange}
                                        placeholder="Auto-set by AI"
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Interest Level</Label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {['high', 'medium', 'low', 'none'].map(level => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, interest_level: level }))}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all capitalize ${
                                                formData.interest_level === level
                                                    ? level === 'high' ? 'bg-rose-100 text-rose-700 ring-rose-300'
                                                    : level === 'medium' ? 'bg-amber-100 text-amber-700 ring-amber-300'
                                                    : level === 'low' ? 'bg-slate-200 text-slate-600 ring-slate-300'
                                                    : 'bg-slate-100 text-slate-500 ring-slate-200'
                                                    : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300'
                                            }`}
                                        >
                                            {level === 'high' ? '🔥 High' : level === 'medium' ? '⚡ Medium' : level === 'low' ? '💤 Low' : 'None'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Details</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <PhoneInput id="phone" name="phone" value={formData.phone} onChange={value => setFormData(prev => ({ ...prev, phone: value }))} defaultCountry="IN" className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile">Mobile</Label>
                                    <PhoneInput id="mobile" name="mobile" value={formData.mobile} onChange={value => setFormData(prev => ({ ...prev, mobile: value }))} defaultCountry="IN" className="bg-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company">Company</Label>
                                    <Input id="company" name="company" value={formData.company} onChange={handleChange} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="job_title">Job Title</Label>
                                    <Input id="job_title" name="job_title" value={formData.job_title} onChange={handleChange} className="bg-white" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input id="department" name="department" value={formData.department} onChange={handleChange} className="bg-white" />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</p>

                            <div className="space-y-2">
                                <Label htmlFor="mailing_street">Street Address</Label>
                                <Input id="mailing_street" name="mailing_street" value={formData.mailing_street} onChange={handleChange} className="bg-white" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_city">City</Label>
                                    <Input id="mailing_city" name="mailing_city" value={formData.mailing_city} onChange={handleChange} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_state">State/Province</Label>
                                    <Input id="mailing_state" name="mailing_state" value={formData.mailing_state} onChange={handleChange} className="bg-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_zip">Zip/Postal Code</Label>
                                    <Input id="mailing_zip" name="mailing_zip" value={formData.mailing_zip} onChange={handleChange} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_country">Country</Label>
                                    <Input id="mailing_country" name="mailing_country" value={formData.mailing_country} onChange={handleChange} className="bg-white" />
                                </div>
                            </div>
                        </div>

                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
