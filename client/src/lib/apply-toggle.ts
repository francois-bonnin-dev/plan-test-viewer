import type { Plan, PlanStats, TestCase } from '../../../src/api-types.js';

// Mise à jour immuable : produit un nouveau Plan avec le cas `ctId` marqué
// checked/unchecked, les stats et le statut renvoyés par le serveur, sans muter l'objet précédent — on a
// besoin de comparer avant/après pour la cascade confettis/toast (§10 du plan).
export function applyToggle(plan: Plan, ctId: string, checked: boolean, stats: PlanStats, status: string): Plan {
  const updateCases = (cases: TestCase[]): TestCase[] =>
    cases.map((c) => (c.id === ctId ? { ...c, checked } : c));

  return {
    ...plan,
    meta: plan.meta.status === status ? plan.meta : { ...plan.meta, status },
    groups: plan.groups.map((g) => ({ ...g, cases: updateCases(g.cases) })),
    nonRegression: plan.nonRegression
      ? { ...plan.nonRegression, cases: updateCases(plan.nonRegression.cases) }
      : null,
    stats,
  };
}

export function isGroupComplete(counts: { total: number; checked: number }): boolean {
  return counts.total > 0 && counts.checked === counts.total;
}
