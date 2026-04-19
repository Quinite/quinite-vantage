'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOutgoing, PhoneIncoming, ChevronDown, ChevronUp, Volume2, FileText } from 'lucide-react'

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

const STATUS_CONFIG = {
    answered:    { cls: 'bg-green-100 text-green-700 border-green-200',  label: 'Answered' },
    no_answer:   { cls: 'bg-gray-100 text-gray-500 border-gray-200',    label: 'No Answer' },
    busy:        { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Busy' },
    failed:      { cls: 'bg-red-100 text-red-700 border-red-200',       label: 'Failed' },
    in_progress: { cls: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse', label: 'In Progress' },
    completed:   { cls: 'bg-green-100 text-green-700 border-green-200', label: 'Completed' },
    disconnected:{ cls: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Disconnected' },
}

function getStatusConfig(status) {
    return STATUS_CONFIG[(status || '').toLowerCase()] || { cls: 'bg-gray-100 text-gray-500 border-gray-200', label: status || 'Unknown' }
}

function getSentimentLabel(score) {
    if (score == null) return null
    if (score >= 0.3)  return { label: '😊 Positive', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (score <= -0.3) return { label: '😞 Negative', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    return { label: '😐 Neutral', cls: 'bg-slate-50 text-slate-600 border-slate-200' }
}

function getInterestLabel(level) {
    if (!level || level === 'none') return null
    const map = {
        high:   { label: '🔥 High',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
        medium: { label: '⚡ Medium', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        low:    { label: '💤 Low',    cls: 'bg-slate-50 text-slate-500 border-slate-200' },
    }
    return map[level] ?? null
}

function CallCard({ call }) {
    const [expanded, setExpanded] = useState(false)
    const [showTranscript, setShowTranscript] = useState(false)

    const statusCfg = getStatusConfig(call.call_status)
    const sentimentCfg = getSentimentLabel(call.sentiment_score)
    const interestLevel = call.interest_level || call.ai_metadata?.interest_level
    const interestCfg = getInterestLabel(interestLevel)
    const isOutbound = (call.direction || 'outbound').toLowerCase() === 'outbound'

    return (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:border-gray-200 transition-colors">
            {/* Collapsed header — always visible */}
            <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left group"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Direction icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isOutbound ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                }`}>
                    {isOutbound
                        ? <PhoneOutgoing className="w-3.5 h-3.5" />
                        : <PhoneIncoming className="w-3.5 h-3.5" />
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-700">{formatDate(call.created_at)}</span>
                        <span className="text-[11px] text-gray-400">{formatDuration(call.duration)}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.cls}`}>
                            {statusCfg.label}
                        </span>
                    </div>
                    {call.summary && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate leading-snug">
                            {call.summary}
                        </p>
                    )}
                </div>

                <div className="shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-50">
                    {/* Summary (full) */}
                    {call.summary && (
                        <p className="text-xs text-gray-700 leading-relaxed">
                            {call.summary}
                        </p>
                    )}

                    {/* Pills row */}
                    {(sentimentCfg || interestCfg) && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {sentimentCfg && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sentimentCfg.cls}`}>
                                    {sentimentCfg.label}
                                </span>
                            )}
                            {call.sentiment_score != null && (
                                <span className="text-[11px] text-gray-400 font-mono">
                                    {(call.sentiment_score * 100).toFixed(0)}%
                                </span>
                            )}
                            {interestCfg && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${interestCfg.cls}`}>
                                    {interestCfg.label}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    {call.notes && (
                        <div className="text-[11px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                            <span className="font-semibold text-gray-700">Notes: </span>
                            {call.notes}
                        </div>
                    )}

                    {/* Disconnect reason */}
                    {call.disconnect_reason && (
                        <p className="text-[11px] text-gray-400 italic">
                            Ended: {call.disconnect_reason.replace(/_/g, ' ')}
                        </p>
                    )}

                    {/* Recording player */}
                    {call.recording_url && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Recording</span>
                            </div>
                            <audio
                                controls
                                src={call.recording_url}
                                className="w-full h-8"
                                preload="none"
                            />
                        </div>
                    )}

                    {/* Transcript toggle */}
                    {call.conversation_transcript && (
                        <div>
                            <button
                                onClick={() => setShowTranscript(t => !t)}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                {showTranscript ? 'Hide Transcript' : 'View Transcript'}
                            </button>
                            {showTranscript && (
                                <pre className="mt-2 text-[11px] font-mono bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap border border-gray-100 text-gray-700 leading-relaxed">
                                    {call.conversation_transcript}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function LeadCallsTab({ callLogs = [] }) {
    const sorted = [...callLogs].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )

    if (sorted.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No calls recorded yet</p>
                <p className="text-xs text-muted-foreground mt-1">AI-dialer call history will appear here</p>
            </div>
        )
    }

    const totalAnswered = sorted.filter(c => (c.call_status || '').toLowerCase() === 'answered').length
    const totalDuration = sorted.reduce((s, c) => s + (c.duration || 0), 0)

    return (
        <div className="space-y-4 max-w-3xl">
            {/* Summary strip */}
            <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total Calls</span>
                    <span className="text-base font-bold text-slate-700">{sorted.length}</span>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Answered</span>
                    <span className="text-base font-bold text-green-700">{totalAnswered}</span>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total Talk Time</span>
                    <span className="text-base font-bold text-slate-700">{formatDuration(totalDuration)}</span>
                </div>
            </div>

            {/* Call cards */}
            <div className="space-y-2">
                {sorted.map((call) => (
                    <CallCard key={call.id} call={call} />
                ))}
            </div>
        </div>
    )
}
