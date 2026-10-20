import type { Plan } from '../../../src/api-types.js';
import type { PlanStatus } from '../../../src/plan-status.js';
import { pctOf } from '../lib/plan-selectors.js';
import { CalloutView } from './CalloutView.js';
import { DocTableView } from './DocTableView.js';
import { FormattedText } from './FormattedText.js';
import { InfoPanel } from './InfoPanel.js';
import { Ring } from './Ring.js';
import { StatusControl } from './StatusControl.js';

export interface HeroProps {
  plan: Plan;
  statusPending: boolean;
  onSetStatus: (status: PlanStatus) => void;
}

export function Hero({ plan, statusPending, onSetStatus }: HeroProps) {
  const pct = pctOf(plan.stats);

  const hasInfoLines = Boolean(plan.info.objet || plan.info.fonctionnalites || plan.info.horsPerimetre);
  const hasDetailsPanel = hasInfoLines || Boolean(plan.preRequis) || Boolean(plan.couverture);
  const hasExtrasPanel = Boolean(plan.limites) || Boolean(plan.anomalies);

  return (
    <div className="hero">
      <div className="hero-top">
        <div>
          <h1>{plan.title}</h1>
          <div className="detail-badges">
            <span className="badge">{plan.meta.ticket}</span>
            <StatusControl status={plan.meta.status} pending={statusPending} onChange={onSetStatus} />
            <span className="badge">{plan.meta.domain}</span>
            <span className="badge">{plan.meta.date}</span>
            {plan.meta.tags.map((t) => (
              <span className="badge" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-ring">
          <Ring pct={pct} size={88} stroke={8} label={`${pct}%`} />
        </div>
      </div>

      {hasDetailsPanel && (
        <InfoPanel title="Détails du plan">
          {hasInfoLines && (
            <div className="info-block">
              {plan.info.objet && (
                <p className="info-line">
                  <b>Objet —</b> <FormattedText text={plan.info.objet} />
                </p>
              )}
              {plan.info.fonctionnalites && (
                <p className="info-line">
                  <b>Fonctionnalités couvertes —</b> <FormattedText text={plan.info.fonctionnalites} />
                </p>
              )}
              {plan.info.horsPerimetre && (
                <p className="info-line">
                  <b>Hors périmètre —</b> <FormattedText text={plan.info.horsPerimetre} />
                </p>
              )}
            </div>
          )}
          {plan.preRequis && (
            <div className="info-block">
              <h4>Pré-requis</h4>
              {plan.preRequis.table && <DocTableView table={plan.preRequis.table} />}
              {plan.preRequis.tip && <CalloutView callout={plan.preRequis.tip} />}
            </div>
          )}
          {plan.couverture && (
            <div className="info-block">
              <h4>Couverture</h4>
              <DocTableView table={plan.couverture} />
            </div>
          )}
        </InfoPanel>
      )}

      {hasExtrasPanel && (
        <InfoPanel title="Limites & anomalies">
          {plan.limites && (
            <div className="info-block">
              <h4>Limites du test</h4>
              <CalloutView callout={plan.limites} />
            </div>
          )}
          {plan.anomalies && (
            <div className="info-block">
              <h4>Anomalies constatées</h4>
              <DocTableView table={plan.anomalies} />
            </div>
          )}
        </InfoPanel>
      )}
    </div>
  );
}
