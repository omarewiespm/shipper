/** Date presets for the Shipments date filter (spec §3.3). Filters on creation time. */

export interface DatePreset {
  key: string;
  label: string;
}

export const DATE_PRESETS: readonly DatePreset[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
] as const;

export const DEFAULT_DATE_KEY = 'all';

export function datePresetLabel(key: string): string {
  return DATE_PRESETS.find((p) => p.key === key)?.label ?? 'All time';
}

/** Inclusive [from, to) bounds in epoch ms for a preset, relative to `now`. */
function boundsFor(key: string, now: Date): { from?: number; to?: number } {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86_400_000;
  switch (key) {
    case 'today':
      return { from: startOfDay, to: startOfDay + DAY };
    case '7d':
      return { from: startOfDay - 6 * DAY };
    case '30d':
      return { from: startOfDay - 29 * DAY };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime() };
    case 'all':
    default:
      return {};
  }
}

export function inDatePreset(createdAtIso: string, key: string, now: Date): boolean {
  const { from, to } = boundsFor(key, now);
  const t = Date.parse(createdAtIso);
  if (from != null && t < from) return false;
  if (to != null && t >= to) return false;
  return true;
}
