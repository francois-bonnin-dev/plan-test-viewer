import type { ToggleRequestBody } from './api-types.js';

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
