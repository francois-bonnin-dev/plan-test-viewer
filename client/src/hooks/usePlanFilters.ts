import { useCallback, useEffect, useMemo, useState } from 'hono/jsx';
import type { Plan } from '../../../src/api-types.js';
import { isRecord } from '../api/guards.js';
import { facetOptions, facetValue, filterPlans, type Facet, type PlanFilterState } from '../lib/plan-filters.js';

const STORAGE_KEY = 'tpv-plan-filters';

interface StoredFilters {
  statuses: string[];
  domains: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function readStoredFilters(): StoredFilters {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (isRecord(raw) && isStringArray(raw.statuses) && isStringArray(raw.domains)) {
      return { statuses: raw.statuses, domains: raw.domains };
    }
  } catch {
    /* stockage indisponible ou valeur corrompue : on repart sans filtre */
  }
  return { statuses: [], domains: [] };
}

// Les sélections sont mémorisées telles quelles, même quand le dossier courant
// ne contient pas la valeur : changer de dossier puis revenir conserve la
// préférence. Seule l'intersection avec les valeurs présentes s'applique — un
// statut absent du dossier ne doit pas vider la liste sans qu'on le voie.
function effective(selected: string[], plans: Plan[], facet: Facet): Set<string> {
  const available = new Set(plans.map((p) => facetValue(p, facet)));
  return new Set(selected.filter((v) => available.has(v)));
}

export function usePlanFilters(plans: Plan[]) {
  const [query, setQuery] = useState('');
  const [stored, setStored] = useState<StoredFilters>(() => readStoredFilters());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* la mémorisation est un confort, pas une exigence */
    }
  }, [stored]);

  const state = useMemo<PlanFilterState>(
    () => ({
      query,
      statuses: effective(stored.statuses, plans, 'status'),
      domains: effective(stored.domains, plans, 'domain'),
    }),
    [query, stored, plans]
  );

  const filtered = useMemo(() => filterPlans(plans, state), [plans, state]);
  const statusOptions = useMemo(() => facetOptions(plans, state, 'status'), [plans, state]);
  const domainOptions = useMemo(() => facetOptions(plans, state, 'domain'), [plans, state]);

  const toggle = useCallback((facet: Facet, value: string) => {
    const key = facet === 'status' ? 'statuses' : 'domains';
    setStored((prev) => {
      const current = prev[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setStored({ statuses: [], domains: [] });
  }, []);

  const isActive = query.trim() !== '' || state.statuses.size > 0 || state.domains.size > 0;

  return { query, setQuery, state, filtered, statusOptions, domainOptions, toggle, reset, isActive };
}
