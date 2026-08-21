import { useCallback, useState } from 'hono/jsx';

export interface UrlState {
  dir: string | null;
  plan: string | null;
  ct: string | null;
}

function readUrlState(): UrlState {
  const p = new URLSearchParams(location.search);
  return { dir: p.get('dir'), plan: p.get('plan'), ct: p.get('ct') };
}

export function useUrlState() {
  // Lazy initializer exécuté une seule fois : garantit que `boot` ne peut pas
  // être écrasé par un re-render ultérieur (équivalent direct du
  // `const boot = readUrlState()` au chargement du module dans l'ancien app.js).
  const [boot] = useState<UrlState>(() => readUrlState());

  // Flux strictement unidirectionnel state -> URL : aucun listener popstate
  // n'est installé, donc `write` ne peut jamais redéclencher indirectement
  // l'effet qui l'appelle (pas de risque de boucle).
  const write = useCallback((next: UrlState) => {
    const p = new URLSearchParams();
    if (next.dir) p.set('dir', next.dir);
    if (next.plan) p.set('plan', next.plan);
    if (next.ct) p.set('ct', next.ct);
    const qs = p.toString();
    // replaceState, jamais pushState : la navigation Précédent/Suivant ne doit
    // pas empiler l'historique navigateur.
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }, []);

  return { boot, write };
}
