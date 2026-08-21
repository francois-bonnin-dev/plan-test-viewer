export interface RingProps {
  pct: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function Ring({ pct, size = 44, stroke = 5, label }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = c * (1 - clamped / 100);
  const center = size / 2;
  const text = label ?? `${pct}%`;

  return (
    <svg
      className={`ring ${pct >= 100 ? 'ring-complete' : ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle className="ring-track" cx={center} cy={center} r={r} strokeWidth={stroke} fill="none" />
      <circle
        className="ring-fill"
        cx={center}
        cy={center}
        r={r}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c.toFixed(2)}
        strokeDashoffset={offset.toFixed(2)}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x="50%" y="52%" className="ring-label" style={{ fontSize: `${Math.max(9, size * 0.24)}px` }}>
        {text}
      </text>
    </svg>
  );
}
