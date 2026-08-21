import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export interface AppConfig {
  port: number;
  defaultDir: string;
  repoRoot: string;
}

function argValue(args: string[], name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  const next = i !== -1 ? args[i + 1] : undefined;
  return next ? next : fallback;
}

// Racine autorisée pour la découverte de dossiers : le dépôt Git (working
// tree) qui contient réellement --dir, résolu depuis cwd. Si ce n'est pas un
// dépôt Git, on se limite au dossier cible lui-même. Appel synchrone et
// potentiellement bloquant assumé — outil local, mono-utilisateur.
function gitToplevel(dir: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' }).trim();
  } catch {
    return dir;
  }
}

export function resolveConfig(argv: string[], cwd: string): AppConfig {
  const port = Number(argValue(argv, 'port', process.env.PORT ?? '4545'));
  const defaultDir = argValue(argv, 'dir', 'docs/plans-de-test');

  const initialAbsDir = path.isAbsolute(defaultDir) ? defaultDir : path.resolve(cwd, defaultDir);
  const repoRoot = existsSync(initialAbsDir) ? gitToplevel(initialAbsDir) : gitToplevel(cwd);

  return { port, defaultDir, repoRoot };
}
