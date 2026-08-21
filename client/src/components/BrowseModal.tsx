import { Fragment } from 'hono/jsx';
import { buildBreadcrumb } from '../lib/browse-path.js';
import type { useBrowseModal } from '../hooks/useBrowseModal.js';

export interface BrowseModalProps {
  browse: ReturnType<typeof useBrowseModal>;
  onSelect: (path: string) => void;
}

export function BrowseModal({ browse, onSelect }: BrowseModalProps) {
  const crumbs = browse.path ? buildBreadcrumb(browse.path) : [];
  // Le bouton reste désactivé après une erreur : `path` repasse à null et rien
  // ne le réactive avant une navigation réussie — comportement identique à
  // l'ancien setBrowseSelectable, ici dérivé plutôt que piloté impérativement.
  const selectDisabled = browse.loading || browse.path === null;

  return (
    <div
      className="modal-overlay"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) browse.close();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="browse-title">
        <div className="modal-header">
          <h2 id="browse-title">Choisir un dossier de plans de test</h2>
          <button type="button" className="modal-close" title="Fermer" onClick={browse.close}>
            ✕
          </button>
        </div>

        <div className="breadcrumb">
          {crumbs.map((c, i) => (
            <Fragment key={String(i)}>
              <button type="button" className="crumb" onClick={() => void browse.navigate(c.path)}>
                {c.label}
              </button>
              {i < crumbs.length - 1 && <span className="crumb-sep">›</span>}
            </Fragment>
          ))}
        </div>

        <div className="browse-list">
          {browse.loading && <div className="browse-loading">Chargement…</div>}
          {!browse.loading && (
            <>
              {browse.parent && (
                <button
                  type="button"
                  className="browse-row browse-row-up"
                  onClick={() => browse.parent && void browse.navigate(browse.parent)}
                >
                  <span>← Dossier parent</span>
                </button>
              )}
              {browse.dirs.map((d) => (
                <button
                  key={d.path}
                  type="button"
                  className={`browse-row ${d.hasPlans ? 'has-plans' : ''}`}
                  onClick={() => void browse.navigate(d.path)}
                >
                  <span>{d.name}</span>
                  {d.hasPlans && <span className="browse-tag">plans détectés</span>}
                </button>
              ))}
              {!browse.parent && browse.dirs.length === 0 && (
                <div className="browse-empty">Aucun sous-dossier.</div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <span className="browse-current">{browse.path ?? ''}</span>
          <button
            type="button"
            className="btn-primary"
            disabled={selectDisabled}
            onClick={() => browse.path && onSelect(browse.path)}
          >
            Sélectionner ce dossier
          </button>
        </div>
      </div>
    </div>
  );
}
