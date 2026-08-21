import type { DiscoveredDir } from '../../../src/api-types.js';

export interface FolderControlProps {
  dir: string | null;
  discovered: DiscoveredDir[];
  onSelectDir: (dir: string) => void;
  onBrowse: () => void;
}

export function FolderControl({ dir, discovered, onSelectDir, onBrowse }: FolderControlProps) {
  const isCustom = dir !== null && !discovered.some((d) => d.abs === dir);

  return (
    <div className="folder-control">
      <select
        title="Dossiers de plans détectés dans le dépôt courant"
        value={dir ?? ''}
        onChange={(ev) => {
          const target = ev.target;
          if (target instanceof HTMLSelectElement) onSelectDir(target.value);
        }}
      >
        {isCustom && dir !== null && <option value={dir}>{dir}</option>}
        {discovered.map((d) => (
          <option key={d.abs} value={d.abs}>
            {d.rel}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-ghost"
        title="Choisir un dossier n'importe où sur le disque"
        onClick={onBrowse}
      >
        Parcourir…
      </button>
    </div>
  );
}
