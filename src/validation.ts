import type { SetStatusRequestBody, ToggleRequestBody } from './api-types.js';
import { isPlanStatus } from './plan-status.js';

export function isToggleRequestBody(value: unknown): value is ToggleRequestBody {
  if (typeof value !== 'object' || value === null) return false;
  if (!('dir' in value) || !('file' in value) || !('ctId' in value) || !('checked' in value)) {
    return false;
  }
  // Le narrowing de l'opérateur `in` réduit chaque propriété à `unknown` sans cast.
  return (
    typeof value.dir === 'string' &&
    typeof value.file === 'string' &&
    typeof value.ctId === 'string' &&
    typeof value.checked === 'boolean'
  );
}

export function isSetStatusRequestBody(value: unknown): value is SetStatusRequestBody {
  if (typeof value !== 'object' || value === null) return false;
  if (!('dir' in value) || !('file' in value) || !('status' in value)) return false;
  return typeof value.dir === 'string' && typeof value.file === 'string' && isPlanStatus(value.status);
}
