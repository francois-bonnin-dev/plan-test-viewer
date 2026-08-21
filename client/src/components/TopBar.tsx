import type { DiscoveredDir } from '../../../src/api-types.js';
import { FolderControl } from './FolderControl.js';
import { ThemeToggleButton } from './ThemeToggleButton.js';

export interface TopBarProps {
  dir: string | null;
  discovered: DiscoveredDir[];
  onSelectDir: (dir: string) => void;
  onBrowse: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  onToggleTheme: () => void;
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">CT</span>
        <span className="brand-title">Plans de test</span>
      </div>

      <FolderControl
        dir={props.dir}
        discovered={props.discovered}
        onSelectDir={props.onSelectDir}
        onBrowse={props.onBrowse}
      />

      <div className="search-control">
        <input
          type="search"
          placeholder="Rechercher un ticket, un titre, un tag…"
          value={props.query}
          onInput={(ev) => {
            const target = ev.target;
            if (target instanceof HTMLInputElement) props.onQueryChange(target.value);
          }}
        />
      </div>

      <ThemeToggleButton onClick={props.onToggleTheme} />
    </header>
  );
}
