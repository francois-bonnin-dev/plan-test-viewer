import { useCallback, useRef } from 'hono/jsx';

function scrollKey(dir: string | null, activeFile: string | null): string {
  return `tpv-scroll:${dir}:${activeFile}`;
}

// Le scroll vit EXCLUSIVEMENT en sessionStorage, jamais dans l'URL : l'y écrire
// la réécrirait à chaque image de défilement et la rendrait illisible.
export function useScrollPersistence(dir: string | null, activeFile: string | null) {
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // `resetTop` déclenche un event `scroll` natif et asynchrone ; s'il aboutit
  // encore sous l'ancien fichier actif, il écraserait la position sauvegardée
  // de CE fichier avec 0. Un drapeau one-shot ignore ce rebond fantôme.
  const suppressNextRef = useRef(false);

  // Un événement `scroll` tire à chaque frame de défilement : on ne persiste
  // qu'une fois par frame via requestAnimationFrame plutôt qu'à chaque event.
  const save = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (suppressNextRef.current) {
        suppressNextRef.current = false;
        return;
      }
      const el = ref.current;
      if (!activeFile || !el) return;
      try {
        sessionStorage.setItem(scrollKey(dir, activeFile), String(el.scrollTop));
      } catch {
        /* stockage indisponible (navigation privée) : la position est simplement perdue */
      }
    });
  }, [dir, activeFile]);

  const restore = useCallback(() => {
    const el = ref.current;
    if (!activeFile || !el) return;
    try {
      const v = sessionStorage.getItem(scrollKey(dir, activeFile));
      if (v !== null) el.scrollTop = Number(v) || 0;
    } catch {
      /* idem */
    }
  }, [dir, activeFile]);

  const resetTop = useCallback(() => {
    if (ref.current) {
      suppressNextRef.current = true;
      ref.current.scrollTop = 0;
    }
  }, []);

  return { ref, save, restore, resetTop };
}
