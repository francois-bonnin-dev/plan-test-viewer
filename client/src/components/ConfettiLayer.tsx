import type { RefObject } from 'hono/jsx';

export function ConfettiLayer({ layerRef }: { layerRef: RefObject<HTMLDivElement | null> }) {
  return <div ref={layerRef} className="confetti-layer" aria-hidden="true" />;
}
