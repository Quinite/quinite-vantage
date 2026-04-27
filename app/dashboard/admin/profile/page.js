'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, EyeOff, CheckCircle2, User, Mail, Phone, Building2, Shield } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

export default function AdminProfilePage() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetch('/api/auth/user')
            .then(r => r.json())
            .then(data => { if (data.user?.profile) setProfile(data.user.profile) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        if (passwords.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
        if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return }
        try {
            setSubmitting(true)
            const res = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwords.newPassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update password')
            toast.success('Password updated successfully')
            setPasswords({ newPassword: '', confirmPassword: '' })
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const roleLabel = profile?.role?.replace(/_/g, ' ')
    const passwordsMatch = passwords.confirmPassword && passwords.newPassword === passwords.confirmPassword
    const passwordsMismatch = passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword

    const fields = [
        { label: 'Full Name',    value: profile?.full_name,               icon: User,      iconColor: 'text-blue-500',   iconBg: 'bg-blue-50' },
        { label: 'Email',        value: profile?.email,                   icon: Mail,      iconColor: 'text-violet-500', iconBg: 'bg-violet-50' },
        { label: 'Phone',        value: profile?.phone || '—',            icon: Phone,     iconColor: 'text-emerald-500',iconBg: 'bg-emerald-50' },
        { label: 'Organization', value: profile?.organization?.name || '—', icon: Building2, iconColor: 'text-orange-500', iconBg: 'bg-orange-50' },
        { label: 'Role',         value: roleLabel, capitalize: true,      icon: Shield,    iconColor: 'text-rose-500',   iconBg: 'bg-rose-50' },
    ]

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto space-y-4">
                <div className="h-[108px] rounded-xl border border-border overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50/40 flex items-center px-6 gap-5">
                    <Skeleton className="h-18 w-18 rounded-full shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-4 w-52" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton className="h-56 rounded-xl" />
                    <Skeleton className="h-56 rounded-xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto flex flex-col gap-4">

            {/* Hero — Identity Card */}
            <div className="relative rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
                {/* Background Banner */}
                <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] bg-white/20 blur-[80px] rotate-12" />
                        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[150%] bg-blue-400/30 blur-[60px] -rotate-12" />
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-6">
                        {/* Avatar Section */}
                        <div className="relative shrink-0 group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                            <Avatar className="h-24 w-24 rounded-2xl border-[4px] border-white shadow-xl relative z-10">
                                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold rounded-xl">
                                    {profile?.full_name?.[0] + profile?.full_name?.split(' ')[1][0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Name + Meta info */}
                        <div className="flex-1 min-w-0 pt-2">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold text-foreground tracking-tight leading-tight truncate">
                                    {profile?.full_name}
                                </h2>
                                {profile?.role && (
                                    <Badge className="capitalize text-[10px] h-5 px-2 font-bold bg-blue-600/10 text-blue-700 border-blue-200/50 hover:bg-blue-600/20 shadow-none tracking-wider">
                                        <Shield className="w-2.5 h-2.5 mr-1" />
                                        {roleLabel}
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                    {profile?.email}
                                </div>
                                {profile?.organization?.name && (
                                    <div className="flex items-center text-sm font-medium text-slate-600">
                                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                        {profile.organization.name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons could go here */}
                    </div>
                </div>
            </div>

            {/* Two-column body — fits in viewport */}
            <div className="grid md:grid-cols-2 gap-4">

                {/* Account information */}
                <div className="rounded-xl border border-border overflow-hidden bg-white">
                    <div className="px-5 py-3 border-b border-border bg-slate-50/80">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            Account Information
                        </p>
                    </div>
                    <div className="divide-y divide-border/50">
                        {fields.map(({ label, value, capitalize, icon: Icon, iconColor, iconBg }) => (
                            <div key={label} className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                                <div className={cn("shrink-0 h-8 w-8 rounded-lg flex items-center justify-center", iconBg)}>
                                    <Icon className={cn("w-4 h-4", iconColor)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-muted-foreground font-medium leading-none mb-0.5">{label}</p>
                                    <p className={cn(
                                        "text-sm text-foreground font-medium truncate",
                                        capitalize && "capitalize",
                                        value === '—' && "text-muted-foreground/40"
                                    )}>
                                        {value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security */}
                <div className="rounded-xl border border-border overflow-hidden bg-white">
                    <div className="px-5 py-3 border-b border-border bg-slate-50/80">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            Security
                        </p>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="p-5 flex flex-col gap-4">
                        {/* New password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="new-password" className="text-xs text-muted-foreground font-medium">
                                New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNew ? 'text' : 'password'}
                                    placeholder="Min. 6 characters"
                                    value={passwords.newPassword}
                                    onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                                    className="pr-9 h-9 text-sm"
                                    required
                                />
                                <button
                                    type="button" tabIndex={-1}
                                    onClick={() => setShowNew(v => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-password" className="text-xs text-muted-foreground font-medium">
                                Confirm Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirm-password"
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Repeat new password"
                                    value={passwords.confirmPassword}
                                    onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                                    className={cn(
                                        "pr-9 h-9 text-sm transition-colors",
                                        passwordsMismatch && "border-red-400 focus-visible:ring-red-300",
                                        passwordsMatch && "border-emerald-400 focus-visible:ring-emerald-300"
                                    )}
                                    required
                                />
                                <button
                                    type="button" tabIndex={-1}
                                    onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            {/* Inline feedback */}
                            <div className="h-4">
                                {passwordsMismatch && (
                                    <p className="text-xs text-red-500">Passwords do not match</p>
                                )}
                                {passwordsMatch && (
                                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            size="sm"
                            className="w-full mt-1"
                            disabled={submitting || !passwords.newPassword || !passwords.confirmPassword || !!passwordsMismatch}
                        >
                            {submitting ? 'Updating...' : 'Update Password'}
                        </Button>

                        <p className="text-[11px] text-muted-foreground/50 text-center -mt-1">
                            Use a strong, unique password you don't use elsewhere.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
