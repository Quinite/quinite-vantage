'use client';

import { useCampaignProgress, useCampaignPipelineMovement } from '@/hooks/useCampaigns';
import { isRunningButPausedForNight, getNowIST } from '@/lib/campaigns/timeWindow';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle, Moon, TrendingUp, TrendingDown, Minus, Info,
  Phone, ArrowRightLeft, Target, CalendarClock, CheckCircle2, Zap, BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';


import { Skeleton } from '@/components/ui/skeleton';

export function CampaignOverviewTab({ campaign }) {
  const { data: realProgress, isLoading: loadingProgress } = useCampaignProgress(campaign.id, campaign.status === 'running');
  const { data: realMovements, isLoading: loadingMovements } = useCampaignPipelineMovement(campaign.id);
  
  const isLoading = loadingProgress || loadingMovements;

  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-[180px] w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  );
  
  const progress = realProgress;
  const movements = realMovements || [];
  const displayStats = campaign;

  const pausedForNight = isRunningButPausedForNight(campaign);

  const { todayIST } = getNowIST();
  const endDatePassed = campaign.end_date && todayIST > campaign.end_date && campaign.status === 'running';

  const creditPct = campaign.credit_cap && campaign.credit_spent != null
    ? Math.min(100, Math.round(((campaign.credit_spent || 0) / campaign.credit_cap) * 100))
    : null;

  const answerRate = displayStats.total_calls > 0
    ? Math.round((displayStats.answered_calls / displayStats.total_calls) * 100) : null;

  const transferRate = displayStats.answered_calls > 0
    ? Math.round((displayStats.transferred_calls / displayStats.answered_calls) * 100) : null;

  const sentiment = displayStats.avg_sentiment_score != null ? Number(displayStats.avg_sentiment_score) : null;
  const sentimentLabel = sentiment == null ? null
    : sentiment > 0.3 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral';
  const sentimentColor = sentiment == null ? 'text-muted-foreground'
    : sentiment > 0.3 ? 'text-emerald-600' : sentiment < -0.1 ? 'text-red-500' : 'text-amber-500';

  const remainingLeads = progress ? (progress.enrolled_pending || 0) + (progress.queued || 0) : 0;
  const completionPct = progress?.total > 0
    ? Math.round(((progress.called || 0) + (progress.failed || 0) + (progress.skipped || 0) + (progress.opted_out || 0)) / progress.total * 100)
    : null;

  return (
    <div className="space-y-5">
      {/* Alert banners */}
      {pausedForNight && (
        <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800">
          <Moon className="w-4 h-4 shrink-0" />
          <span>Calling paused for the night · Resumes at <strong>{campaign.time_start}</strong> IST</span>
        </div>
      )}
      {endDatePassed && (
        <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Campaign end date has passed — calls continue until the queue empties or you complete it</span>
        </div>
      )}

      {/* Progress card — only when there's progress data */}
      {progress && progress.total > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Campaign Progress</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{progress.processed ?? 0} of {progress.total} leads processed</p>
              </div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{completionPct ?? 0}%</span>
            </div>
            {/* Multi-segment progress bar */}
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex gap-px">
              <div className="bg-emerald-500 h-full rounded-l-full transition-all duration-700"
                style={{ width: `${((progress.called || 0) / progress.total) * 100}%` }} />
              <div className="bg-amber-400 h-full transition-all duration-700"
                style={{ width: `${((progress.calling || 0) / progress.total) * 100}%` }} />
              <div className="bg-blue-400 h-full transition-all duration-700"
                style={{ width: `${((progress.queued || 0) / progress.total) * 100}%` }} />
              <div className="bg-red-400 h-full rounded-r-full transition-all duration-700"
                style={{ width: `${((progress.failed || 0) / progress.total) * 100}%` }} />
            </div>
            {/* Legend */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Called',  value: progress.called  ?? 0, dot: 'bg-emerald-500' },
                { label: 'Calling', value: progress.calling ?? 0, dot: 'bg-amber-400' },
                { label: 'Queued',  value: progress.queued  ?? 0, dot: 'bg-blue-400' },
                { label: 'Failed',  value: progress.failed  ?? 0, dot: 'bg-red-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
            {campaign.status === 'running' && remainingLeads > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-muted-foreground cursor-help hover:text-slate-900 transition-colors">
                        ~{Math.ceil(remainingLeads / 10)} hr{Math.ceil(remainingLeads / 10) !== 1 ? 's' : ''} remaining at current pace · {remainingLeads} leads in queue
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] p-3 text-[11px] leading-relaxed">
                      <p className="font-bold mb-1 uppercase tracking-wider text-[10px] text-slate-400">How is this calculated?</p>
                      <p>Estimation assumes a standard pace of <strong>10 leads per hour</strong>. The queue includes both new enrollments and pending retries (busy/no-answer).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Phone} label="Total Calls" value={displayStats.total_calls || 0}
          sub={displayStats.total_enrolled > 0 ? `of ${displayStats.total_enrolled} enrolled` : undefined}
          accent="text-blue-600" iconBg="bg-blue-50" />
        <StatCard icon={CheckCircle2} label="Answer Rate"
          value={answerRate != null ? `${answerRate}%` : (displayStats.answered_calls || 0)}
          sub={`${displayStats.answered_calls || 0} answered`}
          accent={answerRate >= 60 ? 'text-emerald-600' : answerRate >= 30 ? 'text-amber-500' : 'text-foreground'}
          iconBg="bg-emerald-50" />
        <StatCard icon={Zap} label="Transfer Rate"
          value={transferRate != null ? `${transferRate}%` : (displayStats.transferred_calls || 0)}
          sub={`${displayStats.transferred_calls || 0} escalated`}
          accent={transferRate >= 20 ? 'text-emerald-600' : 'text-foreground'}
          iconBg="bg-purple-50" />
        <StatCard icon={BarChart3} label="Avg Sentiment"
          value={sentiment != null ? sentiment.toFixed(2) : '—'}
          sub={sentimentLabel}
          accent={sentimentColor}
          iconBg="bg-amber-50"
          SentimentIcon={sentiment == null ? null : sentiment > 0.3 ? TrendingUp : sentiment < -0.1 ? TrendingDown : Minus}
        />
      </div>

      {/* Credit budget */}
      {creditPct !== null && (
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Credit Budget</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Number(campaign.credit_spent || 0).toFixed(1)} mins used of {Number(campaign.credit_cap).toFixed(1)} min cap
                </p>
              </div>
              <span className={cn('text-sm font-bold tabular-nums', creditPct >= 90 ? 'text-red-500' : creditPct >= 70 ? 'text-amber-500' : 'text-foreground')}>
                {creditPct}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', creditPct >= 90 ? 'bg-red-500' : creditPct >= 70 ? 'bg-amber-400' : 'bg-primary')}
                style={{ width: `${creditPct}%` }}
              />
            </div>
            {creditPct >= 80 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {(Number(campaign.credit_cap) - Number(campaign.credit_spent || 0)).toFixed(1)} mins remaining
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lead interest table */}
      {movements.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Lead Interest After Calls</h3>
              <span className="ml-auto text-xs text-muted-foreground">{movements.length} leads</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/50">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Lead</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Interest</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Sentiment</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {movements.slice(0, 15).map((m, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{m.leadName || m.leadId}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          m.interestLevel === 'high' ? 'bg-emerald-100 text-emerald-700' :
                          m.interestLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        )}>{m.interestLevel || '—'}</span>
                      </td>
                      <td className={cn('px-4 py-2.5 font-medium',
                        m.sentimentScore > 0.3 ? 'text-emerald-600' : m.sentimentScore < -0.1 ? 'text-red-500' : 'text-amber-500'
                      )}>
                        {m.sentimentScore != null ? m.sentimentScore.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.callDate?.slice(0, 10) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {movements.length === 0 && !progress && (
        <div className="py-16 text-center space-y-2">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
            <CalendarClock className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No call data yet</p>
          <p className="text-xs text-muted-foreground">Stats will appear once calls start</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = 'text-foreground', iconBg = 'bg-muted', SentimentIcon }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn('text-2xl font-bold leading-none', accent)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('p-2 rounded-lg shrink-0', iconBg)}>
            {SentimentIcon ? <SentimentIcon className={cn('w-4 h-4', accent)} /> : <Icon className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
