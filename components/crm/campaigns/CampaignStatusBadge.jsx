'use client';

import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  running: { label: 'Running', dot: 'bg-green-400 animate-pulse', badge: 'bg-green-50 text-green-700 border-green-200' },
  paused: { label: 'Paused', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200' },
  failed: { label: 'Failed', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
  archived: { label: 'Archived', dot: 'bg-gray-300', badge: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export function CampaignStatusBadge({ status, isReadyToStart = false, isPausedForNight = false }) {
  let config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  let label = config.label;
  let dotClass = config.dot;
  let badgeClass = config.badge;

  if (isReadyToStart && status === 'scheduled') {
    label = 'Ready to Start';
    dotClass = 'bg-green-400 animate-ping';
    badgeClass = 'bg-green-50 text-green-700 border-green-300 font-semibold';
  }

  if (isPausedForNight && status === 'running') {
    label = 'Paused for night';
    dotClass = 'bg-amber-400';
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium', badgeClass)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} />
      {label}
    </span>
  );
}
