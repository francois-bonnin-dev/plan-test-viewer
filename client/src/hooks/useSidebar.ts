import { useCallback, useEffect, useState } from 'hono/jsx';

// Doit rester aligné sur le point de rupture de public/styles.css où la barre
// latérale devient un tiroir superposé.
const DRAWER_QUERY = '(max-width: 820px)';
const STORAGE_KEY = 'tpv-sidebar-open';

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

// Deux états distincts : sur grand écran, la liste repliée est une préférence
// durable ; en mode tiroir, elle se ferme par défaut et après chaque choix de
// plan, sans écraser la préférence du grand écran.
export function useSidebar() {
  const [isDrawer, setIsDrawer] = useState(() => window.matchMedia(DRAWER_QUERY).matches);
  const [pinnedOpen, setPinnedOpen] = useState(readStoredOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(DRAWER_QUERY);
    const onChange = (ev: MediaQueryListEvent) => {
      setIsDrawer(ev.matches);
      setDrawerOpen(false);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(pinnedOpen));
    } catch {
      /* idem : confort uniquement */
    }
  }, [pinnedOpen]);

  const toggle = useCallback(() => {
    if (isDrawer) setDrawerOpen((v) => !v);
    else setPinnedOpen((v) => !v);
  }, [isDrawer]);

  const close = useCallback(() => {
    if (isDrawer) setDrawerOpen(false);
    else setPinnedOpen(false);
  }, [isDrawer]);

  // Ne referme que le tiroir : sur grand écran, choisir un plan laisse la liste ouverte.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return { isDrawer, isOpen: isDrawer ? drawerOpen : pinnedOpen, toggle, close, closeDrawer };
}
