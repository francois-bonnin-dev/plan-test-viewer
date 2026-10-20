import type { SetStatusRequestBody, ToggleRequestBody } from '../../../src/api-types.js';
import {
  isBrowseResponse,
  isConfigResponse,
  isDiscoverResponse,
  isRecord,
  isScanResponse,
  isSetStatusSuccessResponse,
  isToggleSuccessResponse,
} from './guards.js';

async function apiFetch<T>(pathname: string, guard: (v: unknown) => v is T, init?: RequestInit): Promise<T> {
  const res = await fetch(pathname, init);
  // Annotation explicite en `unknown` : c'est ce geste qui empêche le `any`
  // implicite de `Response.json()` de se propager plus loin dans le code.
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = isRecord(body) && typeof body.error === 'string' ? body.error : `Erreur HTTP ${res.status}`;
    throw new Error(message);
  }
  if (!guard(body)) {
    throw new Error(`Réponse inattendue de ${pathname}`);
  }
  return body;
}

export const api = {
  config: () => apiFetch('/api/config', isConfigResponse),
  discover: () => apiFetch('/api/discover', isDiscoverResponse),
  browse: (path: string) => apiFetch(`/api/browse?path=${encodeURIComponent(path)}`, isBrowseResponse),
  scan: (dir: string) => apiFetch(`/api/scan?dir=${encodeURIComponent(dir)}`, isScanResponse),
  toggle: (body: ToggleRequestBody) =>
    apiFetch('/api/toggle', isToggleSuccessResponse, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  setStatus: (body: SetStatusRequestBody) =>
    apiFetch('/api/status', isSetStatusSuccessResponse, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};
