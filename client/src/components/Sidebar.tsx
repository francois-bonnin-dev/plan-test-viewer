import { useMemo } from 'hono/jsx';
import type { Plan } from '../../../src/api-types.js';
import { PlanCard } from './PlanCard.js';

export interface SidebarProps {
  plans: Plan[];
  activeFile: string | null;
  loading: boolean;
  error: string | null;
  query: string;
  onSelect: (fileName: string) => void;
}

function matches(plan: Plan, query: string): boolean {
  const haystack = [plan.title, plan.meta.ticket, plan.meta.domain, plan.meta.status, ...plan.meta.tags]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function Sidebar({ plans, activeFile, loading, error, query, onSelect }: SidebarProps) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? plans.filter((p) => matches(p, q)) : plans;
  }, [plans, query]);

  return (
    <aside className="sidebar">
      {loading && <div className="sidebar-empty">Chargement…</div>}
      {!loading && error && <div className="sidebar-empty">Dossier illisible.</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="sidebar-empty">{plans.length === 0 ? 'Aucun plan de test dans ce dossier.' : 'Aucun résultat.'}</div>
      )}
      {!loading &&
        !error &&
        filtered.map((plan) => (
          <PlanCard
            key={plan.fileName}
            plan={plan}
            active={plan.fileName === activeFile}
            onSelect={() => onSelect(plan.fileName)}
          />
        ))}
    </aside>
  );
}
