'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Mail, Phone, Smartphone, Building, MapPin, Edit2, AlertTriangle, Clock, UserCheck, PhoneCall, User } from 'lucide-react'
import { format } from 'date-fns'

const getInitials = (name) => {
    if (!name) return 'LP'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function relativeTime(ts) {
    if (!ts) return null
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}d ago`
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatCallbackTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
}

function scoreColor(score) {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
    if (score >= 50) return 'bg-amber-100 text-amber-700 ring-amber-200'
    return 'bg-slate-100 text-slate-500 ring-slate-200'
}

function interestConfig(level) {
    if (!level || level === 'none') return null
    const map = {
        high: { label: '🔥 High', cls: 'bg-rose-50 text-rose-600 ring-rose-200' },
        medium: { label: '⚡ Medium', cls: 'bg-amber-50 text-amber-600 ring-amber-200' },
        low: { label: '💤 Low', cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
    }
    return map[level] ?? null
}

function sentimentConfig(score) {
    if (score == null) return null
    if (score >= 0.3) return { label: '😊 Positive', cls: 'bg-emerald-50 text-emerald-600 ring-emerald-200' }
    if (score <= -0.3) return { label: '😞 Negative', cls: 'bg-rose-50 text-rose-600 ring-rose-200' }
    return { label: '😐 Neutral', cls: 'bg-slate-50 text-slate-500 ring-slate-200' }
}

function readinessConfig(val) {
    if (!val) return null
    const map = {
        high: { label: '✅ Ready', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
        medium: { label: '🤔 Considering', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
        low: { label: '🔍 Exploring', cls: 'bg-blue-50 text-blue-600 ring-blue-200' },
        not_ready: { label: '⏳ Not Ready', cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
    }
    return map[val.toLowerCase()] ?? { label: val, cls: 'bg-slate-50 text-slate-500 ring-slate-200' }
}

function IntelPill({ label, cls }) {
    return (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap ${cls}`}>
            {label}
        </span>
    )
}

