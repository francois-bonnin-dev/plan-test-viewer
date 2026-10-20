import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import type {
  ApiErrorResponse,
  BrowseResponse,
  ConfigResponse,
  DiscoverResponse,
  ScanResponse,
  SetStatusSuccessResponse,
  ToggleSuccessResponse,
} from './api-types.js';
import { browseDir, discoverPlanFolders, resolveDir, scanDir } from './fs-explorer.js';
import { parsePlanDeTest, setPlanStatus, toggleCase } from './parser.js';
import { autoStatusFor } from './plan-status.js';
import { createStaticFileHandler } from './static-files.js';
import { isSetStatusRequestBody, isToggleRequestBody } from './validation.js';

export interface AppDeps {
  defaultDir: string;
  repoRoot: string;
  publicDir: string;
}

export function createApp(deps: AppDeps): Hono {
  const { defaultDir, repoRoot, publicDir } = deps;
  const app = new Hono();

  app.get('/api/config', (c) => {
    const response: ConfigResponse = { defaultDir, repoRoot };
    return c.json(response);
  });

  app.get('/api/discover', async (c) => {
    const dirs = await discoverPlanFolders(repoRoot);
    const response: DiscoverResponse = { dirs };
    return c.json(response);
  });

  app.get('/api/browse', async (c) => {
    const browsed = await browseDir(c.req.query('path'), repoRoot);
    const response: BrowseResponse = browsed;
    return c.json(response);
  });

  app.get('/api/scan', async (c) => {
    const dir = c.req.query('dir') ?? defaultDir;
    const plans = await scanDir(dir, repoRoot);
    const response: ScanResponse = { dir: resolveDir(dir, repoRoot), plans };
    return c.json(response);
  });

  // Seul garde-fou anti-traversal d'écriture — partagé par les deux routes
  // d'écriture (/api/toggle et /api/status), qui résolvent leur fichier
  // exactement de la même façon. Retourne null quand le chemin sort du dossier
  // ou que le fichier n'existe pas.
  function resolvePlanFile(dir: string, file: string): string | null {
    const absDir = resolveDir(dir, repoRoot);
    const absFile = path.join(absDir, file);
    if (!absFile.startsWith(absDir) || !existsSync(absFile)) return null;
    return absFile;
  }

  app.post('/api/toggle', async (c) => {
    const rawBody: unknown = await c.req.json();
    if (!isToggleRequestBody(rawBody)) {
      const error: ApiErrorResponse = { error: 'Corps de requête invalide' };
      return c.json(error, 400);
    }
    const { dir, file, ctId, checked } = rawBody;

    const absFile = resolvePlanFile(dir, file);
    if (absFile === null) {
      const error: ApiErrorResponse = { error: 'Fichier introuvable' };
      return c.json(error, 404);
    }

    const raw = await readFile(absFile, 'utf8');
    const updated = toggleCase(raw, ctId, checked);
    if (updated === null) {
      const error: ApiErrorResponse = { error: `Cas ${ctId} introuvable dans ${file}` };
      return c.json(error, 400);
    }

    // Le statut suit l'avancement dans la même écriture que la case : le
    // fichier n'est jamais vu avec une case cochée et un statut périmé.
    const toggled = parsePlanDeTest(updated, file);
    const nextStatus = autoStatusFor(toggled.meta.status, toggled.stats);
    const final = nextStatus === null ? updated : setPlanStatus(updated, nextStatus) ?? updated;

    await writeFile(absFile, final, 'utf8');
    const plan = final === updated ? toggled : parsePlanDeTest(final, file);
    const response: ToggleSuccessResponse = { ok: true, stats: plan.stats, status: plan.meta.status };
    return c.json(response);
  });

  app.post('/api/status', async (c) => {
    const rawBody: unknown = await c.req.json();
    if (!isSetStatusRequestBody(rawBody)) {
      const error: ApiErrorResponse = { error: 'Corps de requête invalide' };
      return c.json(error, 400);
    }
    const { dir, file, status } = rawBody;

    const absFile = resolvePlanFile(dir, file);
    if (absFile === null) {
      const error: ApiErrorResponse = { error: 'Fichier introuvable' };
      return c.json(error, 404);
    }

    const raw = await readFile(absFile, 'utf8');
    const updated = setPlanStatus(raw, status);
    if (updated === null) {
      const error: ApiErrorResponse = { error: `${file} n'a pas de frontmatter à mettre à jour` };
      return c.json(error, 400);
    }

    await writeFile(absFile, updated, 'utf8');
    const response: SetStatusSuccessResponse = { ok: true, status };
    return c.json(response);
  });

  app.onError((err, c) => {
    const error: ApiErrorResponse = { error: err.message };
    return c.json(error, 500);
  });

  // `app.all` (pas `app.get`) : l'ancien serveur servait un fichier statique
  // pour toute requête dont le chemin ne correspondait à aucune route API,
  // quelle que soit la méthode HTTP — comportement reproduit à l'identique.
  app.all('*', createStaticFileHandler(publicDir));

  return app;
}
