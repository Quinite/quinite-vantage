'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'

// ─── Phone normalizer ─────────────────────────────────────────────────────────
// Rules:
//  • Already has + prefix → keep as-is (international format)
//  • 10 digits only (Indian mobile) → prepend +91
//  • 11 digits starting with 0 (Indian STD) → replace leading 0 with +91
//  • Anything else → keep cleaned digits, no prefix
function normalizePhone(raw) {
    const digits = raw.replace(/[^\d+]/g, '') // strip everything except digits and +
    const stripped = digits.replace(/^\+/, '')

    // Already international (has + prefix with country code)
    if (digits.startsWith('+')) return digits

    // 10-digit Indian mobile
    if (/^[6-9]\d{9}$/.test(stripped)) return `+91${stripped}`

    // 11-digit with leading 0 (STD)
    if (/^0[6-9]\d{9}$/.test(stripped)) return `+91${stripped.slice(1)}`

    // Anything else: return cleaned
    return stripped
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactSection({ content = {}, organizationId }) {
    const {
        heading = 'Get in Touch',
        subheading = "We'd love to hear from you. Fill out the form and we'll be in touch shortly.",
        phone = '',
        email = '',
        address = '',
        officeHours = 'Mon – Sat: 9:00 AM – 6:00 PM',
        bgColor = '#ffffff',
        textColor = '#111827',
        paddingTop = 80,
        paddingBottom = 80,
    } = content

    const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' })
    const [errors, setErrors] = useState({})
    const [status, setStatus] = useState('idle') // idle | loading | success | error
    const [errMsg, setErrMsg] = useState('')

    const contactItems = [
        { Icon: Phone, label: 'Phone', value: phone, href: phone ? `tel:${phone}` : null },
        { Icon: Mail, label: 'Email', value: email, href: email ? `mailto:${email}` : null },
        { Icon: MapPin, label: 'Address', value: address, href: null },
        { Icon: Clock, label: 'Office Hours', value: officeHours, href: null },
    ].filter(c => c.value)

    const validate = () => {
        const e = {}
        if (!form.name.trim()) e.name = 'Full name is required'
        if (!form.mobile.trim()) e.mobile = 'Mobile number is required'
        else {
            const cleaned = form.mobile.replace(/[^\d+\s\-()]/g, '')
            if (cleaned.replace(/\D/g, '').length < 7) e.mobile = 'Please enter a valid phone number'
        }
        return e
    }

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }))
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const v = validate()
        if (Object.keys(v).length) { setErrors(v); return }

        setStatus('loading')
        setErrMsg('')

        try {
            const payload = {
                name: form.name.trim(),
                mobile: normalizePhone(form.mobile),
                email: form.email.trim() || null,
                message: form.message.trim() || null,
                organization_id: organizationId || null,
            }

            const res = await fetch('/api/leads/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Submission failed')

            setStatus('success')
            setForm({ name: '', mobile: '', email: '', message: '' })
        } catch (err) {
            setStatus('error')
            setErrMsg(err.message)
        }
    }

    const inputClass = (field) =>
        `w-full h-11 px-3.5 rounded-xl text-sm bg-white border ${errors[field] ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-blue-400'
        } text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors`

    return (
        <section style={{ backgroundColor: bgColor, paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Section header */}
                <div className="text-center mb-12">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4">
                        Contact Us
                    </span>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold" style={{ color: textColor }}>
                        {heading}
                    </h2>
                    {subheading && (
                        <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">{subheading}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

                    {/* Left: contact info */}
                    <div className="space-y-5">
                        <h3 className="text-base font-bold text-slate-700 mb-6">Contact Information</h3>
                        {contactItems.length > 0 ? contactItems.map(({ Icon, label, value, href }, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                                    {href ? (
                                        <a href={href} className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">{value}</a>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-700 whitespace-pre-line">{value}</p>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                <p className="text-slate-400 text-sm">Add your contact details in the editor</p>
                            </div>
                        )}
                    </div>

                    {/* Right: live contact form */}
                    <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100">
                        {status === 'success' ? (
                            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center gap-4 py-8">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Message Received!</h3>
                                <p className="text-sm text-slate-500 max-w-xs">
                                    Thanks for reaching out. Our team will contact you shortly.
                                </p>
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="mt-2 text-xs text-blue-600 hover:underline"
                                >
                                    Submit another inquiry
                                </button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-base font-bold text-slate-700 mb-5">Send Us a Message</h3>
                                <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Rahul Sharma"
                                            value={form.name}
                                            onChange={handleChange('name')}
                                            className={inputClass('name')}
                                        />
                                        {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                                    </div>

                                    {/* Mobile */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600">
                                            Mobile Number <span className="text-red-500">*</span>
                                        </label>
                                        <PhoneInput
                                            placeholder="9XXXXXXXXX or +44 XXXX XXXXXX"
                                            value={form.mobile}
                                            onChange={(value) => {
                                                setForm(prev => ({ ...prev, mobile: value }))
                                                if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }))
                                            }}
                                            className={inputClass('mobile')}
                                        />
                                        {errors.mobile
                                            ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.mobile}</p>
                                            : <p className="text-[10px] text-slate-400">Indian 10-digit numbers will auto-get +91 prefix</p>
                                        }
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600">Email <span className="text-slate-400">(optional)</span></label>
                                        <input
                                            type="email"
                                            placeholder="you@email.com"
                                            value={form.email}
                                            onChange={handleChange('email')}
                                            className={inputClass('email')}
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600">Message <span className="text-slate-400">(optional)</span></label>
                                        <textarea
                                            placeholder="Tell us about your requirements…"
                                            rows={3}
                                            value={form.message}
                                            onChange={handleChange('message')}
                                            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Error banner */}
                                    {status === 'error' && (
                                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <span>{errMsg || 'Something went wrong. Please try again.'}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {status === 'loading'
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                                            : 'Send Message'
                                        }
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
