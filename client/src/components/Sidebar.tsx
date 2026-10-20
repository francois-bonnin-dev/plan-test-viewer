import type { Plan } from '../../../src/api-types.js';
import { useListPresence } from '../hooks/useListPresence.js';
import type { usePlanFilters } from '../hooks/usePlanFilters.js';
import { PlanCard } from './PlanCard.js';
import { PlanFilters } from './PlanFilters.js';

// Aligné sur la durée des animations .plan-slot de public/styles.css.
const SLOT_ANIMATION_MS = 240;

export interface SidebarProps {
  plans: Plan[];
  dir: string | null;
  activeFile: string | null;
  loading: boolean;
  error: string | null;
  filters: ReturnType<typeof usePlanFilters>;
  open: boolean;
  onClose: () => void;
  onSelect: (fileName: string) => void;
}

export function Sidebar({ plans, dir, activeFile, loading, error, filters, open, onClose, onSelect }: SidebarProps) {
  const { filtered } = filters;
  const ready = !loading && !error;
  const slots = useListPresence(filtered, (p) => p.fileName, SLOT_ANIMATION_MS, dir);

  return (
    <aside id="plan-sidebar" className={`sidebar${open ? '' : ' is-closed'}`} aria-label="Liste des plans">
      <div className="sidebar-head">
        <span className="sidebar-title">
          Plans
          {ready && plans.length > 0 && (
            <span className="sidebar-count">
              {filtered.length === plans.length ? plans.length : `${filtered.length} / ${plans.length}`}
            </span>
          )}
        </span>
        <button type="button" className="sidebar-close" title="Masquer la liste des plans" onClick={onClose}>
          «
        </button>
      </div>

      {ready && plans.length > 0 && (
        <PlanFilters
          query={filters.query}
          onQueryChange={filters.setQuery}
          statusOptions={filters.statusOptions}
          domainOptions={filters.domainOptions}
          selectedStatuses={filters.state.statuses}
          selectedDomains={filters.state.domains}
          onToggle={filters.toggle}
          isActive={filters.isActive}
          onReset={filters.reset}
        />
      )}

      <div className="sidebar-list">
        {loading && <div className="sidebar-empty">Chargement…</div>}
        {!loading && error && <div className="sidebar-empty">Dossier illisible.</div>}
        {ready && filtered.length === 0 && (
          <div className="sidebar-empty">
            {plans.length === 0 ? 'Aucun plan de test dans ce dossier.' : 'Aucun plan ne correspond aux filtres.'}
          </div>
        )}
        {ready &&
          slots.map(({ key, item: plan, phase }) => (
            // Le créneau anime sa hauteur (grid-template-rows 0fr ↔ 1fr) : les
            // cartes voisines glissent au lieu de sauter. Le décalage interne
            // porte l'espacement, qui se replie avec lui.
            <div key={key} className={`plan-slot is-${phase}`} aria-hidden={phase === 'leave' ? 'true' : undefined}>
              <div className="plan-slot-clip">
                <div className="plan-slot-pad">
                  <PlanCard plan={plan} active={plan.fileName === activeFile} onSelect={() => onSelect(plan.fileName)} />
                </div>
              </div>
            </div>
          ))}
      </div>
    </aside>
  );
}
