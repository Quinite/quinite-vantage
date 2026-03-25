'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'react-hot-toast'
import { X } from 'lucide-react'

export default function EditLeadProfileDialog({ open, onOpenChange, lead, profile, onSave }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        // Lead basic info
        email: '',
        phone: '',
        mobile: '',
        title: '',
        department: '',
        // Profile info
        company: '',
        job_title: '',
        mailing_street: '',
        mailing_city: '',
        mailing_state: '',
        mailing_zip: '',
        mailing_country: ''
    })

    useEffect(() => {
        if (lead && profile) {
            setFormData({
                email: lead.email || '',
                phone: lead.phone || '',
                mobile: lead.mobile || '',
                title: lead.title || '',
                department: lead.department || '',
                company: profile.company || '',
                job_title: profile.job_title || '',
                mailing_street: profile.mailing_street || '',
                mailing_city: profile.mailing_city || '',
                mailing_state: profile.mailing_state || '',
                mailing_zip: profile.mailing_zip || '',
                mailing_country: profile.mailing_country || ''
            })
        }
    }, [lead, profile, open])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!lead?.id) {
            toast.error("Cannot update: Invalid lead ID")
            return
        }

        setLoading(true)

        try {
            // Update Lead Basic Info
            const leadRes = await fetch(`/api/leads/${lead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    phone: formData.phone,
                    mobile: formData.mobile,
                    title: formData.title,
                    department: formData.department
                })
            })

            if (!leadRes.ok) {
                const errorData = await leadRes.json()
                console.error('Lead update failed:', errorData)
                throw new Error(errorData.error || 'Failed to update lead basic info')
            }

            // Update Profile Info
            const profileRes = await fetch(`/api/leads/${lead.id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company: formData.company,
                    job_title: formData.job_title, // redundant with title but storing both for now
                    mailing_street: formData.mailing_street,
                    mailing_city: formData.mailing_city,
                    mailing_state: formData.mailing_state,
                    mailing_zip: formData.mailing_zip,
                    mailing_country: formData.mailing_country
                })
            })

            if (!profileRes.ok) throw new Error('Failed to update address info')

            toast.success('Profile updated successfully')
            onSave() // Trigger refresh
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error('Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Profile Details</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="contact" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="contact">Contact</TabsTrigger>
                            <TabsTrigger value="address">Address</TabsTrigger>
                        </TabsList>

                        <TabsContent value="contact" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company">Company</Label>
                                    <Input id="company" name="company" value={formData.company} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <PhoneInput id="phone" name="phone" value={formData.phone} onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile">Mobile</Label>
                                    <PhoneInput id="mobile" name="mobile" value={formData.mobile} onChange={(value) => setFormData(prev => ({ ...prev, mobile: value }))} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Job Title</Label>
                                    <Input id="title" name="title" value={formData.title} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input id="department" name="department" value={formData.department} onChange={handleChange} />
                                </div>
                            </div>
                        </TabsContent>



                        <TabsContent value="address" className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="mailing_street">Street Address</Label>
                                <Input id="mailing_street" name="mailing_street" value={formData.mailing_street} onChange={handleChange} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_city">City</Label>
                                    <Input id="mailing_city" name="mailing_city" value={formData.mailing_city} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_state">State/Province</Label>
                                    <Input id="mailing_state" name="mailing_state" value={formData.mailing_state} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_zip">Zip/Postal Code</Label>
                                    <Input id="mailing_zip" name="mailing_zip" value={formData.mailing_zip} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mailing_country">Country</Label>
                                    <Input id="mailing_country" name="mailing_country" value={formData.mailing_country} onChange={handleChange} />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
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
