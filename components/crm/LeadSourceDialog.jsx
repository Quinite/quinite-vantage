import { useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FileText, UserPlus, Upload, Database, LayoutTemplate, Megaphone, Smartphone, Building2, Globe, Zap, MessageSquare, Mail, Webhook, Code, Linkedin, Facebook, X } from 'lucide-react'
import LeadForm from './LeadForm'
import { toast } from 'react-hot-toast'
import dynamic from 'next/dynamic'

import { INTEGRATIONS } from './integrations-config'

const FormBuilder = dynamic(() => import('./FormBuilder'), {
    loading: () => <div className="h-64 flex items-center justify-center text-slate-400">Loading builder...</div>,
    ssr: false
})

export default function LeadSourceDialog({ open, onOpenChange, projectId, projects, users = [], onSuccess, singleEntryOnly = false }) {
    const { isExpired: subExpired } = useSubscription()
    const [activeTab, setActiveTab] = useState('manual')
    const [importProjectId, setImportProjectId] = useState(projectId || 'none')
    const [previewData, setPreviewData] = useState(null) // [NEW] Preview State

    const connectorCards = [...INTEGRATIONS].sort((a, b) => {
        if (a.status === 'available' && b.status !== 'available') return -1
        if (a.status !== 'available' && b.status === 'available') return 1
        return 0
    })

    const downloadSampleCSV = () => {
        const headers = ['Name', 'Phone', 'Email', 'Project', 'Notes']
        const rows = [
            ['John Doe', '9876543210', 'john@example.com', 'Project A', 'Interested in 2BHK'],
            ['Jane Smith', '+91 9999988888', 'jane@test.com', 'Project B', 'Budget 50L'],
            ['Bob Wilson', '07777766666', 'bob@demo.com', 'Project A', 'Call after 6 PM']
        ]
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "leads_sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target.result
            const rows = text.split('\n').map(row => row.split(','))
            const headers = rows[0].map(h => h.trim().toLowerCase())

            const leads = rows.slice(1).filter(r => r.length > 1).map(row => {
                const data = {}
                headers.forEach((h, i) => {
                    data[h] = row[i]?.trim()
                })

                // Try to resolve project name from CSV to ID
                let pid = null
                const pNameLike = Object.keys(data).find(k => k.includes('project'))
                if (pNameLike && data[pNameLike]) {
                    const found = projects.find(p => p.name.toLowerCase() === data[pNameLike].toLowerCase())
                    if (found) pid = found.id
                }

                // If Import context project is set (and not none), it overrides/defaults
                if (importProjectId && importProjectId !== 'none') {
                    pid = importProjectId
                }

                if (pid) data.project_id = pid

                return data
            })

            setPreviewData(leads)
            e.target.value = null // Reset input
        }
        reader.readAsText(file)
    }

    const handlePreviewUpdate = (index, field, value) => {
        const newData = [...previewData]
        newData[index] = { ...newData[index], [field]: value }
        setPreviewData(newData)
    }

    const handleBulkProjectApply = (pid) => {
        setImportProjectId(pid)
        if (pid === 'none') return

        const newData = previewData.map(row => ({
            ...row,
            project_id: pid
        }))
        setPreviewData(newData)
    }

    const handleFinalImport = async () => {
        try {
            const res = await fetch('/api/leads/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'csv_manual',
                    data: previewData,
                    map_project_id: null // We mapped in preview already
                })
            })

            const result = await res.json()
            if (result.success) {
                toast.success(`Imported ${result.summary.processed} leads!`)
                onOpenChange(false)
                setPreviewData(null)
                if (onSuccess) onSuccess()
            } else {
                toast.error(`Import failed: ${typeof result.message === 'object' ? JSON.stringify(result.message) : result.message}`)
            }
        } catch (err) {
            toast.error("Upload failed")
            console.error(err)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl border-0 shadow-2xl [&>button]:hidden",
                singleEntryOnly && "max-w-3xl h-auto max-h-[90vh]"
            )}>
                {/* Compact Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold text-white">
                                {singleEntryOnly ? 'Add New Lead' : 'Add New Leads'}
                            </DialogTitle>
                            {!singleEntryOnly && (
                                <DialogDescription className="text-blue-100 text-xs mt-0.5">
                                    Choose your preferred method to capture leads
                                </DialogDescription>
                            )}
                        </div>
                        <DialogClose className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50">
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </DialogClose>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 bg-slate-50">
                    {!singleEntryOnly && (
                        <div className="px-6 py-3 bg-white border-b border-slate-200">
                            <TabsList className="grid grid-cols-4 w-full bg-slate-100/80 p-1 rounded-lg h-auto">
                                <TabsTrigger
                                    value="manual"
                                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md py-2 px-3 transition-all duration-200 text-xs font-medium"
                                >
                                    <UserPlus className="w-4 h-4 mr-1.5" />
                                    Manual
                                </TabsTrigger>
                                <TabsTrigger
                                    value="builder"
                                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md py-2 px-3 transition-all duration-200 text-xs font-medium"
                                >
                                    <LayoutTemplate className="w-4 h-4 mr-1.5" />
                                    Form Builder
                                </TabsTrigger>
                                <TabsTrigger
                                    value="import"
                                    disabled={subExpired}
                                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md py-2 px-3 transition-all duration-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={subExpired ? 'Subscription expired — renew to import leads' : undefined}
                                >
                                    <Upload className="w-4 h-4 mr-1.5" />
                                    CSV Import
                                </TabsTrigger>
                                <TabsTrigger
                                    value="connect"
                                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md py-2 px-3 transition-all duration-200 text-xs font-medium"
                                >
                                    <Database className="w-4 h-4 mr-1.5" />
                                    Integrations
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto" style={{ padding: '1.5rem' }}>
                        <TabsContent value="manual" className="mt-0 h-full">
                            <Card className="max-w-3xl mx-auto border shadow-md bg-white rounded-xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <CardTitle className="text-base font-semibold text-slate-900">Single Lead Entry</CardTitle>
                                            <CardDescription className="text-xs text-slate-600 mt-0.5">
                                                Manually enter lead details for immediate follow-up
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <LeadForm
                                        projects={projects}
                                        users={users}
                                        initialData={{ project_id: projectId }}
                                        onSubmit={async (data) => {
                                            try {
                                                const res = await fetch('/api/leads', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(data)
                                                })
                                                const result = await res.json()
                                                if (res.ok) {
                                                    toast.success("Lead added!")
                                                    onOpenChange(false)
                                                    if (onSuccess) onSuccess()
                                                } else {
                                                    console.error('[LeadSourceDialog] API Error:', result)
                                                    const errorMsg = result.error && typeof result.error === 'object' ? (result.error.message || JSON.stringify(result.error)) : (result.error || result.message || "Failed to create lead")
                                                    toast.error(errorMsg)
                                                }
                                            } catch (e) {
                                                console.error('[LeadSourceDialog] Exception:', e)
                                                toast.error("Network error: " + e.message)
                                            }
                                        }}
                                        onCancel={() => onOpenChange(false)}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="builder" className="mt-0 h-full">
                            <FormBuilder />
                        </TabsContent>

                        <TabsContent value="import" className="mt-0 h-full">
                            {!previewData ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 m-1">
                                    <div className="p-4 bg-white rounded-full shadow-sm">
                                        <Upload className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">Upload CSV File</h3>
                                        <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                                            Drag and drop your spreadsheet here or browse to upload.
                                        </p>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={() => document.getElementById('csv-upload').click()}>
                                            Select File
                                        </Button>
                                        <Button variant="ghost" className="text-slate-500" onClick={downloadSampleCSV}>
                                            Download Template
                                        </Button>
                                    </div>
                                    <input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col h-full gap-4">
                                    {/* Preview Header / Controls */}
                                    <div className="flex items-center justify-between bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                        <div className="flex items-center gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold text-yellow-800">Bulk Assign Project</Label>
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={importProjectId}
                                                        onValueChange={handleBulkProjectApply}
                                                    >
                                                        <SelectTrigger className="h-8 w-[200px] bg-white border-yellow-200">
                                                            <SelectValue placeholder="Select Project for All" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Mixed / From CSV</SelectItem>
                                                            {projects.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="h-8 w-px bg-yellow-200 mx-2" />
                                            <div className="text-sm text-yellow-700">
                                                <span className="font-bold">{previewData.length}</span> leads found
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setPreviewData(null)}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" onClick={handleFinalImport} disabled={subExpired}>
                                                Import Leads
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Data Table */}
                                    <div className="flex-1 border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                        <div className="overflow-auto flex-1">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium">Name</th>
                                                        <th className="px-4 py-3 font-medium">Phone</th>
                                                        <th className="px-4 py-3 font-medium">Email</th>
                                                        <th className="px-4 py-3 font-medium w-[250px]">Project Assigment</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {previewData.map((row, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2 font-medium text-slate-700">{row.name || '-'}</td>
                                                            <td className="px-4 py-2 text-slate-600 font-mono">{row.phone || <span className="text-red-500 font-bold">Missing</span>}</td>
                                                            <td className="px-4 py-2 text-slate-600">{row.email || '-'}</td>
                                                            <td className="px-4 py-2">
                                                                <Select
                                                                    value={row.project_id || 'none'}
                                                                    onValueChange={(val) => handlePreviewUpdate(i, 'project_id', val === 'none' ? null : val)}
                                                                >
                                                                    <SelectTrigger className={`h-7 text-xs w-full ${!row.project_id ? 'border-red-300 bg-red-50 text-red-600' : ''}`}>
                                                                        <SelectValue placeholder="Select Project" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none" className="text-muted-foreground">No Project</SelectItem>
                                                                        {projects.map(p => (
                                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        < TabsContent value="connect" className="mt-0 h-full relative" >
                            <div className="absolute inset-0 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {connectorCards.map(tool => (
                                        <div key={tool.id} className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all p-6 flex flex-col group cursor-pointer relative">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`h-16 w-16 flex items-center justify-center rounded-xl border ${tool.color.replace('text-', 'border-').split(' ')[0]} bg-gray-50/50`}>
                                                    <tool.icon className="h-10 w-10 object-contain" />
                                                </div>
                                                {tool.status === 'coming-soon' ? (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                                                        Coming Soon
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                                                        Available
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-base font-bold text-slate-900 mb-2">{tool.name}</h3>
                                            <p className="text-slate-500 text-xs mb-6 flex-grow leading-relaxed">{tool.description}</p>

                                            <Button
                                                variant="outline"
                                                className="w-full text-xs h-9"
                                                disabled={tool.status === 'coming-soon'}
                                                onClick={() => {
                                                    if (tool.docs) {
                                                        // Logic to show docs/config (could reuse Dialog state if lifted or show toast)
                                                        toast('Configuration available in Settings > Integrations', { icon: '⚙️' })
                                                    }
                                                }}
                                            >
                                                {tool.status === 'coming-soon' ? 'Notify Me' : 'Configure'}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent >
                    </div >
                </Tabs >
            </DialogContent >
        </Dialog >
    )
}


