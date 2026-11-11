export interface GroupColorStyle {
  name: string;
  // For Pattern input syntax highlighting (brackets & (?<name>) tags)
  bracketText: string;
  bracketBg: string;
  // For Match result text segment highlighting
  segmentBg: string;
  segmentBorder: string;
  segmentText: string;
  // For badges/chips in group bar & table
  badgeBg: string;
  badgeText: string;
  dotBg: string;
}

export const GROUP_PALETTES: GroupColorStyle[] = [
  {
    name: 'amber',
    bracketText: 'text-amber-700 dark:text-amber-300 font-semibold',
    bracketBg: 'bg-amber-100/90 dark:bg-amber-900/50 rounded-xs',
    segmentBg: 'bg-amber-100/90 dark:bg-amber-900/50 hover:bg-amber-200/90 dark:hover:bg-amber-800/70',
    segmentBorder: 'border-b-2 border-amber-500 dark:border-amber-400',
    segmentText: 'text-amber-950 dark:text-amber-100',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800',
    badgeText: 'text-amber-800 dark:text-amber-300',
    dotBg: 'bg-amber-500',
  },
  {
    name: 'emerald',
    bracketText: 'text-emerald-700 dark:text-emerald-300 font-semibold',
    bracketBg: 'bg-emerald-100/90 dark:bg-emerald-900/50 rounded-xs',
    segmentBg: 'bg-emerald-100/90 dark:bg-emerald-900/50 hover:bg-emerald-200/90 dark:hover:bg-emerald-800/70',
    segmentBorder: 'border-b-2 border-emerald-500 dark:border-emerald-400',
    segmentText: 'text-emerald-950 dark:text-emerald-100',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    dotBg: 'bg-emerald-500',
  },
  {
    name: 'purple',
    bracketText: 'text-purple-700 dark:text-purple-300 font-semibold',
    bracketBg: 'bg-purple-100/90 dark:bg-purple-900/50 rounded-xs',
    segmentBg: 'bg-purple-100/90 dark:bg-purple-900/50 hover:bg-purple-200/90 dark:hover:bg-purple-800/70',
    segmentBorder: 'border-b-2 border-purple-500 dark:border-purple-400',
    segmentText: 'text-purple-950 dark:text-purple-100',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800',
    badgeText: 'text-purple-800 dark:text-purple-300',
    dotBg: 'bg-purple-500',
  },
  {
    name: 'rose',
    bracketText: 'text-rose-700 dark:text-rose-300 font-semibold',
    bracketBg: 'bg-rose-100/90 dark:bg-rose-900/50 rounded-xs',
    segmentBg: 'bg-rose-100/90 dark:bg-rose-900/50 hover:bg-rose-200/90 dark:hover:bg-rose-800/70',
    segmentBorder: 'border-b-2 border-rose-500 dark:border-rose-400',
    segmentText: 'text-rose-950 dark:text-rose-100',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800',
    badgeText: 'text-rose-800 dark:text-rose-300',
    dotBg: 'bg-rose-500',
  },
  {
    name: 'cyan',
    bracketText: 'text-cyan-700 dark:text-cyan-300 font-semibold',
    bracketBg: 'bg-cyan-100/90 dark:bg-cyan-900/50 rounded-xs',
    segmentBg: 'bg-cyan-100/90 dark:bg-cyan-900/50 hover:bg-cyan-200/90 dark:hover:bg-cyan-800/70',
    segmentBorder: 'border-b-2 border-cyan-500 dark:border-cyan-400',
    segmentText: 'text-cyan-950 dark:text-cyan-100',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    dotBg: 'bg-cyan-500',
  },
  {
    name: 'indigo',
    bracketText: 'text-indigo-700 dark:text-indigo-300 font-semibold',
    bracketBg: 'bg-indigo-100/90 dark:bg-indigo-900/50 rounded-xs',
    segmentBg: 'bg-indigo-100/90 dark:bg-indigo-900/50 hover:bg-indigo-200/90 dark:hover:bg-indigo-800/70',
    segmentBorder: 'border-b-2 border-indigo-500 dark:border-indigo-400',
    segmentText: 'text-indigo-950 dark:text-indigo-100',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    dotBg: 'bg-indigo-500',
  },
];

export function getGroupColor(groupIndex: number): GroupColorStyle {
  const idx = Math.max(0, groupIndex - 1) % GROUP_PALETTES.length;
  return GROUP_PALETTES[idx];
}
