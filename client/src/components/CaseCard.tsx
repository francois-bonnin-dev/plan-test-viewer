import type { TestCase } from '../../../src/api-types.js';
import { FormattedText } from './FormattedText.js';

export interface CaseCardProps {
  kase: TestCase;
  hasAnomaly: boolean;
  pending: boolean;
  onOpen: () => void;
  onToggle: (checked: boolean, stampEl: HTMLElement) => void;
}

// Ne rend que le recto : le verso (illisible dans une tuile de 230×190) est un
// unique overlay monté au niveau du plan — voir ZoomedCaseOverlay.
export function CaseCard({ kase, hasAnomaly, pending, onOpen, onToggle }: CaseCardProps) {
  const classes = ['case-card', kase.checked ? 'checked' : '', hasAnomaly ? 'has-anomaly' : '', pending ? 'pending' : '']
    .filter((c) => c.length > 0)
    .join(' ');

  return (
    <div className={classes} data-ct={kase.id}>
      <div className="case-card-inner">
        <div className="case-face case-front" onClick={onOpen}>
          <div className="case-face-top">
            <span className="case-chip">{kase.id}</span>
            {hasAnomaly && (
              <span className="anomaly-flag" title="Anomalie constatée sur ce cas">
                anomalie
              </span>
            )}
          </div>
          <div className="case-front-title">
            <FormattedText text={kase.title} />
          </div>
          <button
            type="button"
            className="stamp"
            title={kase.checked ? 'Marquer à refaire' : 'Marquer comme validé'}
            onClick={(ev) => {
              ev.stopPropagation();
              const target = ev.currentTarget;
              if (target instanceof HTMLElement) onToggle(!kase.checked, target);
            }}
          >
            <span className="stamp-icon">{kase.checked ? '✅' : '⬜'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
