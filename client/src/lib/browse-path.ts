export interface Crumb {
  label: string;
  path: string;
}

// Découpage de chemin unix OU windows en miettes de fil d'Ariane cliquables.
export function buildBreadcrumb(p: string): Crumb[] {
  const sep = p.includes('/') ? '/' : '\\';
  const isAbsUnix = p.startsWith('/');
  const parts = p.split(/[\\/]/).filter((part) => part.length > 0);
  const crumbs: Crumb[] = isAbsUnix ? [{ label: '/', path: '/' }] : [];
  let acc = '';
  for (const part of parts) {
    acc = acc ? acc + sep + part : part;
    crumbs.push({ label: part, path: isAbsUnix ? sep + acc.replace(/^\/+/, '') : acc });
  }
  return crumbs;
}
