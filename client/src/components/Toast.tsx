import type { ToastState } from '../hooks/useToast.js';

// La `key` JSX force le remount à chaque nouveau message (même identique
// redéclenché coup sur coup), ce qui rejoue la transition CSS d'opacité —
// équivalent du classList.add('show') + requestAnimationFrame de l'original.
export function Toast({ state }: { state: ToastState | null }) {
  if (!state) return <div className="toast" />;
  return (
    <div key={state.key} className={`toast show ${state.isError ? 'error' : ''}`}>
      {state.message}
    </div>
  );
}
