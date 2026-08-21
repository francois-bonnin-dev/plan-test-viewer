import { useCallback, useState } from 'hono/jsx';
import type { DiscoveredDir, Plan } from '../../../src/api-types.js';
import { api } from '../api/client.js';
import { applyToggle, isGroupComplete } from '../lib/apply-toggle.js';
import { centerOf, spawnConfetti } from '../lib/confetti.js';
import { writeLastDir } from '../lib/last-dir.js';
import { getGroupByKey, groupCounts } from '../lib/plan-selectors.js';

export interface UsePlansOptions {
  onToast: (message: string, isError?: boolean) => void;
  confettiLayerRef: { current: HTMLElement | null };
}

export interface LoadDirResult {
  plans: Plan[];
  activeFile: string | null;
}

export function usePlans(opts: UsePlansOptions) {
  const [dir, setDir] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredDir[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Retourne la liste en plus de la publier dans le state : l'amorçage s'en
  // sert comme dernier repli de dossier initial, avant même le premier rendu
  // qui exposerait `discovered`.
  const loadDiscover = useCallback(async (): Promise<DiscoveredDir[]> => {
    const res = await api.discover();
    setDiscovered(res.dirs);
    return res.dirs;
  }, []);

  // Le plan demandé (préféré, typiquement lu depuis l'URL) prime s'il existe
  // encore dans le dossier ; sinon on retombe sur le premier plan de la liste.
  const loadDir = useCallback(async (targetDir: string, preferredPlan?: string | null): Promise<LoadDirResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.scan(targetDir);
      const wanted =
        preferredPlan && res.plans.some((p) => p.fileName === preferredPlan)
          ? preferredPlan
          : res.plans[0]?.fileName ?? null;
      setDir(res.dir);
      setPlans(res.plans);
      setActiveFile(wanted);
      // Mémorisé seulement après un scan réussi, et sous sa forme absolue
      // résolue par le serveur : un chemin invalide ne doit pas se réinstaller
      // au prochain démarrage.
      writeLastDir(res.dir);
      return { plans: res.plans, activeFile: wanted };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPlan = useCallback((fileName: string) => {
    setActiveFile(fileName);
  }, []);

  const toggleCase = useCallback(
    async (ctId: string, checked: boolean, originEl: HTMLElement, chapterKey: string | null): Promise<void> => {
      const currentPlan = plans.find((p) => p.fileName === activeFile);
      if (!currentPlan || !dir) return;

      setPendingIds((prev) => {
        const next = new Set(prev);
        next.add(ctId);
        return next;
      });

      // `chapterKey` est fourni par l'appelant plutôt que déduit du DOM
      // (`.closest('.chapter')`) : le verso peut désormais être validé depuis
      // un overlay qui n'est plus nested dans le chapitre dans le DOM (voir
      // ZoomedCaseOverlay). La recherche du repère visuel (l'en-tête du
      // chapitre pour le gros confetti) passe donc aussi par un sélecteur
      // global plutôt que par une remontée d'ancêtres.
      const groupBefore = chapterKey ? getGroupByKey(currentPlan, chapterKey) : null;
      const wasChapterComplete = groupBefore ? isGroupComplete(groupCounts(groupBefore.cases)) : false;
      const wasPlanComplete = isGroupComplete({ total: currentPlan.stats.total, checked: currentPlan.stats.checked });

      try {
        const res = await api.toggle({ dir, file: currentPlan.fileName, ctId, checked });
        const updatedPlan = applyToggle(currentPlan, ctId, checked, res.stats);
        setPlans((prev) => prev.map((p) => (p.fileName === currentPlan.fileName ? updatedPlan : p)));

        if (checked) {
          const { x, y } = centerOf(originEl);
          if (opts.confettiLayerRef.current) {
            spawnConfetti(opts.confettiLayerRef.current, x, y, { count: 12 });
          }

          const groupAfter = chapterKey ? getGroupByKey(updatedPlan, chapterKey) : null;
          const nowChapterComplete = groupAfter ? isGroupComplete(groupCounts(groupAfter.cases)) : false;
          const chapterJustCompleted = nowChapterComplete && !wasChapterComplete;
          if (chapterJustCompleted && groupAfter) {
            const header = document.querySelector(`.chapter[data-group="${chapterKey}"] .chapter-header`);
            if (header instanceof HTMLElement && opts.confettiLayerRef.current) {
              const pos = centerOf(header);
              spawnConfetti(opts.confettiLayerRef.current, pos.x, pos.y, { count: 28, big: true });
            }
            opts.onToast(`Chapitre « ${groupAfter.title} » terminé !`);
          }

          const nowPlanComplete = isGroupComplete({ total: updatedPlan.stats.total, checked: updatedPlan.stats.checked });
          if (nowPlanComplete && !wasPlanComplete) {
            if (opts.confettiLayerRef.current) {
              spawnConfetti(opts.confettiLayerRef.current, window.innerWidth / 2, 70, {
                count: 70,
                big: true,
                spread: 200,
              });
            }
            opts.onToast(`Plan « ${updatedPlan.title} » terminé à 100 % !`);
          } else if (!chapterJustCompleted) {
            opts.onToast(`${ctId} validé — enregistré dans ${currentPlan.fileName}`);
          }
        } else {
          opts.onToast(`${ctId} remis à refaire — enregistré dans ${currentPlan.fileName}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        opts.onToast(`Échec de l'enregistrement : ${message}`, true);
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(ctId);
          return next;
        });
      }
    },
    [plans, activeFile, dir, opts]
  );

  const activePlan = plans.find((p) => p.fileName === activeFile) ?? null;

  return {
    dir,
    discovered,
    plans,
    activeFile,
    activePlan,
    loading,
    error,
    pendingIds,
    loadDiscover,
    loadDir,
    selectPlan,
    toggleCase,
  };
}
