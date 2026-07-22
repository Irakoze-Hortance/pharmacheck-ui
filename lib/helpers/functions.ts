import {HistoryItem, DayBucket}  from '@/lib/types/types';

export function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

export function shortFilename(name: string) {
  if (!name) return '—';
  return name.length > 28 ? `…${name.slice(-24)}` : name;
}

export function buildDailyBuckets(history: HistoryItem[], days = 14): DayBucket[] {
  const map: Record<string, DayBucket> = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    map[key] = { key, label, authentic: 0, counterfeit: 0, total: 0 };
  }
  for (const item of history) {
    const key = item.timestamp?.slice(0, 10);
    if (key && map[key]) {
      map[key][item.verdict]++;
      map[key].total++;
    }
  }
  return Object.values(map);
}

export function normRate(val: number) {
  return val > 1 ? val : val * 100;
}
