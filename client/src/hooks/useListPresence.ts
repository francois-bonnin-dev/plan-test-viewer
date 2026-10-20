import { useEffect, useRef, useState } from 'hono/jsx';

export type PresencePhase = 'enter' | 'idle' | 'leave';

export interface PresenceEntry<T> {
  key: string;
  item: T;
  phase: PresencePhase;
  since: number;
}

// Garde à l'écran, le temps de leur animation de sortie, les éléments qui
// viennent de quitter `items`, et marque ceux qui viennent d'y entrer. La
// fusion est faite pendant le rendu, pas dans un effet : un élément retiré ne
// doit pas disparaître une frame avant de revenir en phase de sortie.
//
// `resetKey` : quand il change (autre dossier), la liste est remplacée d'un
// bloc, sans animation — faire sortir puis entrer tous les plans serait du bruit.
export function useListPresence<T>(
  items: T[],
  getKey: (item: T) => string,
  durationMs: number,
  resetKey: unknown
): PresenceEntry<T>[] {
  const prevRef = useRef<PresenceEntry<T>[]>([]);
  const resetKeyRef = useRef<unknown>(resetKey);
  const [, setTick] = useState(0);

  const now = Date.now();
  const expired = (e: PresenceEntry<T>) => now - e.since >= durationMs;
  const reset = resetKeyRef.current !== resetKey || prevRef.current.length === 0;
  resetKeyRef.current = resetKey;

  const prev = reset ? [] : prevRef.current.filter((e) => !(e.phase === 'leave' && expired(e)));
  const prevByKey = new Map(prev.map((e) => [e.key, e]));
  const currentKeys = new Set(items.map(getKey));
  const next: PresenceEntry<T>[] = [];
  const placed = new Set<string>();

  const place = (item: T) => {
    const key = getKey(item);
    placed.add(key);
    const before = prevByKey.get(key);
    if (reset) next.push({ key, item, phase: 'idle', since: now });
    else if (!before || before.phase === 'leave') next.push({ key, item, phase: 'enter', since: now });
    else next.push({ ...before, item, phase: before.phase === 'enter' && expired(before) ? 'idle' : before.phase });
  };

  // Fusion ordonnée : un élément sortant reste à sa place d'origine, entre
  // ses voisins encore présents.
  let i = 0;
  for (const entry of prev) {
    if (placed.has(entry.key)) continue;
    if (!currentKeys.has(entry.key)) {
      next.push(entry.phase === 'leave' ? entry : { ...entry, phase: 'leave', since: now });
      continue;
    }
    while (i < items.length) {
      const item = items[i++];
      if (item === undefined) break;
      if (!placed.has(getKey(item))) place(item);
      if (getKey(item) === entry.key) break;
    }
  }
  for (; i < items.length; i++) {
    const item = items[i];
    if (item !== undefined && !placed.has(getKey(item))) place(item);
  }
  prevRef.current = next;

  // Un seul minuteur, calé sur la prochaine transition à solder ; le rendu
  // qu'il provoque retire les sortants et repasse les entrants au repos.
  const pending = next.filter((e) => e.phase !== 'idle');
  const nextDue = pending.length ? Math.min(...pending.map((e) => e.since + durationMs)) : null;
  useEffect(() => {
    if (nextDue === null) return;
    const timer = window.setTimeout(() => setTick((t) => t + 1), Math.max(0, nextDue - Date.now()) + 20);
    return () => window.clearTimeout(timer);
  }, [nextDue]);

  return next;
}
