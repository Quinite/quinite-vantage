'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ChevronLeft, Building2, Eye } from 'lucide-react'
import Link from 'next/link'

export default function NewPropertyPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState([])
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        type: 'apartment',
        status: 'available',
        project_id: 'none',
        show_in_crm: true,
        bedrooms: '',
        bathrooms: '',
        size: '',
        address: '',
        description: ''
    })

    useEffect(() => {
        fetchProjects()
    }, [])

    const fetchProjects = async () => {
        try {
            console.log('Fetching projects...')
            const res = await fetch('/api/projects')
            console.log('Projects response status:', res.status)
            const data = await res.json()
            console.log('Projects data:', data)
            setProjects(data.projects || [])
        } catch (error) {
            console.error('Failed to load projects', error)
        }
    }

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSelect = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSwitch = (checked) => {
        setFormData(prev => ({ ...prev, show_in_crm: checked }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                ...formData,
                projectId: formData.project_id === 'none' ? null : formData.project_id
            }

            const res = await fetch('/api/inventory/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to create property')

            toast.success('Property created successfully')
            router.push('/dashboard/admin/inventory')
        } catch (error) {
            toast.error('Error creating property')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/admin/inventory">
                        <Button variant="ghost" size="icon" className="h-10 w-10 border border-slate-200 hover:bg-slate-50">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Add New Property</h1>
                        <p className="text-sm text-slate-500 mt-1">Create a new inventory listing for your CRM and website.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content Column */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="space-y-2">
                                    <Label>Property Title *</Label>
                                    <Input name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Luxury 3BHK in Indiranagar" />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Block/Tower</Label>
                                        <Input name="block_name" value={formData.block_name || ''} onChange={handleChange} placeholder="e.g. A" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Floor No.</Label>
                                        <Input name="floor_number" value={formData.floor_number || ''} onChange={handleChange} placeholder="e.g. 1" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit No.</Label>
                                        <Input name="unit_number" value={formData.unit_number || ''} onChange={handleChange} placeholder="e.g. 101" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Price (₹) *</Label>
                                        <Input name="price" type="number" required value={formData.price} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type *</Label>
                                        <Select value={formData.type} onValueChange={(val) => handleSelect('type', val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="apartment">Apartment</SelectItem>
                                                <SelectItem value="villa">Villa</SelectItem>
                                                <SelectItem value="plot">Plot</SelectItem>
                                                <SelectItem value="commercial">Commercial</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Configuration</Label>
                                    <Input name="configuration" value={formData.configuration || ''} onChange={handleChange} placeholder="e.g. 3BHK" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <Textarea name="address" value={formData.address} onChange={handleChange} placeholder="Full address..." rows={3} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Details & Features</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>Bedrooms</Label>
                                    <Input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bathrooms</Label>
                                    <Input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Size (Sq. Ft)</Label>
                                    <Input name="size" type="number" value={formData.size} onChange={handleChange} />
                                </div>
                                <div className="space-y-2 col-span-3">
                                    <Label>Description</Label>
                                    <Textarea name="description" value={formData.description} onChange={handleChange} className="min-h-[100px]" placeholder="Detailed description of the property..." />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={formData.status} onValueChange={(val) => handleSelect('status', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="sold">Sold</SelectItem>
                                            <SelectItem value="reserved">Reserved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        Project Association
                                    </Label>
                                    <Select value={formData.project_id} onValueChange={(val) => handleSelect('project_id', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={projects.length === 0 ? "Loading projects..." : "Select Project"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Project</SelectItem>
                                            {projects.length === 0 ? (
                                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                                            ) : (
                                                projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {projects.length === 0
                                            ? "No projects found. Create one in CRM first."
                                            : "Link this property to a specific project."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                            Show in CRM
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Visible to sales agents</p>
                                    </div>
                                    <Switch
                                        checked={formData.show_in_crm}
                                        onCheckedChange={handleSwitch}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-3">
                            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20" disabled={loading}>
                                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                                Create Listing
                            </Button>
                            <Link href="/dashboard/admin/inventory" className="w-full">
                                <Button variant="outline" type="button" className="w-full">Cancel</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
