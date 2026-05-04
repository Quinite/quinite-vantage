'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Moon, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStartBlockReason, isRunningButPausedForNight } from '@/lib/campaigns/timeWindow';

export function CampaignActionButton({
  campaign,
  orgCredits,
  subscriptionStatus,
  canRun,
  canEdit,
  onStart,
  onPause,
  onResume,
  onArchive,
  isLoading = false,
  className,
}) {
  const { status } = campaign;
  const pausedForNight = isRunningButPausedForNight(campaign);

  if (status === 'running') {
    if (pausedForNight) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className={cn('gap-2 cursor-default', className)} disabled>
                <Moon className="w-4 h-4" />
                Paused for night
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Outside calling window. Resumes automatically at {campaign.time_start}.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Button
        variant="outline"
        className={cn('gap-2 border-amber-300 text-amber-700 hover:bg-amber-50', className)}
        onClick={onPause}
        disabled={isLoading || !canRun}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Pause
      </Button>
    );
  }

  if (status === 'paused') {
    const blockReason = canRun ? getStartBlockReason(campaign, orgCredits, subscriptionStatus) : null;
    const isDisabled = !canRun || !!blockReason || isLoading;
    const tooltipText = !canRun ? "You don't have permission to run campaigns" : blockReason;

    const btn = (
      <Button
        className={cn('gap-2 bg-green-600 hover:bg-green-700 text-white', className)}
        onClick={onResume}
        disabled={isDisabled}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (!canRun ? <Lock className="w-4 h-4" /> : null)}
        Resume
      </Button>
    );

    if (!isDisabled) return btn;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
          <TooltipContent><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === 'scheduled') {
    const blockReason = canRun ? getStartBlockReason(campaign, orgCredits, subscriptionStatus) : null;
    const isDisabled = !canRun || !!blockReason || isLoading;
    const tooltipText = !canRun ? "You don't have permission to run campaigns" : blockReason;

    const btn = (
      <Button
        className={cn('gap-2 bg-green-600 hover:bg-green-700 text-white', className)}
        onClick={onStart}
        disabled={isDisabled}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (!canRun ? <Lock className="w-4 h-4" /> : null)}
        Start Campaign
      </Button>
    );

    if (!isDisabled) return btn;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
          <TooltipContent><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (['completed', 'cancelled', 'failed'].includes(status)) {
    return null;
  }

  return null;
}
