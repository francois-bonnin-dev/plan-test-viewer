import { useCallback, useMemo, useState } from 'hono/jsx';
import type { Plan } from '../../../src/api-types.js';
import { buildCaseOrder } from '../lib/plan-selectors.js';

export type NavDirection = 'next' | 'prev' | null;

interface ZoomedState {
  ctId: string;
  direction: NavDirection;
}

// Le "verso" est un unique overlay monté au niveau du plan (pas un enfant de
// chaque carte) : contrairement à l'ancienne version, un chapitre replié ne
// peut donc plus jamais le rendre invisible (display:none sur .case-grid).
// On garde néanmoins le dépli automatique ci-dessous, non plus par nécessité
// technique mais pour la continuité UX — à la fermeture, la tuile d'origine
// doit être visible, pas cachée derrière un chapitre encore replié.
export function useZoomedCase(plan: Plan | null, expandChapter: (key: string) => void) {
  const [zoomed, setZoomed] = useState<ZoomedState | null>(null);
  const order = useMemo(() => (plan ? buildCaseOrder(plan) : []), [plan]);

  const open = useCallback(
    (ctId: string, direction: NavDirection = null) => {
      setZoomed((current) => {
        if (current && current.ctId === ctId) return null; // ré-ouvrir = fermer, comme l'original
        const ref = order.find((r) => r.ctId === ctId);
        if (ref) expandChapter(ref.chapterKey);
        return { ctId, direction };
      });
    },
    [order, expandChapter]
  );

  const close = useCallback(() => setZoomed(null), []);

  const goRelative = useCallback(
    (delta: 1 | -1) => {
      if (!zoomed) return;
      const idx = order.findIndex((r) => r.ctId === zoomed.ctId);
      if (idx === -1) return;
      const nextIdx = idx + delta;
      const nextRef = order[nextIdx];
      if (!nextRef) return;
      open(nextRef.ctId, delta > 0 ? 'next' : 'prev');
    },
    [zoomed, order, open]
  );

  const idx = zoomed ? order.findIndex((r) => r.ctId === zoomed.ctId) : -1;

  return {
    zoomedCtId: zoomed?.ctId ?? null,
    direction: zoomed?.direction ?? null,
    isFirst: idx <= 0,
    isLast: idx === -1 || idx === order.length - 1,
    open,
    close,
    prev: () => goRelative(-1),
    next: () => goRelative(1),
  };
}
