// Couleur de la pastille de statut, déduite du texte du frontmatter. Reste
// tolérante aux valeurs héritées des anciens plans (`done`, `stable`,
// `à jouer`, `obsolète`) en plus du jeu proposé par src/plan-status.ts.
export function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('erreur') || s.includes('anomal') || s.includes('bloqu')) return 'status-erreurs';
  if (s.includes('obsol') || s.includes('archiv')) return 'status-obsolete';
  if (s.includes('termin') || s.includes('done') || s.includes('stable')) return 'status-stable';
  if (s.includes('cours')) return 'status-en-cours';
  if (s.includes('faire') || s.includes('jouer')) return 'status-a-jouer';
  return 'status-default';
}
