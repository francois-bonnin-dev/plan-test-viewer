const STORAGE_KEY = 'tpv-last-dir';

// Le dossier courant vit d'abord dans l'URL (?dir=), qui prime toujours : c'est
// elle qui porte un lien partagé comme un simple rechargement. Ce miroir en
// localStorage ne sert qu'au premier chargement d'un onglet neuf, sans
// paramètre — sans lui l'app retomberait sur --dir, qui pointe souvent
// ailleurs que le dossier réellement utilisé la dernière fois.
export function readLastDir(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v !== null && v.length > 0 ? v : null;
  } catch {
    return null; /* stockage indisponible (navigation privée) */
  }
}

export function writeLastDir(dir: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dir);
  } catch {
    /* idem : la mémorisation est un confort, pas une exigence */
  }
}
