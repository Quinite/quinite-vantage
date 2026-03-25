import React, { useState } from 'react'
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
import { User, Mail, Phone, Building2, Target, FileText } from 'lucide-react'


import { usePermission } from '@/contexts/PermissionContext' // Import hook

export default function LeadForm({
    initialData = null,
    projects = [],
    users = [], // New prop
    stages = [], // New Prop
    initialStageId = null,
    // initialStatus removed or kept for fallback - let's keep it for fallback
    initialStatus = 'new',
    onSubmit,
    onCancel,
    isSubmitting = false
}) {
    const canAssign = usePermission('assign_leads')
    const [phoneValue, setPhoneValue] = useState(initialData?.phone || '')

    React.useEffect(() => {
        setPhoneValue(initialData?.phone || '')
    }, [initialData?.phone])

    const handleSubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)

        const payload = {
            id: initialData?.id,
            name: formData.get('name'),
            email: formData.get('email'),
            phone: phoneValue,
            projectId: formData.get('projectId') === 'none' ? null : formData.get('projectId'),
            // If we have stages, prioritize stageId. Otherwise use status.
            stageId: formData.get('stageId') || initialStageId || initialData?.stage_id,
            status: formData.get('status'), // This might be hidden or derived
            notes: formData.get('notes'),
            assignedTo: formData.get('assignedTo') === 'unassigned' ? null : formData.get('assignedTo')
        }

        onSubmit(payload)
    }

    const [fetchedStages, setFetchedStages] = useState(stages)
    const [loadingStages, setLoadingStages] = useState(false)

    const [selectedStageId, setSelectedStageId] = useState(initialData?.stage_id || initialStageId || '')

    // Fetch stages when project changes
    const fetchStages = async (pid) => {
        setLoadingStages(true)
        try {
            // Retrieve stages for specific project or all organization stages if none selected
            const url = (!pid || pid === 'none')
                ? '/api/pipeline/stages'
                : `/api/pipeline/stages?projectId=${pid}`

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                const newStages = data.stages || []
                setFetchedStages(newStages)

                // Auto-select first stage if none selected or current selection is invalid
                // But preserve existing selection if it exists in new list
                if (newStages.length > 0) {
                    // Check if current selection is in the new list
                    const currentExists = newStages.find(s => s.id === selectedStageId)
                    if (!currentExists && !initialData?.stage_id) {
                        setSelectedStageId(newStages[0].id)
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch stages', e)
            setFetchedStages([])
        } finally {
            setLoadingStages(false)
        }
    }

    // Initial fetch if no stages provided, and refresh when initialData changes
    React.useEffect(() => {
        if (stages.length === 0) {
            fetchStages(initialData?.project_id || 'none')
        } else {
            // If stages provided via props, use them
            setFetchedStages(stages)
            // Ensure one is selected
            if (!selectedStageId && stages.length > 0) {
                setSelectedStageId(initialData?.stage_id || stages[0].id)
            }
        }
    }, [initialData, stages])

    // Sync selectedStageId when initialData changes
    React.useEffect(() => {
        if (initialData?.stage_id) {
            setSelectedStageId(initialData.stage_id)
        }
    }, [initialData?.stage_id])

    const handleProjectChange = (val) => {
        fetchStages(val)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    Full Name *
                </Label>
                <Input
                    name="name"
                    defaultValue={initialData?.name}
                    required
                    placeholder="Enter lead's full name"
                    className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        Email Address
                    </Label>
                    <Input
                        name="email"
                        type="email"
                        defaultValue={initialData?.email}
                        placeholder="email@example.com"
                        className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        Phone Number *
                    </Label>
                    <PhoneInput
                        name="phone"
                        value={phoneValue}
                        onChange={(value) => setPhoneValue(value)}
                        required
                        placeholder="98765 43210"
                        className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Assign To (Permission Gated) */}
            {canAssign && (
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        Assign To
                    </Label>
                    <Select name="assignedTo" defaultValue={initialData?.assigned_to || 'unassigned'}>
                        <SelectTrigger className="h-11 border-slate-300">
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
            )}

            {/* Project & Stage Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        Project
                    </Label>
                    <Select
                        name="projectId"
                        defaultValue={initialData?.project_id || 'none'}
                        onValueChange={handleProjectChange}
                    >
                        <SelectTrigger className="h-11 border-slate-300">
                            <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                <span className="text-slate-500">No Project</span>
                            </SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-500" />
                        Pipeline Stage
                    </Label>
                    <Select
                        name="stageId"
                        value={selectedStageId}
                        onValueChange={setSelectedStageId}
                        disabled={loadingStages || fetchedStages.length === 0}
                    >
                        <SelectTrigger className="h-11 border-slate-300">
                            <SelectValue placeholder={
                                loadingStages ? "Loading..." :
                                    fetchedStages.length === 0 ? "Select Project First" : "Select stage"
                            } />
                        </SelectTrigger>
                        <SelectContent>
                            {fetchedStages.map(stage => (
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

            {/* Notes Field */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Notes
                </Label>
                <Textarea
                    name="notes"
                    defaultValue={initialData?.notes}
                    rows={4}
                    placeholder="Add any additional notes or context about this lead..."
                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="h-11 px-6 border-slate-300 hover:bg-slate-50"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
                    {isSubmitting ? 'Saving...' : (initialData ? 'Create Lead' : 'Create Lead')}
                </Button>
            </div>
        </form>
    )
}
