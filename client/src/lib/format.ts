export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mini-formatteur markdown maison : 5 passes `.replace()` séquentielles sur la
// sortie de la précédente (échappement, puis <br>, wikilinks, code, gras,
// italique). Le chaînage a des effets de bord volontaires ou fortuits (ex. un
// wikilink contenant **x** sera quand même mis en gras par la passe
// suivante) — port fidèle de l'algorithme d'origine, ne pas réordonner.
export function formatInline(raw: string): string {
  if (!raw) return '';
  let s = escapeHtml(raw);
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  // Paramètres annotés explicitement en `string` : sans ça, le type du
  // callback de `String.prototype.replace` retombe sur `any[]` (signature de
  // la lib TypeScript), seule fuite de `any` restante dans ce fichier sinon.
  s = s.replace(
    /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    (_match: string, _target: string, label: string) => `<span class="wikilink">${label}</span>`
  );
  s = s.replace(
    /\[\[([^\]]+)\]\]/g,
    (_match: string, target: string) => `<span class="wikilink">${target}</span>`
  );
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}
