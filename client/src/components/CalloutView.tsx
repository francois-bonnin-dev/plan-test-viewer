import type { Callout } from '../../../src/api-types.js';
import { FormattedText } from './FormattedText.js';

export function CalloutView({ callout, className = '' }: { callout: Callout; className?: string }) {
  const cls = callout.type === 'warning' ? 'warning' : 'tip';
  const hasBullets = callout.items.some((i) => i.bullet);

  return (
    <div className={`callout ${cls} ${className}`}>
      <div className="callout-title">{callout.title}</div>
      {hasBullets ? (
        <ul>
          {callout.items.map((item, i) => (
            <li key={i}>
              <FormattedText text={item.text} />
            </li>
          ))}
        </ul>
      ) : (
        callout.items.map((item, i) => (
          <p key={i}>
            <FormattedText text={item.text} />
          </p>
        ))
      )}
    </div>
  );
}
