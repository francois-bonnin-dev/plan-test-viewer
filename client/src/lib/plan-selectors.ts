import type { ChapterGroup, DocTable, Plan, PlanStats, TestCase } from '../../../src/api-types.js';

export function pctOf(stats: PlanStats): number {
  return stats.total ? Math.round((stats.checked / stats.total) * 100) : 0;
}

export function groupCounts(cases: TestCase[]): { total: number; checked: number } {
  const total = cases.length;
  const checked = cases.filter((c) => c.checked).length;
  return { total, checked };
}

export function findCase(plan: Plan, ctId: string): TestCase | null {
  for (const g of plan.groups) {
    const found = g.cases.find((c) => c.id === ctId);
    if (found) return found;
  }
  if (plan.nonRegression) {
    const found = plan.nonRegression.cases.find((c) => c.id === ctId);
    if (found) return found;
  }
  return null;
}

// Le gabarit n'impose pas de colonne "cas" dans "Anomalies constatées" : on
// cherche les identifiants CT-nn dans TOUTES les cellules de chaque ligne,
// que la référence soit dans une colonne dédiée ou noyée dans la description.
const CT_REF_RE = /\bCT-\d+\b/g;

export function anomaliesByCase(anomalies: DocTable | null): Map<string, string[][]> {
  const map = new Map<string, string[][]>();
  if (!anomalies) return map;
  for (const row of anomalies.rows) {
    const ids = new Set<string>();
    for (const cell of row) {
      for (const m of cell.matchAll(CT_REF_RE)) {
        const id = m[0];
        ids.add(id);
      }
    }
    for (const id of ids) {
      const existing = map.get(id);
      if (existing) existing.push(row);
      else map.set(id, [row]);
    }
  }
  return map;
}

export interface CaseRef {
  ctId: string;
  chapterKey: string;
}

// L'ordre de navigation Précédent/Suivant suit l'ordre du document : tous les
// chapitres, dans l'ordre, puis la Non-régression.
export function buildCaseOrder(plan: Plan): CaseRef[] {
  const order: CaseRef[] = [];
  plan.groups.forEach((group, idx) => {
    for (const kase of group.cases) order.push({ ctId: kase.id, chapterKey: `g${idx}` });
  });
  if (plan.nonRegression) {
    for (const kase of plan.nonRegression.cases) order.push({ ctId: kase.id, chapterKey: 'non-reg' });
  }
  return order;
}

// Chapitres dont tous les cas sont validés : repliés par défaut à l'ouverture
// d'un plan, pour que l'œil tombe directement sur ce qui reste à jouer.
export function completedChapterKeys(plan: Plan | null): string[] {
  if (!plan) return [];
  const keys: string[] = [];
  plan.groups.forEach((group, idx) => {
    if (isComplete(group)) keys.push(`g${idx}`);
  });
  if (plan.nonRegression && isComplete(plan.nonRegression)) keys.push('non-reg');
  return keys;
}

function isComplete(group: ChapterGroup): boolean {
  return group.cases.length > 0 && group.cases.every((c) => c.checked);
}

export function getGroupByKey(plan: Plan, key: string): ChapterGroup | null {
  if (key === 'non-reg') return plan.nonRegression;
  const idx = Number(key.slice(1));
  return plan.groups[idx] ?? null;
}
