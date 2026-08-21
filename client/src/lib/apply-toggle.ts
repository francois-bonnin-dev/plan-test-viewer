import type { Plan, PlanStats, TestCase } from '../../../src/api-types.js';

// Mise à jour immuable : produit un nouveau Plan avec le cas `ctId` marqué
// checked/unchecked et les stats à jour, sans muter l'objet précédent — on a
// besoin de comparer avant/après pour la cascade confettis/toast (§10 du plan).
export function applyToggle(plan: Plan, ctId: string, checked: boolean, stats: PlanStats): Plan {
  const updateCases = (cases: TestCase[]): TestCase[] =>
    cases.map((c) => (c.id === ctId ? { ...c, checked } : c));

  return {
    ...plan,
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