export default function LeadProfileSidebar({ lead, onEditProfile, onEditAvatar, upcomingVisit }) {
    if (!lead) return null

    const interest = interestConfig(lead.interest_level)
    const sentiment = sentimentConfig(lead.last_sentiment_score)
    const readiness = readinessConfig(lead.purchase_readiness)
    const lastCalled = relativeTime(lead.last_contacted_at)

    const hasIntelligence = lead.score > 0 || interest || sentiment || readiness || lead.budget_range || lead.total_calls > 0

    return (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            {/* Banner */}
            <div
                className="relative h-28 w-full"
                style={{ background: 'linear-gradient(to right, #ffffff, #e1f5fe, #b3e5fc)' }}
            >
                <button
                    onClick={onEditProfile}
                    className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-gray-500 hover:text-primary shadow-sm transition-all"
                    aria-label="Edit profile"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center text-center px-6 -mt-12 mb-4">
                <div className="relative mb-3 group">
                    <Avatar key={lead.avatar_url || 'no-avatar'} className="h-24 w-24 border-4 border-background shadow-md">
                        {lead.avatar_url ? (
                            <img
                                src={lead.avatar_url}
                                alt={lead.name}
                                className="aspect-square h-full w-full object-cover"
                                onError={(e) => { e.target.style.display = 'none' }}
                            />
                        ) : null}
                        <AvatarFallback className="text-2xl font-bold bg-white text-primary">
                            {getInitials(lead.name)}
                        </AvatarFallback>
                    </Avatar>
                    <button
                        onClick={onEditAvatar}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        aria-label="Change avatar"
                    >
                        <Camera className="w-6 h-6 text-white" />
                    </button>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
                <p className="text-sm text-gray-500">{lead.company || 'No Company'}</p>
                {lead.project && (
                    <Badge variant="outline" className="mt-2 text-xs font-medium text-primary border-primary/30 bg-primary/5">
                        {lead.project.name}
                    </Badge>
                )}
            </div>

            {/* ── Pipeline Context ────────────────────────────────── */}
            <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                {/* Stage + Assigned Agent */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    {lead.stage && (
                        <span
                            style={{
                                backgroundColor: `${lead.stage.color}20`,
                                color: lead.stage.color,
                                borderColor: `${lead.stage.color}40`
                            }}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        >
                            {lead.stage.name}
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-[11px] text-slate-600 font-medium truncate">
                            {lead.assigned_to_user?.full_name?.split(' ')[0] || 'Unassigned'}
                        </span>
                    </div>
                </div>
                {/* Source + Created */}
                <p className="text-[11px] text-slate-400 capitalize leading-none">
                    {'Source: ' + lead.source || 'Manual'} · Added {relativeTime(lead.created_at)}
                </p>
            </div>

            {upcomingVisit && (
                <div className="mx-4 mb-3 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                        <MapPin className="w-3.5 h-3.5" />
                        Upcoming Site Visit
                    </div>
                    <p className="text-xs text-blue-600 font-medium">
                        {format(new Date(upcomingVisit.scheduled_at), 'EEE, d MMM • h:mm a')}
                    </p>
                    {upcomingVisit.assigned_agent && (
                        <p className="text-[11px] text-blue-500">
                            with {upcomingVisit.assigned_agent.full_name}
                        </p>
                    )}
                </div>
            )}

            {/* ── Call Status Flags ───────────────────────────────── */}
            <div className="px-4 space-y-2 mb-3">
                {/* Abuse — highest priority, block calling */}
                {lead.abuse_flag && (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-red-700">Do Not Call — Abusive</p>
                            {lead.abuse_details && (
                                <p className="text-[11px] text-red-500 mt-0.5 leading-snug">{lead.abuse_details}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Callback scheduled */}
                {lead.waiting_status === 'callback_scheduled' && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-amber-700">Callback Scheduled</p>
                            {lead.callback_time && (
                                <p className="text-[11px] text-amber-600">{formatCallbackTime(lead.callback_time)}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Transferred to human */}
                {lead.transferred_to_human && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                        <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        <p className="text-xs font-semibold text-blue-700">Transferred to Human Agent</p>
                    </div>
                )}

                {/* Rejection reason — shown when set and no abuse/transfer */}
                {lead.rejection_reason && !lead.abuse_flag && !lead.transferred_to_human && (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <PhoneCall className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Last Outcome</p>
                            <p className="text-xs text-slate-700 mt-0.5 capitalize">
                                {lead.rejection_reason.replace(/_/g, ' ')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Lead Intelligence ───────────────────────────────── */}
            {hasIntelligence && (
                <div className="mx-4 mb-4 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                    {/* Row 1: Score / Interest / Sentiment */}
                    {(lead.score > 0 || interest || sentiment) && (
                        <div className="flex items-center justify-around gap-1 px-2 py-2.5 border-b border-slate-100">
                            {lead.score > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ring-1 ${scoreColor(lead.score)}`}>
                                        {lead.score}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Score</span>
                                </div>
                            )}
                            {interest && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <IntelPill label={interest.label} cls={interest.cls} />
                                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Interest</span>
                                </div>
                            )}
                            {sentiment && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <IntelPill label={sentiment.label} cls={sentiment.cls} />
                                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Sentiment</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Row 2: Readiness / AI Budget / Total Calls */}
                    {(readiness || lead.budget_range || lead.total_calls > 0) && (
                        <div className="flex items-center justify-around gap-1 px-2 py-2.5 border-b border-slate-100">
                            {readiness && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <IntelPill label={readiness.label} cls={readiness.cls} />
                                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Readiness</span>
                                </div>
                            )}
                            {lead.budget_range && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 bg-violet-50 text-violet-700 ring-violet-200 whitespace-nowrap">
                                        {lead.budget_range}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">AI Budget</span>
                                </div>
                            )}
                            {lead.total_calls > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full ring-1 bg-slate-100 text-slate-600 ring-slate-200">
                                        {lead.total_calls}×
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Calls</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Last contacted */}
                    {lastCalled && (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2">
                            <PhoneCall className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] text-slate-500">Last called <span className="font-semibold text-slate-700">{lastCalled}</span></span>
                        </div>
                    )}
                </div>
            )}

            <div className="px-6 pb-6 flex flex-col flex-1 gap-6">
                {/* Contact Info */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Info</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm group">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="font-medium text-gray-900 truncate" title={lead.email}>{lead.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm group">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="font-medium text-gray-900 truncate">{lead.phone || 'N/A'}</p>
                            </div>
                        </div>
                        {lead.mobile && (
                            <div className="flex items-center gap-3 text-sm group">
                                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100 transition-colors">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500">Mobile</p>
                                    <p className="font-medium text-gray-900 truncate">{lead.mobile}</p>
                                </div>
                            </div>
                        )}
                        {lead.department && (
                            <div className="flex items-center gap-3 text-sm group">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                                    <Building className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500">Department</p>
                                    <p className="font-medium text-gray-900 truncate">{lead.department}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Location</h3>
                    <div className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 shrink-0">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 pt-1">
                            <p className="font-medium text-gray-900 leading-snug">
                                {[lead.mailing_city, lead.mailing_state, lead.mailing_country]
                                    .filter(Boolean).join(', ') || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {[lead.mailing_street, lead.mailing_zip].filter(Boolean).join(', ')}
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full rounded-lg border-dashed border-gray-300 hover:border-primary hover:text-primary transition-colors mt-auto"
                    onClick={onEditProfile}
                >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                </Button>
            </div>
        </div>
    )
}
