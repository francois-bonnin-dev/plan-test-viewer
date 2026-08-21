// navigator.clipboard n'existe qu'en contexte sécurisé (localhost ou https) :
// si l'outil est ouvert via une IP du réseau local, on retombe sur la méthode
// historique (textarea hors écran + execCommand).
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copie refusée par le navigateur');
}
