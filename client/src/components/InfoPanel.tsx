import type { PropsWithChildren } from 'hono/jsx';

export function InfoPanel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <details className="info-panel">
      <summary>{title}</summary>
      <div className="info-panel-body">{children}</div>
    </details>
  );
}
