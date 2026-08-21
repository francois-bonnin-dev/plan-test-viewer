// Helper DOM impératif, pas du JSX réactif : modéliser 14 à 70 particules
// éphémères en state forcerait un re-render à chaque particule créée/détruite
// pour zéro bénéfice (elles ne participent à aucune logique d'app) — cas
// d'usage canonique du pattern "ref + code impératif" plutôt que déclaratif.
const CONFETTI_EMOJI = ['🎉', '✨', '⭐', '🎊', '💥', '🌟', '🏅'];

export interface ConfettiOptions {
  count?: number;
  spread?: number;
  big?: boolean;
}

export function spawnConfetti(layer: HTMLElement, x: number, y: number, opts: ConfettiOptions = {}): void {
  const count = opts.count ?? 14;
  const spread = opts.spread ?? 130;
  const big = opts.big ?? false;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'confetti-piece';
    const emoji = CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)];
    span.textContent = emoji ?? '🎉';
    const angle = ((Math.random() * spread - spread / 2) * Math.PI) / 180 - Math.PI / 2;
    const dist = (big ? 120 : 50) + Math.random() * (big ? 220 : 100);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = (Math.random() * 720 - 360).toFixed(0);
    const size = (big ? 18 : 13) + Math.random() * (big ? 16 : 9);
    const duration = 700 + Math.random() * 500;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.fontSize = `${size}px`;
    span.style.animationDuration = `${duration}ms`;
    span.style.setProperty('--dx', `${dx}px`);
    span.style.setProperty('--dy', `${dy}px`);
    span.style.setProperty('--rot', `${rot}deg`);
    span.addEventListener('animationend', () => span.remove());
    layer.appendChild(span);
  }
}

export function centerOf(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
