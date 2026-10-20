import type { DiscoveredDir } from '../../../src/api-types.js';
import { FolderControl } from './FolderControl.js';
import { ThemeToggleButton } from './ThemeToggleButton.js';

export interface TopBarProps {
  dir: string | null;
  discovered: DiscoveredDir[];
  onSelectDir: (dir: string) => void;
  onBrowse: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="sidebar-toggle"
        title={props.sidebarOpen ? 'Masquer la liste des plans' : 'Afficher la liste des plans'}
        aria-controls="plan-sidebar"
        // En chaîne : hono/jsx retire l'attribut quand il reçoit le booléen false.
        aria-expanded={String(props.sidebarOpen)}
        onClick={props.onToggleSidebar}
      >
        ☰
      </button>

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

      <ThemeToggleButton onClick={props.onToggleTheme} />
    </header>
  );
}
