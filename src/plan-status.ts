// Jeu de statuts que l'UI propose pour le frontmatter `status:` d'un plan.
// Module partagé serveur/client : le serveur s'en sert de liste blanche
// d'écriture (voir src/validation.ts) et le client en peuple son sélecteur —
// une seule source pour les deux côtés, jamais deux listes à resynchroniser.
//
// Les valeurs sont écrites telles quelles dans le frontmatter : aucune ne
// contient de caractère nécessitant une mise entre guillemets YAML.
export const PLAN_STATUSES = ['À faire', 'En cours', 'Erreurs remontées', 'Terminée'] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

export function isPlanStatus(value: unknown): value is PlanStatus {
  return typeof value === 'string' && PLAN_STATUSES.some((status) => status === value);
}

// Statut dicté par l'avancement : aucun cas validé = « À faire », tous validés
// = « Terminée », entre les deux = « En cours ». Un plan sans cas n'a pas
// d'avancement, son statut reste celui choisi à la main.
function progressStatus(stats: { total: number; checked: number }): PlanStatus | null {
  if (stats.total === 0) return null;
  if (stats.checked === 0) return 'À faire';
  if (stats.checked === stats.total) return 'Terminée';
  return 'En cours';
}

// « Erreurs remontées » porte une information que l'avancement ne sait pas
// déduire : il n'est jamais écrasé automatiquement, seul un choix manuel l'ôte.
const STICKY_STATUSES: readonly string[] = ['Erreurs remontées'];

// Nouveau statut à écrire après un changement d'avancement, ou null s'il n'y a
// rien à changer.
export function autoStatusFor(current: string, stats: { total: number; checked: number }): PlanStatus | null {
  const trimmed = current.trim();
  if (STICKY_STATUSES.includes(trimmed)) return null;
  const target = progressStatus(stats);
  return target !== null && target !== trimmed ? target : null;
}
