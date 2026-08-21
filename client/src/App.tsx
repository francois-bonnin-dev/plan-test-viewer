import { useCallback, useEffect, useRef, useState } from 'hono/jsx';
import { api } from './api/client.js';
import { BrowseModal } from './components/BrowseModal.js';
import { ConfettiLayer } from './components/ConfettiLayer.js';
import { DetailPane } from './components/DetailPane.js';
import { Sidebar } from './components/Sidebar.js';
import { Toast } from './components/Toast.js';
import { TopBar } from './components/TopBar.js';
import { useBrowseModal } from './hooks/useBrowseModal.js';
import { useCollapsedGroups } from './hooks/useCollapsedGroups.js';
import { usePlans } from './hooks/usePlans.js';
import { useScrollPersistence } from './hooks/useScrollPersistence.js';
import { useTheme } from './hooks/useTheme.js';
import { useToast } from './hooks/useToast.js';
import { useUrlState } from './hooks/useUrlState.js';
import { useZoomedCase } from './hooks/useZoomedCase.js';
import { findCase } from './lib/plan-selectors.js';

export function App() {
  const theme = useTheme();
  const toast = useToast();
  const url = useUrlState();
  const collapsed = useCollapsedGroups();
  const confettiLayerRef = useRef<HTMLDivElement | null>(null);
  const plans = usePlans({ onToast: toast.show, confettiLayerRef });
  const zoomed = useZoomedCase(plans.activePlan, collapsed.expand);
  const browse = useBrowseModal({ onToast: toast.show });
  const scroll = useScrollPersistence(plans.dir, plans.activeFile);
  const [query, setQuery] = useState('');

  // Chargement initial en deux étapes plutôt qu'un requestAnimationFrame :
  // ouvrir le cas demandé par l'URL déclenche un re-rendu (dépli éventuel du
  // chapitre) dont le commit DOM n'est pas garanti synchrone. `caseOpened`
  // sépare donc "cas ouvert" de "scroll restauré" en deux passes d'effet —
  // le second effect ne s'exécute qu'après le rendu qui suit le premier.
  const [caseOpened, setCaseOpened] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await api.config();
      const targetDir = url.boot.dir ?? config.defaultDir;
      await plans.loadDiscover();
      const result = await plans.loadDir(targetDir, url.boot.plan);
      if (cancelled) return;

      const activePlanData = result.plans.find((p) => p.fileName === result.activeFile) ?? null;
      const bootCt = url.boot.ct;
      if (bootCt && activePlanData && findCase(activePlanData, bootCt)) {
        zoomed.open(bootCt);
      }
      setCaseOpened(true);
    })().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.show(`Erreur de chargement : ${message}`, true);
    });
    return () => {
      cancelled = true;
    };
    // Montage unique volontaire : `plans`/`url`/`zoomed`/`toast` sont des
    // objets de hooks stables en identité de méthodes (useCallback), le
    // tableau de dépendances vide reflète bien "au chargement, une fois".
  }, []);

  useEffect(() => {
    if (!caseOpened) return;
    scroll.restore();
    setReady(true);
  }, [caseOpened]);

  // Écrit l'URL : effet dérivé, strictement unidirectionnel (state -> URL).
  // Gardé par `ready` pour ne jamais écraser les paramètres d'entrée avant
  // qu'ils aient été consommés par l'effet de chargement initial ci-dessus.
  useEffect(() => {
    if (!ready) return;
    url.write({ dir: plans.dir, plan: plans.activeFile, ct: zoomed.zoomedCtId });
  }, [ready, plans.dir, plans.activeFile, zoomed.zoomedCtId]);

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key !== 'Escape') return;
      if (browse.isOpen) browse.close();
      else if (zoomed.zoomedCtId) zoomed.close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [browse.isOpen, zoomed.zoomedCtId]);

  const handleSelectPlan = useCallback(
    (fileName: string) => {
      zoomed.close();
      collapsed.clear();
      plans.selectPlan(fileName);
      scroll.resetTop();
    },
    [plans, zoomed, collapsed, scroll]
  );

  const handleSelectDir = useCallback(
    async (dir: string) => {
      zoomed.close();
      await plans.loadDir(dir);
    },
    [plans, zoomed]
  );

  const handleBrowse = useCallback(() => {
    zoomed.close();
    browse.open(plans.dir ?? '');
  }, [zoomed, browse, plans.dir]);

  const handleBrowseSelect = useCallback(
    async (path: string) => {
      browse.close();
      try {
        await plans.loadDir(path);
        toast.show(`Dossier sélectionné : ${path}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.show(`Échec du chargement du dossier : ${message}`, true);
      }
    },
    [browse, plans, toast]
  );

  return (
    <>
      <TopBar
        dir={plans.dir}
        discovered={plans.discovered}
        onSelectDir={(dir) => void handleSelectDir(dir)}
        onBrowse={handleBrowse}
        query={query}
        onQueryChange={setQuery}
        onToggleTheme={theme.cycle}
      />
      <div className="layout">
        <Sidebar
          plans={plans.plans}
          activeFile={plans.activeFile}
          loading={plans.loading}
          error={plans.error}
          query={query}
          onSelect={handleSelectPlan}
        />
        <DetailPane
          plan={plans.activePlan}
          collapsed={collapsed.collapsed}
          onToggleCollapse={collapsed.toggle}
          onOpenCase={(ctId) => zoomed.open(ctId)}
          zoomed={zoomed}
          pendingIds={plans.pendingIds}
          onToggleCase={plans.toggleCase}
          onToast={toast.show}
          scrollRef={scroll.ref}
          onScroll={scroll.save}
        />
      </div>

      <Toast state={toast.state} />
      <ConfettiLayer layerRef={confettiLayerRef} />
      {zoomed.zoomedCtId && <div className="case-backdrop" onClick={zoomed.close} />}
      {browse.isOpen && <BrowseModal browse={browse} onSelect={(path) => void handleBrowseSelect(path)} />}
    </>
  );
}
