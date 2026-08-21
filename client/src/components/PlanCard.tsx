import type { Plan } from '../../../src/api-types.js';
import { pctOf } from '../lib/plan-selectors.js';
import { statusClass } from '../lib/status.js';
import { Ring } from './Ring.js';

export function PlanCard({ plan, active, onSelect }: { plan: Plan; active: boolean; onSelect: () => void }) {
  const pct = pctOf(plan.stats);
  const classes = ['plan-card', active ? 'active' : '', pct === 100 ? 'plan-complete' : ''].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onSelect}>
      <div className="plan-card-ring">
        <Ring pct={pct} size={46} stroke={5} />
      </div>
      <div className="plan-card-body">
        <div className="plan-card-top">
          <span className="plan-ticket">{plan.meta.ticket || '—'}</span>
          <span className={`status-pill ${statusClass(plan.meta.status)}`}>{plan.meta.status}</span>
        </div>
        <div className="plan-title">{plan.title}</div>
        <div className="plan-meta">
          <span className="plan-domain">{plan.meta.domain}</span>
          <span>
            {plan.stats.checked}/{plan.stats.total} CT
          </span>
        </div>
      </div>
    </div>
  );
}
