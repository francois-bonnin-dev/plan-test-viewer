import { PLAN_STATUSES, isPlanStatus, type PlanStatus } from '../../../src/plan-status.js';
import { statusClass } from '../lib/status.js';

export interface StatusControlProps {
  status: string;
  pending: boolean;
  onChange: (status: PlanStatus) => void;
}

// La pastille de statut du plan, devenue modifiable : c'est le même repère
// visuel qu'en lecture (mêmes classes de couleur que dans la liste de gauche),
// juste doublé d'un <select> qui écrit le frontmatter du fichier.
export function StatusControl({ status, pending, onChange }: StatusControlProps) {
  // Le statut lu dans le fichier peut sortir du jeu proposé (valeur héritée
  // comme `done` ou `stable`, ou frontmatter sans `status:`) : on l'ajoute alors
  // comme option courante, pour que le sélecteur affiche toujours le fichier
  // tel qu'il est plutôt qu'un statut qu'il ne contient pas.
  const isKnown = PLAN_STATUSES.some((s) => s === status);

  const classes = ['status-control', statusClass(status), pending ? 'is-pending' : ''].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <select
        title="Mettre à jour le statut du plan"
        value={status}
        disabled={pending}
        onChange={(ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLSelectElement)) return;
          if (isPlanStatus(target.value)) onChange(target.value);
        }}
      >
        {!isKnown && <option value={status}>{status || '— sans statut —'}</option>}
        {PLAN_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </span>
  );
}
