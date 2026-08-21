import { useState } from 'hono/jsx';
import type { TestCase } from '../../../src/api-types.js';
import type { NavDirection } from '../hooks/useZoomedCase.js';
import { copyText } from '../lib/clipboard.js';
import { AnomalyCallout } from './AnomalyCallout.js';
import { DocTableView } from './DocTableView.js';
import { FormattedText } from './FormattedText.js';

export interface ZoomedCaseOverlayProps {
  kase: TestCase;
  chapterTitle: string;
  anomalyHeader: string[];
  anomalyRows: string[][] | null;
  pending: boolean;
  direction: NavDirection;
  isFirst: boolean;
  isLast: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: (checked: boolean, stampEl: HTMLElement) => void;
  onToast: (message: string, isError?: boolean) => void;
}

// Le verso EST l'overlay (pas un enfant caché de la tuile de grille) : un
// chapitre replié ne peut donc plus jamais le rendre invisible. Structure
// .case-card > .case-card-inner > .case-face.case-back reproduite à
// l'identique pour réutiliser le CSS existant tel quel (voir styles.css).
export function ZoomedCaseOverlay(props: ZoomedCaseOverlayProps) {
  const { kase } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyText(kase.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
      props.onToast(`${kase.id} copié dans le presse-papiers`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      props.onToast(`Copie impossible : ${message}`, true);
    }
  };

  const navClass = props.direction === 'next' ? 'nav-next' : props.direction === 'prev' ? 'nav-prev' : '';
  const classes = ['case-card', 'zoomed', navClass, kase.checked ? 'checked' : '', props.pending ? 'pending' : '']
    .filter((c) => c.length > 0)
    .join(' ');

  return (
    <div className={classes} data-ct={kase.id}>
      <div className="case-card-inner">
        <div className="case-face case-back">
          <div className="case-face-top">
            <span className="case-chapter" title={props.chapterTitle}>
              {props.chapterTitle}
            </span>
            <button
              type="button"
              className={`case-chip case-chip-copy ${copied ? 'copied' : ''}`}
              title="Cliquer pour copier l'identifiant"
              onClick={() => void handleCopy()}
            >
              {kase.id}
            </button>
            <button type="button" className="flip-btn" title="Fermer" onClick={props.onClose}>
              ✕
            </button>
          </div>

          <div className="case-back-title">
            <FormattedText text={kase.title} />
          </div>

          <div className="case-back-scroll">
            {kase.precondition && (
              <div className="callout tip case-precondition">
                <div className="callout-title">Pré-condition</div>
                <p>
                  <FormattedText text={kase.precondition} />
                </p>
              </div>
            )}
            {kase.steps ? (
              <DocTableView table={kase.steps} />
            ) : (
              <p className="case-no-steps">Pas d'étapes détaillées.</p>
            )}
            {props.anomalyRows && props.anomalyRows.length > 0 && (
              <AnomalyCallout header={props.anomalyHeader} rows={props.anomalyRows} ctId={kase.id} />
            )}
          </div>

          <div className="case-actions">
            <button type="button" className="btn-nav btn-prev" disabled={props.isFirst} onClick={props.onPrev}>
              ‹ Précédent
            </button>
            <button
              type="button"
              className={`btn-validate ${kase.checked ? 'is-done' : ''}`}
              onClick={(ev) => {
                const target = ev.currentTarget;
                if (target instanceof HTMLElement) props.onToggle(!kase.checked, target);
              }}
            >
              {kase.checked ? '↺ Marquer à refaire' : 'Valider ce cas'}
            </button>
            <button type="button" className="btn-nav btn-next" disabled={props.isLast} onClick={props.onNext}>
              Suivant ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
