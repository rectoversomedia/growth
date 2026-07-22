// Sync job scheduling utilities

export interface SyncScheduleConfig {
  metadata: 'hourly' | 'daily' | 'weekly' | 'manual';
  currentRatings: 'hourly' | 'daily' | 'weekly' | 'manual';
  ratingHistory: 'hourly' | 'daily' | 'weekly' | 'manual';
  reviews: 'hourly' | 'daily' | 'weekly' | 'manual';
  keywordRankings: 'hourly' | 'daily' | 'weekly' | 'manual';
  keywordMetrics: 'daily' | 'weekly' | 'monthly' | 'manual';
  keywordSuggestions: 'daily' | 'weekly' | 'monthly' | 'manual';
  competitorData: 'hourly' | 'daily' | 'weekly' | 'manual';
}

/**
 * Credit-efficient default sync schedule:
 *
 * LIGHT (daily ~2 credits):
 *   - currentRatings → 1 credit
 *
 * FULL  (weekly ~9 credits):
 *   - metadata → 2 credits
 *   - currentRatings → 1 credit
 *   - reviews → 2 credits
 *   - keywordRankings → 2 credits
 *   - keywordMetrics → ~2 credits (top 10 keywords, 1 credit each)
 *
 * Heavy items (competitorData, keywordSuggestions) are manual-only by default.
 */
export const DEFAULT_SYNC_SCHEDULE: SyncScheduleConfig = {
  metadata: 'weekly',
  currentRatings: 'daily',
  ratingHistory: 'weekly',
  reviews: 'weekly',
  keywordRankings: 'weekly',
  keywordMetrics: 'weekly',
  keywordSuggestions: 'manual',
  competitorData: 'manual',
};

export function getNextSyncTime(schedule: keyof SyncScheduleConfig, config: SyncScheduleConfig = DEFAULT_SYNC_SCHEDULE): Date | null {
  const freq = config[schedule];
  if (freq === 'manual') return null;

  const now = new Date();
  switch (freq) {
    case 'hourly': {
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      return nextHour;
    }
    case 'daily': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0); // 3am next day
      return tomorrow;
    }
    case 'weekly': {
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
      nextMonday.setHours(3, 0, 0, 0);
      return nextMonday;
    }
    case 'monthly': {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 3, 0, 0, 0);
      return nextMonth;
    }
    default:
      return null;
  }
}

export function getCreditThreshold(remainingCredits: number, dailyAverage: number): {
  level: 'healthy' | 'low' | 'critical';
  message: string;
} {
  const daysRemaining = dailyAverage > 0 ? remainingCredits / dailyAverage : Infinity;

  if (daysRemaining <= 1) {
    return {
      level: 'critical',
      message: `Credit balance critically low. ${formatDays(daysRemaining)} remaining at current rate.`,
    };
  }
  if (daysRemaining <= 3) {
    return {
      level: 'low',
      message: `Credit balance running low. ${formatDays(daysRemaining)} remaining at current rate.`,
    };
  }
  return {
    level: 'healthy',
    message: `${formatDays(daysRemaining)} of credits remaining.`,
  };
}

function formatDays(days: number): string {
  if (days === Infinity) return 'unlimited';
  if (days < 1) return '<1 day';
  return `${Math.floor(days)}–${Math.ceil(days)} days`;
}
