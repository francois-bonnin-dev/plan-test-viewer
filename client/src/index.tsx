import { render } from 'hono/jsx/dom';
import { App } from './App.js';
import { applyStoredThemeSync } from './hooks/useTheme.js';

// Appel synchrone, avant le premier rendu : un appel équivalent depuis un
// useEffect s'exécuterait après le premier paint et introduirait un flash de
// thème qui n'existe pas dans l'app actuelle.
applyStoredThemeSync();

const root = document.getElementById('root');
if (root) {
  render(<App />, root);
}
