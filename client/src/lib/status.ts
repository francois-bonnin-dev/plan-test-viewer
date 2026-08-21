export function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('stable')) return 'status-stable';
  if (s.includes('jouer')) return 'status-a-jouer';
  if (s.includes('obsol') || s.includes('archiv')) return 'status-obsolete';
  return 'status-default';
}
