import { formatInline } from '../lib/format.js';

// Seule utilisation de dangerouslySetInnerHTML de tout le client : le HTML est
// construit par formatInline(), qui échappe d'abord tout le texte, puis ne
// réintroduit qu'un jeu de balises fixe (br, span.wikilink, code, strong, em).
// Le contenu vient exclusivement de fichiers Markdown locaux de l'utilisateur,
// pas d'une source réseau/tierce — pas de risque XSS réaliste dans ce contexte
// outil-perso. Isolée ici pour rester auditable en un coup d'œil.
export function FormattedText({ text, tag = 'span' }: { text: string; tag?: 'span' | 'p' }) {
  const Tag = tag;
  return <Tag dangerouslySetInnerHTML={{ __html: formatInline(text) }} />;
}
