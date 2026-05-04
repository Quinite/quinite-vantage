'use client';

import { useRouter } from 'next/navigation';
import { Building2, Calendar, Clock, X, CheckCircle, Pencil, Trash2, Archive, Phone, ArrowRightLeft, TrendingUp, TrendingDown, Minus, Users, Play, Pause, RotateCcw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { isReadyToStart, isRunningButPausedForNight, getStartBlockReason } from '@/lib/campaigns/timeWindow';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Lock, Moon } from 'lucide-react';

const STATUS_ACCENT = {
  running:   { border: 'border-t-emerald-500', bg: 'bg-emerald-50/50' },
  paused:    { border: 'border-t-amber-400',   bg: 'bg-amber-50/40' },
  scheduled: { border: 'border-t-blue-400',    bg: 'bg-blue-50/30' },
  completed: { border: 'border-t-indigo-400',  bg: 'bg-indigo-50/40' },
  failed:    { border: 'border-t-red-500',     bg: 'bg-red-50/30' },
  cancelled: { border: 'border-t-gray-400',    bg: 'bg-gray-50/50' },
  archived:  { border: 'border-t-gray-300',    bg: 'bg-gray-50/30' },
};

export function CampaignCard({ campaign, permissions, orgCredits, subscriptionStatus, mutations, loadingStates }) {
  const router = useRouter();
  const { canRun, canEdit, canDelete } = permissions;
  const readyToStart = isReadyToStart(campaign);
  const pausedForNight = isRunningButPausedForNight(campaign);
  const isTerminal = ['completed', 'cancelled', 'failed', 'archived'].includes(campaign.status);
  const isActive = ['running', 'paused'].includes(campaign.status);
  const hasCallHistory = (campaign.total_calls || 0) > 0;
  const accent = STATUS_ACCENT[campaign.status] || { border: 'border-t-gray-200', bg: '' };
  const isArchivable = ['completed', 'cancelled', 'failed'].includes(campaign.status);
  const isLoading = loadingStates.starting || loadingStates.pausing || loadingStates.resuming || loadingStates.archiving;

  const creditPct = campaign.credit_cap && campaign.credit_spent != null
    ? Math.min(100, Math.round(((campaign.credit_spent || 0) / campaign.credit_cap) * 100))
    : null;

  const sentiment = campaign.avg_sentiment_score;
  const sentimentIcon = sentiment == null ? <Minus className="w-3 h-3" />
    : sentiment > 0.3 ? <TrendingUp className="w-3 h-3" />
    : sentiment < -0.1 ? <TrendingDown className="w-3 h-3" />
    : <Minus className="w-3 h-3" />;
  const sentimentColor = sentiment == null ? 'text-gray-400'
    : sentiment > 0.3 ? 'text-emerald-600' : sentiment < -0.1 ? 'text-red-500' : 'text-amber-500';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 border-t-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer',
        accent.border
      )}
      onClick={() => router.push(`/dashboard/admin/crm/campaigns/${campaign.id}`)}
    >
      {/* Header band */}
      <div className={cn('px-4 pt-4 pb-3 rounded-t-lg', accent.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-snug truncate">{campaign.name}</h3>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <CampaignStatusBadge status={campaign.status} isReadyToStart={readyToStart} isPausedForNight={pausedForNight} />
              {campaign.total_enrolled > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                  <Users className="w-3 h-3" />{campaign.total_enrolled}
                </span>
              )}
            </div>
          </div>

          {/* Top-right icon tray — stop propagation */}
          <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            {/* Archive icon — shown on completed/cancelled/failed, always visible */}
            {isArchivable && canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    title="Archive"
                    disabled={loadingStates.archiving}
                  >
                    {loadingStates.archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the campaign from your active list and move it to archives. All call logs and data will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-gray-900 hover:bg-gray-800"
                      onClick={() => mutations.archive?.(campaign.id)}
                    >
                      Archive Campaign
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {/* Edit — always visible */}
            {canEdit && !isTerminal && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                onClick={() => mutations.edit?.(campaign.id)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {/* Delete — always visible for scheduled with no calls */}
            {canDelete && campaign.status === 'scheduled' && !hasCallHistory && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                onClick={() => mutations.delete(campaign.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 flex-1">
        {/* Projects & Description Section */}
        <div className="mt-3 space-y-2.5">
          {campaign.projects?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {campaign.projects.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-bold">
                  <Building2 className="w-2.5 h-2.5" />
                  {p.name}
                </span>
              ))}
            </div>
          )}
          
          {campaign.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {campaign.description}
            </p>
          )}
        </div>

        {/* Schedule & Info Section */}
        {(campaign.start_date || campaign.end_date || campaign.time_start || campaign.time_end) && (
          <div className="border-t border-slate-100 mt-4 pt-4 space-y-2.5">
            {(campaign.start_date || campaign.end_date) && (
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                  <Calendar className="w-3 h-3" />
                  <span>Dates</span>
                </div>
                <span className="text-slate-900 font-bold tabular-nums">
                  {campaign.start_date || '—'} → {campaign.end_date || '∞'}
                </span>
              </div>
            )}
            {(campaign.time_start || campaign.time_end) && (
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  <span>Window</span>
                </div>
                <span className={cn(
                  'font-bold tabular-nums text-right',
                  pausedForNight ? 'text-amber-700' : 'text-slate-900'
                )}>
                  {campaign.time_start} – {campaign.time_end}
                  {pausedForNight && <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-black tracking-tighter">PAUSED</span>}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Credit cap bar */}
        {creditPct !== null && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                <CreditCard className="w-3 h-3" />
                <span>Budget</span>
              </div>
              <span className={cn('font-bold tabular-nums',
                creditPct >= 90 ? 'text-red-600' : creditPct >= 70 ? 'text-amber-600' : 'text-slate-900'
              )}>
                {Number(campaign.credit_spent || 0).toFixed(1)} / {Number(campaign.credit_cap).toFixed(1)} mins
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500',
                  creditPct >= 90 ? 'bg-red-500' : creditPct >= 70 ? 'bg-amber-400' : 'bg-indigo-500'
                )}
                style={{ width: `${creditPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        {hasCallHistory && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
            <MiniStat icon={<Phone className="w-3 h-3" />} value={campaign.total_calls} label="Calls" color="text-blue-600 bg-blue-50/70" />
            <MiniStat icon={<ArrowRightLeft className="w-3 h-3" />} value={campaign.transferred_calls} label="Transferred" color="text-purple-600 bg-purple-50/70" />
            <MiniStat icon={<span>{sentimentIcon}</span>} value={sentiment != null ? sentiment.toFixed(2) : '—'} label="Sentiment" color={cn(sentimentColor, 'bg-gray-50')} />
          </div>
        )}
      </div>

      {/* Footer */}
      {!isTerminal && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-0" onClick={e => e.stopPropagation()}>
          <InlineActionRow
            campaign={campaign}
            orgCredits={orgCredits}
            subscriptionStatus={subscriptionStatus}
            canRun={canRun}
            canEdit={canEdit}
            isActive={isActive}
            isLoading={isLoading}
            mutations={mutations}
            pausedForNight={pausedForNight}
          />
        </div>
      )}
    </div>
  );
}

/* ── Inline action row — elegant icon+label buttons ── */
function InlineActionRow({ campaign, orgCredits, subscriptionStatus, canRun, canEdit, isActive, isLoading, mutations, pausedForNight }) {
  const { status } = campaign;
  const blockReason = canRun ? getStartBlockReason(campaign, orgCredits, subscriptionStatus) : null;
  const isBlocked = !canRun || !!blockReason;

  if (status === 'running') {
    if (pausedForNight) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 cursor-default w-full">
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs font-medium text-indigo-600">Paused for night</span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Resumes automatically at {campaign.time_start} IST</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <ActionBtn icon={<Pause className="w-3.5 h-3.5" />} label="Pause" onClick={() => mutations.pause(campaign.id)}
          disabled={isLoading || !canRun} loading={isLoading}
          className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 bg-amber-50/50" />
        <CancelBtn campaignId={campaign.id} onConfirm={() => mutations.cancel(campaign.id)} canRun={canRun} isLoading={isLoading} />
        <CompleteBtn campaignId={campaign.id} onConfirm={() => mutations.complete?.(campaign.id)} canRun={canRun} isLoading={isLoading} />
      </div>
    );
  }

  if (status === 'paused') {
    const btn = (
      <ActionBtn icon={<RotateCcw className="w-3.5 h-3.5" />} label="Resume" onClick={() => mutations.resume(campaign.id)}
        disabled={isBlocked || isLoading} loading={isLoading}
        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" />
    );
    return (
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <TooltipProvider><Tooltip>
            <TooltipTrigger asChild><span className="flex-1">{btn}</span></TooltipTrigger>
            <TooltipContent><p>{!canRun ? "No permission" : blockReason}</p></TooltipContent>
          </Tooltip></TooltipProvider>
        ) : btn}
        <CancelBtn campaignId={campaign.id} onConfirm={() => mutations.cancel(campaign.id)} canRun={canRun} isLoading={isLoading} />
        <CompleteBtn campaignId={campaign.id} onConfirm={() => mutations.complete?.(campaign.id)} canRun={canRun} isLoading={isLoading} />
      </div>
    );
  }

  if (status === 'scheduled') {
    const btn = (
      <ActionBtn
        icon={isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : !canRun ? <Lock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        label="Start Campaign"
        onClick={() => mutations.start(campaign.id)}
        disabled={isBlocked || isLoading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
      />
    );
    if (isBlocked) {
      return (
        <TooltipProvider><Tooltip>
          <TooltipTrigger asChild><span className="w-full block">{btn}</span></TooltipTrigger>
          <TooltipContent><p>{!canRun ? "No permission to run campaigns" : blockReason}</p></TooltipContent>
        </Tooltip></TooltipProvider>
      );
    }
    return btn;
  }

  // terminal states — no primary action button, row is empty
  return null;
}

function ActionBtn({ icon, label, onClick, disabled, loading, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function CancelBtn({ campaignId, onConfirm, canRun, isLoading }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          title="Cancel campaign"
          disabled={!canRun || isLoading}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel campaign?</AlertDialogTitle>
          <AlertDialogDescription>Queued calls will stop. Active calls complete naturally. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Running</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>Cancel Campaign</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CompleteBtn({ campaignId, onConfirm, canRun, isLoading }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          title="Mark complete"
          disabled={!canRun || isLoading}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-400 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all disabled:opacity-40"
        >
          <CheckCircle className="w-3.5 h-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as completed?</AlertDialogTitle>
          <AlertDialogDescription>Remaining queued calls are cancelled. Completed calls are preserved.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Running</AlertDialogCancel>
          <AlertDialogAction className="bg-purple-600 hover:bg-purple-700" onClick={onConfirm}>Complete Campaign</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MiniStat({ icon, value, label, color }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-1 min-h-[64px]', color)}>
      <div className="flex items-center gap-1.5 text-xs font-bold leading-none">
        {icon}
        <span className="tabular-nums">{value ?? '—'}</span>
      </div>
      <div className="text-[10px] opacity-70 font-bold uppercase tracking-tight">{label}</div>
    </div>
  );
}
