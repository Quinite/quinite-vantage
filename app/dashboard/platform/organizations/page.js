'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Input 
} from "@/components/ui/input"
import { 
  Building2, 
  Users, 
  MoreHorizontal, 
  UserCheck, 
  Ban, 
  CheckCircle, 
  Trash2, 
  Phone, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  Globe, 
  ArrowUpRight,
  ShieldAlert,
  Settings2,
  ExternalLink
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 group">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend.isPositive ? "text-emerald-600" : "text-rose-600")}>
              <TrendingUp className={cn("w-3 h-3", !trend.isPositive && "rotate-180")} />
              <span>{trend.value}%</span>
              <span className="text-slate-400 font-normal ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-2xl bg-slate-50 group-hover:scale-110 transition-transform duration-300", color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
    <div className={cn("h-1 w-full", color.replace('text-', 'bg-'))} />
  </Card>
)

export default function PlatformOrganizationsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editOrg, setEditOrg] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/platform/organizations')
      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    const toastId = toast.loading(`Processing ${action}...`)
    try {
      const response = await fetch(`/api/platform/organizations?id=${id}&action=${action}`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Action failed')

      toast.success(`${action} successful`, { id: toastId })
      fetchOrganizations()
    } catch (err) {
      toast.error(`Failed to ${action} organization`, { id: toastId })
    }
  }

  const handleImpersonate = async (orgId) => {
    const toastId = toast.loading('Starting impersonation...')
    try {
      const response = await fetch('/api/platform/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      })

      if (!response.ok) throw new Error('Impersonation failed')

      const data = await response.json()
      toast.success('Impersonation active! Redirecting...', { id: toastId })

      setTimeout(() => {
        window.location.href = data.redirectUrl || '/dashboard/admin'
      }, 1000)
    } catch (err) {
      toast.error('Impersonation failed', { id: toastId })
    }
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    if (!editOrg) return

    setIsUpdating(true)
    const toastId = toast.loading('Updating settings...')
    try {
      const callerId = e.target.callerId.value

      const response = await fetch(`/api/platform/organizations?id=${editOrg.id}&action=update_settings`, {
        method: 'POST',
        body: JSON.stringify({ caller_id: callerId })
      })

      if (!response.ok) throw new Error('Update failed')

      toast.success('Settings updated', { id: toastId })
      setEditOrg(null)
      fetchOrganizations()
    } catch (err) {
      toast.error('Failed to update settings', { id: toastId })
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [organizations, searchQuery])

  const stats = useMemo(() => {
    const total = organizations.length
    const active = organizations.filter(o => o.status === 'active').length
    const suspended = organizations.filter(o => o.status === 'suspended').length
    const totalUsers = organizations.reduce((acc, curr) => acc + (curr.userCount || 0), 0)

    return [
      { title: 'Total Organizations', value: total, icon: Building2, trend: { value: 12, isPositive: true }, color: 'text-purple-600 bg-purple-50' },
      { title: 'Active Units', value: active, icon: CheckCircle, trend: { value: 8, isPositive: true }, color: 'text-emerald-600 bg-emerald-50' },
      { title: 'Suspended', value: suspended, icon: ShieldAlert, trend: { value: 2, isPositive: false }, color: 'text-rose-600 bg-rose-50' },
      { title: 'Total Users', value: totalUsers, icon: Users, trend: { value: 24, isPositive: true }, color: 'text-blue-600 bg-blue-50' },
    ]
  }, [organizations])

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-colors gap-1.5 px-2.5 py-0.5 rounded-full font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </Badge>
        )
      case 'suspended':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100 transition-colors gap-1.5 px-2.5 py-0.5 rounded-full font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspended
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 transition-colors gap-1.5 px-2.5 py-0.5 rounded-full font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline" className="rounded-full">Unknown</Badge>
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organizations</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <Globe className="w-4 h-4 text-slate-400" />
            Global Platform Control & Tenant Management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 shadow-sm border-slate-200">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200 border-none">
            <Users className="w-4 h-4" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : (
          stats.map((stat, i) => <StatCard key={i} {...stat} />)
        )}
      </div>

      {/* Main Content Table */}
      <Card className="border-slate-200/60 shadow-sm overflow-hidden rounded-2xl bg-white">
        <CardHeader className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-none">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
              <Input 
                placeholder="Search by name, slug, or ID..." 
                className="pl-10 h-10 border-slate-200 focus:ring-purple-500 focus:border-purple-500 transition-all rounded-xl bg-slate-50/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 h-10 w-10">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm font-medium text-slate-500">
            Showing <span className="text-slate-900">{filteredOrgs.length}</span> results
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/30">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No organizations found</h3>
              <p className="text-slate-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="w-[300px] font-bold text-slate-700 uppercase tracking-wider text-[11px] px-6 py-4">Organization</TableHead>
                    <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] px-6 py-4">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] px-6 py-4">Caller ID</TableHead>
                    <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] px-6 py-4 text-center">Users</TableHead>
                    <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] px-6 py-4">Established</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] px-6 py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id} className="group border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-bold text-xs">
                              {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{org.name}</span>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              {org.slug || 'no-slug'} 
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(org.status)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {org.caller_id ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/50 w-fit text-sm font-medium text-slate-700 border border-slate-200/50">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {org.caller_id}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">No Assignment</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                            {org.userCount || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">
                            {new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            {new Date(org.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            onClick={() => router.push(`/dashboard/platform/organizations/${org.id}`)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 rounded-lg">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-slate-200">
                              <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1.5">Management</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setEditOrg(org)} className="rounded-lg gap-2 py-2">
                                <Phone className="h-4 w-4 text-slate-500" />
                                <span>Assign Number</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleImpersonate(org.id)} className="rounded-lg gap-2 py-2 text-purple-600 focus:text-purple-700 focus:bg-purple-50">
                                <UserCheck className="h-4 w-4" />
                                <span>Impersonate Admin</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-2" />
                              <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1.5">Status & Access</DropdownMenuLabel>
                              {org.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => handleAction(org.id, 'activate')} className="rounded-lg gap-2 py-2 text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Activate Account</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleAction(org.id, 'suspend')} className="rounded-lg gap-2 py-2 text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                  <Ban className="h-4 w-4" />
                                  <span>Suspend Access</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="my-2" />
                              <DropdownMenuItem
                                className="rounded-lg gap-2 py-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this organization? This cannot be undone.')) {
                                    handleAction(org.id, 'delete')
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete Organization</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Settings Dialog */}
      <Dialog open={!!editOrg} onOpenChange={(open) => !open && setEditOrg(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Configure Organization</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Update Plivo caller ID for <span className="text-slate-900 font-bold">{editOrg?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSettings}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Assigned Caller ID</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                  <Input
                    name="callerId"
                    defaultValue={editOrg?.caller_id || ''}
                    placeholder="+91 00000 00000"
                    className="pl-10 h-11 rounded-xl border-slate-200 focus:ring-purple-500 bg-slate-50/50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Verified Plivo number used for outbound AI calling system.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setEditOrg(null)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}