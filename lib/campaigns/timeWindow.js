export function getNowIST() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
  return { todayIST: dateStr, timeIST: timeStr.slice(0, 5) };
}

export function isReadyToStart(campaign) {
  if (campaign.status !== 'scheduled') return false;
  const { todayIST, timeIST } = getNowIST();
  return (
    todayIST === campaign.start_date &&
    (!campaign.time_start || timeIST >= campaign.time_start) &&
    (!campaign.time_end || timeIST <= campaign.time_end)
  );
}

export function isRunningButPausedForNight(campaign) {
  if (campaign.status !== 'running') return false;
  const { timeIST } = getNowIST();
  if (!campaign.time_start || !campaign.time_end) return false;
  return timeIST < campaign.time_start || timeIST > campaign.time_end;
}

export function getStartBlockReason(campaign, orgCredits, subscriptionStatus) {
  const { todayIST, timeIST } = getNowIST();

  if (campaign.start_date && todayIST < campaign.start_date) {
    const d = new Date(campaign.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Campaign starts on ${d}`;
  }
  if (campaign.end_date && todayIST > campaign.end_date) {
    return 'Campaign end date has passed — edit to extend';
  }
  if (campaign.time_start && timeIST < campaign.time_start) {
    return `Calling window opens at ${campaign.time_start}`;
  }
  if (campaign.time_end && timeIST > campaign.time_end) {
    return `Today's calling window closed at ${campaign.time_end}`;
  }
  if (campaign.dnd_compliance !== false && (timeIST < '09:00' || timeIST > '21:00')) {
    return 'DND rules: calls only 9 AM–9 PM IST';
  }
  if (typeof orgCredits === 'number' && orgCredits < 1) {
    return 'Insufficient call credits — top up to start';
  }
  if (!['active', 'trialing'].includes(subscriptionStatus)) {
    return 'Your subscription is inactive';
  }
  if (!campaign.total_enrolled || campaign.total_enrolled === 0) {
    return 'No leads enrolled — enroll leads first';
  }
  return null;
}
