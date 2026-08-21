#!/usr/bin/env node
// Visualiseur local de plans de test — outil générique, réutilisable dans
// n'importe quel projet qui documente ses plans de test au format
// "plan-de-test" (frontmatter `type: plan-de-test`, cas `- [ ] **CT-01 — ...**`).
//
// Zéro dépendance : http + fs natifs. Lancer depuis le projet cible :
//   node ~/projects/tools/plan-test-viewer/server.mjs [--dir docs/plans-de-test] [--port 4545]
// Les chemins relatifs (--dir, dossier choisi dans l'UI) se résolvent par
// rapport au répertoire courant (process.cwd()), pas à l'emplacement du script.

import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parsePlanDeTest, toggleCase } from './lib/parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const PORT = Number(argValue('port', process.env.PORT || 4545));
const DEFAULT_DIR = argValue('dir', 'docs/plans-de-test');

// Racine autorisée pour toutes les lectures/écritures : le dépôt Git (working
// tree) qui contient réellement --dir, résolu depuis process.cwd(). Si ce
// n'est pas un dépôt Git, on se limite au dossier cible lui-même.
const initialAbsDir = path.isAbsolute(DEFAULT_DIR) ? DEFAULT_DIR : path.resolve(process.cwd(), DEFAULT_DIR);
function gitToplevel(dir) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' }).trim();
  } catch {
    return dir;
  }
}
const REPO_ROOT = existsSync(initialAbsDir) ? gitToplevel(initialAbsDir) : gitToplevel(process.cwd());

const IGNORED_DIRS = new Set(['node_modules', '.git', '.nx', '.yarn', 'dist', 'build', '.next', 'coverage']);

// Le dossier des plans peut être choisi librement dans l'UI (via /api/browse),
// y compris en dehors du dépôt initial : outil local, mono-utilisateur, sans
// exposition réseau. On résout simplement le chemin (relatif au dépôt par
// défaut, ou absolu tel quel) sans le contraindre à une racine fixe.
function resolveDir(dir) {
  if (!dir || dir === 'null' || dir === 'undefined') return REPO_ROOT;
  return path.isAbsolute(dir) ? path.resolve(dir) : path.resolve(REPO_ROOT, dir);
}

async function listMarkdownFiles(absDir) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md')
    .map((e) => e.name)
    .sort();
}

async function scanDir(relDir) {
  const absDir = resolveDir(relDir);
  const files = await listMarkdownFiles(absDir);
  const plans = [];
  for (const fileName of files) {
    const raw = await fs.readFile(path.join(absDir, fileName), 'utf8');
    if (!/^type:\s*plan-de-test/m.test(raw)) continue;
    plans.push(parsePlanDeTest(raw, fileName));
  }
  plans.sort((a, b) => (a.meta.ticket || a.title).localeCompare(b.meta.ticket || b.title));
  return plans;
}

async function discoverPlanFolders() {
  const found = [];
  let visited = 0;
  async function walk(absDir, depth) {
    if (depth > 6 || visited > 20000) return;
    let entries;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    let hasPlan = false;
    for (const e of entries) {
      visited++;
      if (e.isFile() && e.name.endsWith('.md')) {
        if (!hasPlan) {
          try {
            const raw = await fs.readFile(path.join(absDir, e.name), 'utf8');
            if (/^type:\s*plan-de-test/m.test(raw)) hasPlan = true;
          } catch {
            /* ignore unreadable file */
          }
        }
      }
    }
    if (hasPlan && path.basename(absDir) !== '_templates') {
      found.push({ rel: path.relative(REPO_ROOT, absDir) || '.', abs: absDir });
    }
    for (const e of entries) {
      if (e.isDirectory() && !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.')) {
        await walk(path.join(absDir, e.name), depth + 1);
      }
    }
  }
  await walk(REPO_ROOT, 0);
  return found;
}

async function hasPlanFile(absDir) {
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    try {
      const raw = await fs.readFile(path.join(absDir, e.name), 'utf8');
      if (/^type:\s*plan-de-test/m.test(raw)) return true;
    } catch {
      /* ignore unreadable file */
    }
  }
  return false;
}

async function browseDir(reqPath) {
  const abs = path.resolve(reqPath || REPO_ROOT);
  const stat = await fs.stat(abs);
  if (!stat.isDirectory()) throw new Error('Chemin choisi n\'est pas un dossier.');
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const dirs = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || IGNORED_DIRS.has(e.name)) continue;
    const full = path.join(abs, e.name);
    dirs.push({ name: e.name, path: full, hasPlans: await hasPlanFile(full) });
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const parent = path.dirname(abs);
  return {
    path: abs,
    parent: parent !== abs ? parent : null,
    hasPlans: await hasPlanFile(abs),
    dirs,
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const abs = path.join(PUBLIC_DIR, rel);
  if (!abs.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function sendJson(res, status, obj) {
  const data = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(data);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/config') {
      return sendJson(res, 200, { defaultDir: DEFAULT_DIR, repoRoot: REPO_ROOT });
    }
    if (url.pathname === '/api/discover') {
      const dirs = await discoverPlanFolders();
      return sendJson(res, 200, { dirs });
    }
    if (url.pathname === '/api/browse') {
      const dir = await browseDir(url.searchParams.get('path'));
      return sendJson(res, 200, dir);
    }
    if (url.pathname === '/api/scan') {
      const dir = url.searchParams.get('dir') || DEFAULT_DIR;
      const plans = await scanDir(dir);
      return sendJson(res, 200, { dir: resolveDir(dir), plans });
    }
    if (url.pathname === '/api/toggle' && req.method === 'POST') {
      const { dir, file, ctId, checked } = await readJsonBody(req);
      const absDir = resolveDir(dir);
      const absFile = path.join(absDir, file);
      if (!absFile.startsWith(absDir) || !existsSync(absFile)) {
        return sendJson(res, 404, { error: 'Fichier introuvable' });
      }
      const raw = await fs.readFile(absFile, 'utf8');
      const updated = toggleCase(raw, ctId, checked);
      if (updated === null) {
        return sendJson(res, 400, { error: `Cas ${ctId} introuvable dans ${file}` });
      }
      await fs.writeFile(absFile, updated, 'utf8');
      const plan = parsePlanDeTest(updated, file);
      return sendJson(res, 200, { ok: true, stats: plan.stats });
    }
    return await serveStatic(req, res, url.pathname);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Visualiseur de plans de test — ${url}`);
  console.log(`Dépôt : ${REPO_ROOT}`);
  console.log(`Dossier par défaut : ${DEFAULT_DIR}`);
});
