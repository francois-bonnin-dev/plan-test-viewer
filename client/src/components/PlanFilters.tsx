import type { Facet, FacetOption } from '../lib/plan-filters.js';
import { statusClass } from '../lib/status.js';

export interface PlanFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  statusOptions: FacetOption[];
  domainOptions: FacetOption[];
  selectedStatuses: ReadonlySet<string>;
  selectedDomains: ReadonlySet<string>;
  onToggle: (facet: Facet, value: string) => void;
  isActive: boolean;
  onReset: () => void;
}

function FilterGroup({
  label,
  facet,
  options,
  selected,
  onToggle,
}: {
  label: string;
  facet: Facet;
  options: FacetOption[];
  selected: ReadonlySet<string>;
  onToggle: (facet: Facet, value: string) => void;
}) {
  // Une seule valeur dans le dossier : le filtre ne discriminerait rien.
  if (options.length < 2) return null;

  return (
    <div className="filter-group" role="group" aria-label={label}>
      <span className="filter-label">{label}</span>
      <div className="filter-chips">
        {options.map(({ value, count }) => {
          const on = selected.has(value);
          const tone = facet === 'status' ? statusClass(value) : 'filter-chip-domain';
          const classes = ['filter-chip', on ? `is-on ${tone}` : '', count === 0 && !on ? 'is-empty' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button key={value} type="button" className={classes} aria-pressed={String(on)} onClick={() => onToggle(facet, value)}>
              <span className="filter-chip-label">{value || '—'}</span>
              <span className="filter-chip-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PlanFilters(props: PlanFiltersProps) {
  return (
    <div className="plan-filters">
      <input
        type="search"
        placeholder="Filtrer : ticket, titre, tag…"
        aria-label="Filtrer les plans"
        value={props.query}
        onInput={(ev) => {
          const target = ev.target;
          if (target instanceof HTMLInputElement) props.onQueryChange(target.value);
        }}
      />
      <FilterGroup
        label="Statut"
        facet="status"
        options={props.statusOptions}
        selected={props.selectedStatuses}
        onToggle={props.onToggle}
      />
      <FilterGroup
        label="Domaine"
        facet="domain"
        options={props.domainOptions}
        selected={props.selectedDomains}
        onToggle={props.onToggle}
      />
      {props.isActive && (
        <button type="button" className="filter-reset" onClick={props.onReset}>
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
