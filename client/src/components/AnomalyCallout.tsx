import { Fragment } from 'hono/jsx';
import { FormattedText } from './FormattedText.js';

export interface AnomalyCalloutProps {
  header: string[];
  rows: string[][];
  ctId: string;
}

interface Part {
  label: string | undefined;
  text: string;
}

// Reformule chaque ligne d'anomalie en "En-tête : valeur", cellules vides et
// référence au CT (redondante dans sa propre carte) omises.
export function AnomalyCallout({ header, rows, ctId }: AnomalyCalloutProps) {
  return (
    <div className="callout warning case-anomaly">
      <div className="callout-title">{rows.length > 1 ? 'Anomalies constatées' : 'Anomalie constatée'}</div>
      <ul>
        {rows.map((row, i) => {
          const parts: Part[] = row
            .map((cell, j) => ({ label: header[j], text: cell.trim() }))
            .filter((part) => part.text !== '' && part.text !== ctId);
          return (
            <li key={i}>
              {parts.map((part, k) => (
                <Fragment key={String(k)}>
                  {k > 0 && ' — '}
                  {part.label && <b>{part.label} : </b>}
                  <FormattedText text={part.text} />
                </Fragment>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
