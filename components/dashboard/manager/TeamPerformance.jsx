'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDefaultAvatar } from '@/lib/avatar-utils'
import { Users, TrendingUp, Phone, Award } from 'lucide-react'

export function TeamPerformance({ members = [], topPerformers = [] }) {
    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'
    }

    const getStatusColor = (isOnline) => {
        return isOnline ? 'bg-green-500' : 'bg-gray-300'
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Members List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Team Members ({members.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No team members found</p>
                            </div>
                        ) : (
                            members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src={member.avatar || getDefaultAvatar(member.name)} alt={member.name} />
                                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                            </Avatar>
                                            <div
                                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.isOnline)}`}
                                            />
                                        </div>
                                        <div>
                                            <div className="font-medium">{member.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {member.role}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium">
                                            {member.leadsAssigned} leads
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {member.callsMade} calls
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Top Performers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {topPerformers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No performance data yet</p>
                            </div>
                        ) : (
                            topPerformers.map((performer, index) => (
                                <div
                                    key={performer.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-yellow-50 to-transparent"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src={performer.avatar || getDefaultAvatar(performer.name)} alt={performer.name} />
                                                <AvatarFallback>{getInitials(performer.name)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div>
                                            <div className="font-medium">{performer.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {performer.callsMade} calls
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                                            <TrendingUp className="w-4 h-4" />
                                            {performer.conversionRate}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {performer.conversions} conversions
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
