'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Button 
} from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Badge 
} from '@/components/ui/badge'
import { 
  Separator 
} from '@/components/ui/separator'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { 
  Building2, 
  Users, 
  Mail, 
  Shield, 
  ArrowLeft, 
  UserCircle, 
  AlertCircle, 
  CreditCard, 
  Calendar, 
  MapPin, 
  Hash, 
  Activity, 
  Zap, 
  History, 
  Settings,
  MoreVertical,
  LogOut,
  ExternalLink,
  PhoneCall,
  Globe,
  ArrowUpRight,
  Ban
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'react-hot-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const InfoRow = ({ label, value, icon: Icon, copyable }) => (
  <div className="flex items-center justify-between py-3 group">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={cn("text-sm font-bold text-slate-900", copyable && "font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 cursor-pointer hover:bg-slate-100")}>
        {value || 'N/A'}
      </span>
      {copyable && <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ArrowLeft className="w-3 h-3 rotate-180 text-slate-400" /></div>}
    </div>
  </div>
)

const DetailStat = ({ label, value, subValue, icon: Icon, color }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={cn("p-3 rounded-xl", color)}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <h4 className="text-xl font-bold text-slate-900">{value}</h4>
      {subValue && <p className="text-xs text-slate-500 font-medium">{subValue}</p>}
    </div>
  </div>
)

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchOrganization()
    }
  }, [params.id])

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/platform/organizations/${params.id}`)
      const data = await response.json()
      setOrganization(data.organization)
    } catch (error) {
      console.error('Error fetching organization:', error)
      toast.error('Failed to load organization details')
    } finally {
      setLoading(false)
    }
  }

  const handleImpersonate = async (userId) => {
    setImpersonating(true)
    const toastId = toast.loading('Starting impersonation...')
    try {
      const response = await fetch('/api/platform/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          organizationId: params.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Impersonation active!', { id: toastId })
        window.location.href = '/dashboard/admin'
      } else {
        toast.error(data.error || 'Impersonation failed', { id: toastId })
      }
    } catch (error) {
      console.error('Impersonation error:', error)
      toast.error('Impersonation failed', { id: toastId })
    } finally {
      setImpersonating(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1 rounded-full font-bold">Active</Badge>
      case 'completed':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 rounded-full font-bold">Onboarding Done</Badge>
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-100 px-3 py-1 rounded-full font-bold">Pending</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse max-w-[1400px] mx-auto">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <div className="h-10 w-96 bg-slate-200 rounded-lg" />
            <div className="h-4 w-64 bg-slate-200 rounded-lg" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <Alert variant="destructive" className="rounded-2xl border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="font-bold ml-2">Organization not found or access denied.</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4 font-bold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return back
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-20">
      {/* Header Area */}
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/platform/organizations')}
          className="w-fit font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl px-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Directory
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-purple-200 ring-4 ring-white">
              {organization.name.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{organization.name}</h1>
                {getStatusBadge(organization.status || organization.onboarding_status)}
              </div>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                ID: <span className="font-mono text-xs">{organization.id}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl font-bold gap-2 border-slate-200">
              <LogOut className="w-4 h-4 text-slate-500" />
              Sign Out All
            </Button>
            <Button className="rounded-xl font-bold gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg border-none">
              <Settings className="w-4 h-4" />
              Manage Config
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DetailStat 
          label="Credits Balance" 
          value={`₹${organization.credits?.balance || 0}`} 
          subValue="Consumption: ₹0.00"
          icon={Zap} 
          color="bg-amber-50 text-amber-600" 
        />
        <DetailStat 
          label="Total Users" 
          value={organization.users?.length || 0} 
          subValue="5 active sessions"
          icon={Users} 
          color="bg-blue-50 text-blue-600" 
        />
        <DetailStat 
          label="Current Plan" 
          value={organization.subscription?.plan?.name || 'Free Tier'} 
          subValue={organization.subscription?.status === 'active' ? 'Renews 12 May' : 'No active sub'}
          icon={CreditCard} 
          color="bg-purple-50 text-purple-600" 
        />
        <DetailStat 
          label="Total Calls" 
          value="1,284" 
          subValue="84% success rate"
          icon={PhoneCall} 
          color="bg-emerald-50 text-emerald-600" 
        />
      </div>

      {/* Main Tabs Area */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit">
          <TabsTrigger value="overview" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Team Members</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Usage & Billing</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl font-bold px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Business Information
                </CardTitle>
                <CardDescription className="font-medium text-slate-400">Core identification and metadata</CardDescription>
              </CardHeader>
              <CardContent className="p-6 divide-y divide-slate-50">
                <InfoRow label="Legal Entity" value={organization.company_name || organization.name} icon={Shield} />
                <InfoRow label="Organization Slug" value={organization.slug} icon={Globe} copyable />
                <InfoRow label="Sector / Industry" value={organization.sector?.replace('_', ' ') || 'Real Estate'} icon={Activity} />
                <InfoRow label="GSTIN / Tax ID" value={organization.gstin} icon={Hash} />
                <InfoRow label="Created On" value={new Date(organization.created_at).toLocaleDateString()} icon={Calendar} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Contact & Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 divide-y divide-slate-50">
                <InfoRow label="Headquarters" value={organization.city ? `${organization.city}, ${organization.state}` : 'Not set'} icon={MapPin} />
                <InfoRow label="Full Address" value={organization.address_line_1} />
                <InfoRow label="Contact Phone" value={organization.contact_number} icon={Mail} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white rounded-xl py-6 font-bold transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  Upgrade Plan
                </Button>
                <Button className="w-full justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white rounded-xl py-6 font-bold transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  Assign Caller ID
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-3 rounded-xl py-6 font-bold shadow-xl shadow-rose-900/20"
                >
                  <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                  Suspend Org
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">System Integrity</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Database Sync</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Auth State</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Verified
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Organization Roster</CardTitle>
                <CardDescription className="font-medium">Active team members and roles</CardDescription>
              </div>
              <Button className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg border-none">
                Add Member
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!organization.users || organization.users.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold">No users detected</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="font-bold text-slate-700 px-6 py-4">User</TableHead>
                      <TableHead className="font-bold text-slate-700 px-6 py-4">Status</TableHead>
                      <TableHead className="font-bold text-slate-700 px-6 py-4">Role</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 px-6 py-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organization.users.map(user => (
                      <TableRow key={user.id} className="hover:bg-slate-50/50 border-slate-50 group">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-slate-100">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-[10px]">
                                {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{user.full_name || 'Incognito User'}</span>
                              <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-full font-bold">Online</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 rounded-full font-bold uppercase text-[10px] tracking-wider">
                            {user.role || 'Member'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl font-bold text-xs gap-2 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-100 transition-all shadow-sm"
                              onClick={() => handleImpersonate(user.id)}
                              disabled={impersonating}
                            >
                              <Shield className="w-3 h-3" />
                              {impersonating ? 'Logging in...' : 'Impersonate'}
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-xl text-slate-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden border-l-4 border-l-purple-500">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-extrabold tracking-tight">Active Subscription</CardTitle>
                <CardDescription className="font-medium">Plan details and next billing cycle</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{organization.subscription?.plan?.name || 'Free Tier'}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active since Feb 2024</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Status</span>
                    <Badge className="bg-emerald-500 text-white border-none rounded-full px-4">Paid</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Next Invoice</span>
                    <span className="text-slate-900 font-bold font-mono">₹14,500.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden border-l-4 border-l-amber-500">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-extrabold tracking-tight">Call Credits</CardTitle>
                <CardDescription className="font-medium">Wallet balance and top-up options</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">₹{organization.credits?.balance || 0}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reserved: ₹450.00</p>
                  </div>
                </div>
                <Button className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-900/10 border-none">
                  Manual Top-up
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
           <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Platform Activity</CardTitle>
                <CardDescription className="font-medium">Audit logs and system events for this tenant</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-2">
                <History className="w-4 h-4" /> Full Log
              </Button>
            </CardHeader>
            <CardContent className="p-0">
               <div className="text-center py-20">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-slate-500 font-bold italic">No recent activity logged</p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}