import fs from 'node:fs/promises';
import path from 'node:path';
import { parsePlanDeTest } from './parser.js';
import type { BrowseResponse, DiscoveredDir, Plan } from './api-types.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.nx', '.yarn', 'dist', 'build', '.next', 'coverage']);
const PLAN_FRONTMATTER_RE = /^type:\s*plan-de-test/m;

// Le dossier des plans peut être choisi librement dans l'UI (via /api/browse),
// y compris en dehors du dépôt initial : outil local, mono-utilisateur, sans
// exposition réseau. On résout simplement le chemin (relatif au dépôt par
// défaut, ou absolu tel quel) sans le contraindre à une racine fixe.
export function resolveDir(dir: string | undefined, repoRoot: string): string {
  if (!dir || dir === 'null' || dir === 'undefined') return repoRoot;
  return path.isAbsolute(dir) ? path.resolve(dir) : path.resolve(repoRoot, dir);
}

async function listMarkdownFiles(absDir: string): Promise<string[]> {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md')
    .map((e) => e.name)
    .sort();
}

export async function scanDir(relDir: string | undefined, repoRoot: string): Promise<Plan[]> {
  const absDir = resolveDir(relDir, repoRoot);
  const files = await listMarkdownFiles(absDir);
  const plans: Plan[] = [];
  for (const fileName of files) {
    const raw = await fs.readFile(path.join(absDir, fileName), 'utf8');
    if (!PLAN_FRONTMATTER_RE.test(raw)) continue;
    plans.push(parsePlanDeTest(raw, fileName));
  }
  plans.sort((a, b) => (a.meta.ticket || a.title).localeCompare(b.meta.ticket || b.title));
  return plans;
}

async function hasPlanFile(absDir: string): Promise<boolean> {
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
      if (PLAN_FRONTMATTER_RE.test(raw)) return true;
    } catch {
      /* fichier illisible ignoré */
    }
  }
  return false;
}

export async function discoverPlanFolders(repoRoot: string): Promise<DiscoveredDir[]> {
  const found: DiscoveredDir[] = [];
  let visited = 0;

  async function walk(absDir: string, depth: number): Promise<void> {
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
      if (e.isFile() && e.name.endsWith('.md') && !hasPlan) {
        try {
          const raw = await fs.readFile(path.join(absDir, e.name), 'utf8');
          if (PLAN_FRONTMATTER_RE.test(raw)) hasPlan = true;
        } catch {
          /* fichier illisible ignoré */
        }
      }
    }
    if (hasPlan && path.basename(absDir) !== '_templates') {
      found.push({ rel: path.relative(repoRoot, absDir) || '.', abs: absDir });
    }
    for (const e of entries) {
      if (e.isDirectory() && !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.')) {
        await walk(path.join(absDir, e.name), depth + 1);
      }
    }
  }

  await walk(repoRoot, 0);
  return found;
}

export async function browseDir(reqPath: string | undefined, repoRoot: string): Promise<BrowseResponse> {
  const effectivePath = reqPath && reqPath.length > 0 ? reqPath : repoRoot;
  const abs = path.resolve(effectivePath);
  const stat = await fs.stat(abs);
  if (!stat.isDirectory()) throw new Error("Chemin choisi n'est pas un dossier.");

  const entries = await fs.readdir(abs, { withFileTypes: true });
  const dirs: BrowseResponse['dirs'] = [];
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
