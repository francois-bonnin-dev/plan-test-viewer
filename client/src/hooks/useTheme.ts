import { useCallback } from 'hono/jsx';

type ThemeValue = 'light' | 'dark';

const STORAGE_KEY = 'tpv-theme';

function isThemeValue(v: string | null): v is ThemeValue {
  return v === 'light' || v === 'dark';
}

// Appelé de façon SYNCHRONE dans index.tsx, avant le premier rendu — un appel
// depuis un useEffect s'exécuterait après le premier paint et introduirait un
// flash qui n'existe pas dans l'app actuelle.
export function applyStoredThemeSync(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isThemeValue(stored)) {
    document.documentElement.setAttribute('data-theme', stored);
  }
}

// Cycle à 3 états : système -> clair forcé -> sombre forcé -> système.
export function useTheme() {
  const cycle = useCallback(() => {
    const current = document.documentElement.getAttribute('data-theme');
    const next: ThemeValue | null = current === 'dark' ? 'light' : current === 'light' ? null : 'dark';
    if (next) {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { cycle };
}
