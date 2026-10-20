import type { Plan } from '../../../src/api-types.js';
import { PLAN_STATUSES } from '../../../src/plan-status.js';

export type Facet = 'status' | 'domain';

export interface PlanFilterState {
  query: string;
  statuses: ReadonlySet<string>;
  domains: ReadonlySet<string>;
}

export interface FacetOption {
  value: string;
  count: number;
}

export function facetValue(plan: Plan, facet: Facet): string {
  return (facet === 'status' ? plan.meta.status : plan.meta.domain).trim();
}

function matchesQuery(plan: Plan, query: string): boolean {
  const haystack = [plan.title, plan.meta.ticket, plan.meta.domain, plan.meta.status, ...plan.meta.tags]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

// `skip` neutralise une facette : c'est ainsi qu'on compte ce que donnerait
// chaque option de cette facette, les autres critères restant appliqués.
export function filterPlans(plans: Plan[], state: PlanFilterState, skip?: Facet): Plan[] {
  const q = state.query.trim().toLowerCase();
  return plans.filter(
    (plan) =>
      (!q || matchesQuery(plan, q)) &&
      (skip === 'status' || state.statuses.size === 0 || state.statuses.has(facetValue(plan, 'status'))) &&
      (skip === 'domain' || state.domains.size === 0 || state.domains.has(facetValue(plan, 'domain')))
  );
}

// Les statuts proposés par l'UI gardent leur ordre de workflow ; les valeurs
// héritées (`stable`, `obsolète`…) suivent par ordre alphabétique.
function statusRank(value: string): number {
  const v = value.toLowerCase();
  const idx = PLAN_STATUSES.findIndex((s) => s.toLowerCase() === v);
  return idx === -1 ? PLAN_STATUSES.length : idx;
}

// Options construites à partir des plans réellement chargés : un dossier sans
// plan « Erreurs remontées » n'affiche pas ce filtre. Toutes les valeurs du
// dossier restent listées, même quand les autres critères les ramènent à 0.
export function facetOptions(plans: Plan[], state: PlanFilterState, facet: Facet): FacetOption[] {
  const counts = new Map<string, number>();
  for (const plan of plans) counts.set(facetValue(plan, facet), 0);
  for (const plan of filterPlans(plans, state, facet)) {
    const value = facetValue(plan, facet);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const options = [...counts].map(([value, count]) => ({ value, count }));
  return options.sort(
    (a, b) =>
      (facet === 'status' ? statusRank(a.value) - statusRank(b.value) : 0) || a.value.localeCompare(b.value, 'fr')
  );
}
