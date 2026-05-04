'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCampaignCallLogs, useCampaignAnalytics } from '@/hooks/useCampaigns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Phone, CheckCircle2, Zap, BarChart3, TrendingUp, TrendingDown, 
  Minus, ChevronDown, ChevronUp, Clock, User, MessageSquareText, Calendar, CalendarClock 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDefaultAvatar } from '@/lib/avatar-utils';

function LeadAvatar({ name, url, className = "w-10 h-10" }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const fallback = getDefaultAvatar(name);

  return (
    <div className={cn("rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0", className)}>
      {(url || fallback) && !imgError ? (
        <img
          src={url || fallback}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold text-slate-500">{initials}</span>
      )}
    </div>
  );
}

const OUTCOME_COLORS = { answered: '#22c55e', no_answer: '#f59e0b', failed: '#ef4444' };


import { Card, CardContent } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';

export function CampaignCallLogsTab({ campaignId }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const { data, isLoading } = useCampaignCallLogs(campaignId, { page, limit: 20 });
  const logs = data?.logs || [];

  if (isLoading) return (
    <div className="space-y-3 mt-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );

  if (logs.length === 0) return (
    <div className="mt-8 flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 mb-4">
        <Phone className="w-6 h-6 text-slate-300" />
      </div>
      <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">No Call Logs Yet</p>
      <p className="text-xs text-slate-500 font-medium mt-1 max-w-[240px]">Once the campaign starts and calls are made, results will appear here in real-time.</p>
    </div>
  );

  return (
    <div className="space-y-3 mt-2">
      {logs.map(log => {
        const score = log.sentiment_score != null ? Number(log.sentiment_score) : null;
        
        return (
          <div key={log.id} className={cn(
            "border rounded-xl overflow-hidden bg-white shadow-sm transition-all",
            expandedId === log.id ? "border-slate-300 ring-4 ring-slate-100" : "border-slate-200"
          )}>
            <button
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 text-left transition-colors"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <LeadAvatar name={log.lead?.name} url={log.lead?.avatar_url} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900">{log.lead?.name || log.callee_number || 'Unknown Lead'}</span>
                  
                  {log.lead?.interest_level && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-black uppercase tracking-wider bg-violet-50 text-violet-700 border-violet-200 h-5">
                      {log.lead.interest_level}
                    </Badge>
                  )}

                  {log.lead?.waiting_status === 'callback' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-black uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-200 h-5 gap-1">
                      <CalendarClock className="w-2.5 h-2.5" /> Callback
                    </Badge>
                  )}

                  <Badge variant="outline" className={cn(
                    "text-[10px] px-2 py-0 font-bold uppercase tracking-wider h-5",
                    ['called', 'completed'].includes(log.call_status) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    log.call_status === 'no_answer' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                  )}>
                    {log.call_status?.replace('_', ' ')}
                    {log.call_status !== 'completed' && log.disconnect_reason && (
                      <span className="ml-1 opacity-70 font-medium normal-case">
                        ({log.disconnect_reason.replace(/[-_]/g, ' ')})
                      </span>
                    )}
                  </Badge>
                  
                  {log.transferred && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-100 px-2 py-0 font-bold uppercase tracking-wider h-5">
                      Transferred
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  {score != null && (
                    <div className={cn(
                      "flex items-center gap-1 text-[11px] font-bold uppercase ml-auto",
                      score > 0.3 ? "text-emerald-600" : score < -0.1 ? "text-red-500" : "text-amber-500"
                    )}>
                      {score > 0.3 ? <TrendingUp className="w-3.5 h-3.5" /> : score < -0.1 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      <span>{score.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {expandedId === log.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </button>

            {expandedId === log.id && (
              <div className="px-4 pb-5 pt-0 space-y-4 bg-slate-50/50">
                <div className="h-px bg-slate-200 -mx-4 mb-4" />
                
                {log.summary && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">AI Call Summary</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{log.summary}</p>
                  </div>
                )}
                
                {log.conversation_transcript && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquareText className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Full Conversation</p>
                    </div>
                    <div className="text-xs text-slate-600 space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {log.conversation_transcript.split('\n').map((line, idx) => {
                        const isAI = line.startsWith('AI:');
                        const isLead = line.startsWith('Lead:');
                        return (
                          <div key={idx} className={cn(
                            "p-2.5 rounded-lg",
                            isAI ? "bg-blue-50/50 border border-blue-100 ml-4" : isLead ? "bg-slate-50 border border-slate-100 mr-4" : "bg-slate-100"
                          )}>
                            <span className="font-bold text-[10px] uppercase block mb-0.5 opacity-50">
                              {isAI ? 'Assistant' : isLead ? 'Lead' : 'System'}
                            </span>
                            {line.replace(/^(AI|Lead): /, '')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-between items-center pt-4">
        <button className="text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 uppercase tracking-widest" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {page}</span>
        <button className="text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 uppercase tracking-widest" disabled={logs.length < 20} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}

export function CampaignAnalyticsTab({ campaignId }) {
  const { data, isLoading } = useCampaignAnalytics(campaignId);

  if (isLoading) return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );

  const { dailyData = [], interestCounts = {}, outcomeCounts = {}, totalLogs = 0 } = data || {};
  const outcomeData = Object.entries(outcomeCounts).map(([name, value]) => ({ name, value }));
  const interestData = Object.entries(interestCounts).map(([name, value]) => ({ name, value }));

  const answerRate = totalLogs > 0 ? Math.round((outcomeCounts.answered || 0) / totalLogs * 100) : 0;
  const totalEscalations = Object.values(dailyData).reduce((acc, d) => acc + (d.transferRate || 0), 0);
  const avgSentiment = Object.values(dailyData).reduce((acc, d) => acc + (d.avgSentiment || 0), 0) / dailyData.length;
  
  const sentimentLabel = avgSentiment > 0.3 ? 'Positive' : avgSentiment < -0.1 ? 'Negative' : 'Neutral';
  const sentimentColor = avgSentiment > 0.3 ? 'text-emerald-600' : avgSentiment < -0.1 ? 'text-red-500' : 'text-amber-500';
  const SentimentIcon = avgSentiment > 0.3 ? TrendingUp : avgSentiment < -0.1 ? TrendingDown : Minus;

  return (
    <div className="space-y-4 mt-2">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Phone} label="Total Calls" value={totalLogs}
          sub="Since start"
          accent="text-blue-600" iconBg="bg-blue-50" />
        <StatCard icon={CheckCircle2} label="Answer Rate"
          value={`${answerRate}%`}
          sub={`${outcomeCounts.answered} answered`}
          accent={answerRate >= 60 ? 'text-emerald-600' : answerRate >= 30 ? 'text-amber-500' : 'text-foreground'}
          iconBg="bg-emerald-50" />
        <StatCard icon={Zap} label="Escalations"
          value={totalEscalations}
          sub="Transferred to human"
          accent={totalEscalations > 0 ? 'text-purple-600' : 'text-foreground'}
          iconBg="bg-purple-50" />
        <StatCard icon={BarChart3} label="Avg Sentiment"
          value={avgSentiment.toFixed(2)}
          sub={sentimentLabel}
          accent={sentimentColor}
          iconBg="bg-amber-50"
          SentimentIcon={SentimentIcon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSection title="Call Activity (Daily Trends)">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="Sentiment Progress">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData.filter(d => d.avgSentiment != null)}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="avgSentiment" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="Final Outcomes">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={outcomeData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" cy="50%" 
                  innerRadius={60} 
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {outcomeData.map((entry) => <Cell key={entry.name} fill={OUTCOME_COLORS[entry.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="Interest Distribution">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interestData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="Escalation Rate (%)">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="transferRate" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>

        <ChartSection title="Avg Call Duration (Seconds)">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="avgDuration" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>
      </div>
    </div>
  );
}


function StatCard({ icon: Icon, label, value, sub, accent = 'text-foreground', iconBg = 'bg-muted', SentimentIcon }) {
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={cn('text-2xl font-black leading-none tabular-nums', accent)}>{value}</p>
            {sub && <p className="text-[10px] font-bold text-slate-500 mt-1">{sub}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
            {SentimentIcon ? <SentimentIcon className={cn('w-4 h-4', accent)} /> : <Icon className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function ChartSection({ title, children }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardContent className="p-6 flex flex-col">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{title}</h4>
        {children}
      </CardContent>
    </Card>
  );
}
