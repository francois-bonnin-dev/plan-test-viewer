#!/usr/bin/env node
// Visualiseur local de plans de test — outil générique, réutilisable dans
// n'importe quel projet qui documente ses plans de test au format
// "plan-de-test" (frontmatter `type: plan-de-test`, cas `- [ ] **CT-01 — ...**`).
//
// Lancer depuis le projet cible :
//   node ~/projects/tools/plan-test-viewer/dist/server.js [--dir docs/plans-de-test] [--port 4545]
// Les chemins relatifs (--dir, dossier choisi dans l'UI) se résolvent par
// rapport au répertoire courant (process.cwd()), pas à l'emplacement du script.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { resolveConfig } from './config.js';

// Relatif à l'emplacement du script (src/ en dev via tsx, dist/ en prod via
// tsc), jamais à process.cwd() — comportement à préserver (voir static-files.ts).
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(scriptDir, '..', 'public');

const config = resolveConfig(process.argv.slice(2), process.cwd());
const app = createApp({ defaultDir: config.defaultDir, repoRoot: config.repoRoot, publicDir });

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Visualiseur de plans de test — http://localhost:${info.port}`);
  console.log(`Dépôt : ${config.repoRoot}`);
  console.log(`Dossier par défaut : ${config.defaultDir}`);
});

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
