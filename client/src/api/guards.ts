// Type guards `unknown -> T` pour chaque forme de réponse de src/api-types.ts.
// Règle systématique : le retour de `res.json()` est typé `unknown` de façon
// explicite (jamais assigné directement à un type), et ne devient T qu'après
// avoir passé un de ces guards — aucun `as` nulle part dans la couche réseau.
import type {
  BrowseDirEntry,
  BrowseResponse,
  Callout,
  CalloutItem,
  ConfigResponse,
  DiscoveredDir,
  DiscoverResponse,
  DocTable,
  Plan,
  ScanResponse,
  SetStatusSuccessResponse,
  ToggleSuccessResponse,
} from '../../../src/api-types.js';
import { isPlanStatus } from '../../../src/plan-status.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDocTable(value: unknown): value is DocTable {
  if (!isRecord(value)) return false;
  return (
    isStringArray(value.header) &&
    Array.isArray(value.rows) &&
    value.rows.every((row) => isStringArray(row))
  );
}

function isCalloutItem(value: unknown): value is CalloutItem {
  return isRecord(value) && typeof value.text === 'string' && typeof value.bullet === 'boolean';
}

function isCallout(value: unknown): value is Callout {
  if (!isRecord(value)) return false;
  return (
    typeof value.type === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.items) &&
    value.items.every((item) => isCalloutItem(item))
  );
}

function isTestCase(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.checked === 'boolean' &&
    typeof value.title === 'string' &&
    (value.precondition === null || typeof value.precondition === 'string') &&
    (value.steps === null || isDocTable(value.steps))
  );
}

function isChapterGroup(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.title === 'string' &&
    Array.isArray(value.cases) &&
    value.cases.every((c) => isTestCase(c))
  );
}

function isPlan(value: unknown): value is Plan {
  if (!isRecord(value)) return false;
  if (typeof value.fileName !== 'string' || typeof value.title !== 'string') return false;
  if (!isRecord(value.meta) || !isStringArray(value.meta.tags)) return false;
  if (!isRecord(value.info)) return false;
  if (!isRecord(value.stats)) return false;
  if (!Array.isArray(value.groups) || !value.groups.every((g) => isChapterGroup(g))) return false;
  if (value.preRequis !== null && !isRecord(value.preRequis)) return false;
  if (value.couverture !== null && !isDocTable(value.couverture)) return false;
  if (value.nonRegression !== null && !isChapterGroup(value.nonRegression)) return false;
  if (value.limites !== null && !isCallout(value.limites)) return false;
  if (value.anomalies !== null && !isDocTable(value.anomalies)) return false;
  return true;
}

export function isConfigResponse(value: unknown): value is ConfigResponse {
  return isRecord(value) && typeof value.defaultDir === 'string' && typeof value.repoRoot === 'string';
}

function isDiscoveredDir(value: unknown): value is DiscoveredDir {
  return isRecord(value) && typeof value.rel === 'string' && typeof value.abs === 'string';
}

export function isDiscoverResponse(value: unknown): value is DiscoverResponse {
  return isRecord(value) && Array.isArray(value.dirs) && value.dirs.every((d) => isDiscoveredDir(d));
}

function isBrowseDirEntry(value: unknown): value is BrowseDirEntry {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.path === 'string' &&
    typeof value.hasPlans === 'boolean'
  );
}

export function isBrowseResponse(value: unknown): value is BrowseResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === 'string' &&
    (value.parent === null || typeof value.parent === 'string') &&
    typeof value.hasPlans === 'boolean' &&
    Array.isArray(value.dirs) &&
    value.dirs.every((d) => isBrowseDirEntry(d))
  );
}

export function isScanResponse(value: unknown): value is ScanResponse {
  if (!isRecord(value)) return false;
  return typeof value.dir === 'string' && Array.isArray(value.plans) && value.plans.every((p) => isPlan(p));
}

export function isToggleSuccessResponse(value: unknown): value is ToggleSuccessResponse {
  if (!isRecord(value)) return false;
  if (value.ok !== true) return false;
  return (
    isRecord(value.stats) &&
    typeof value.stats.total === 'number' &&
    typeof value.stats.checked === 'number' &&
    typeof value.status === 'string'
  );
}

export function isSetStatusSuccessResponse(value: unknown): value is SetStatusSuccessResponse {
  if (!isRecord(value)) return false;
  return value.ok === true && isPlanStatus(value.status);
}
