"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Copy, Check, Upload, AlertCircle, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { INTEGRATIONS } from "@/components/crm/integrations-config"

export default function IntegrationsPage() {
    const [selectedIntegration, setSelectedIntegration] = useState(null)
    const [webhookUrl, setWebhookUrl] = useState("")
    const [copied, setCopied] = useState(false)
    const SECRET_KEY = "vantage-secret-key" // Ideally fetch from API

    useEffect(() => {
        if (typeof window !== "undefined") {
            setWebhookUrl(`${window.location.origin}/api/leads/ingest`)
        }
    }, [])

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("Copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="h-full bg-gray-50 overflow-y-auto">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
                    <p className="text-gray-500 mt-2">Connect your lead sources and external tools to Vantage.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...INTEGRATIONS].sort((a, b) => {
                        if (a.status === 'available' && b.status !== 'available') return -1
                        if (a.status !== 'available' && b.status === 'available') return 1
                        return 0
                    }).map((tool) => (
                        <div key={tool.id} className="bg-white rounded-xl border hover:shadow-md transition-all p-6 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`h-16 w-16 flex items-center justify-center rounded-xl border ${tool.color.replace('text-', 'border-').split(' ')[0]} bg-gray-50/50`}>
                                    <tool.icon className="h-10 w-10 object-contain" />
                                </div>
                                {tool.connected ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full tracking-wide">
                                        Active
                                    </span>
                                ) : tool.status === 'coming-soon' ? (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold uppercase rounded-full tracking-wide">
                                        Coming Soon
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium uppercase rounded-full tracking-wide">
                                        Available
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2">{tool.name}</h3>
                            <p className="text-gray-600 text-sm mb-6 flex-grow">{tool.description}</p>

                            <Button
                                variant={tool.connected ? "outline" : "default"}
                                className="w-full"
                                disabled={tool.status === 'coming-soon'}
                                onClick={() => {
                                    if (tool.docs) setSelectedIntegration(tool)
                                    else toast.success(`${tool.name} is already configured via Environment Variables.`)
                                }}
                            >
                                {tool.status === 'coming-soon' ? 'Coming Soon' : (tool.connected ? "Configure" : "Connect")}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Configuration Modal */}
                <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                {selectedIntegration && (
                                    <selectedIntegration.icon className="h-8 w-8 object-contain" />
                                )}
                                Setup {selectedIntegration?.name}
                            </DialogTitle>
                            <DialogDescription>
                                Follow these steps to start receiving leads automatically.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedIntegration && (
                            <div className="space-y-6 mt-4">
                                {/* Step 1: Instructions */}
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 space-y-2">
                                    <p className="font-semibold flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" /> Setup Instructions:
                                    </p>
                                    <ol className="list-decimal pl-5 space-y-1">
                                        <li>{selectedIntegration.docs.step1}</li>
                                        <li>{selectedIntegration.docs.step2}</li>
                                        <li>{selectedIntegration.docs.step3}</li>
                                    </ol>
                                </div>

                                {/* Step 2: Webhook URL */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Webhook Endpoint URL</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-gray-100 p-3 rounded-lg border text-sm font-mono text-gray-800 break-all">
                                            {webhookUrl}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleCopy(webhookUrl)}
                                        >
                                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Step 3: Secret Key */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Secret Key / Token</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-gray-100 p-3 rounded-lg border text-sm font-mono text-gray-800">
                                            {SECRET_KEY}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleCopy(SECRET_KEY)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Add this as a query parameter <code>?secret={SECRET_KEY}</code> or in the JSON body.
                                    </p>
                                </div>


                                {/* Step 4: JSON Payload Preview */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-2">Payload Configuration</label>
                                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                        <pre className="text-xs text-green-400 font-mono">
                                            {selectedIntegration.docs.payload}
                                        </pre>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button onClick={() => setSelectedIntegration(null)}>Done</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
                <div className="h-20"></div>
            </div>
        </div>
    )
}
