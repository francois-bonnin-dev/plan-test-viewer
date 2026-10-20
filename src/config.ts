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

// Charge le .env du répertoire courant — celui du projet cible quand l'outil
// est lancé depuis ailleurs, puisque c'est déjà lui qui sert de base à la
// résolution des chemins relatifs. Node donne la priorité à l'environnement
// déjà en place sur le contenu du fichier. Absent ou illisible, il n'y a rien
// à faire : le fichier est un confort, pas une source de configuration requise.
function loadEnvFile(cwd: string): void {
  const envPath = path.join(cwd, '.env');
  if (!existsSync(envPath)) return;
  try {
    process.loadEnvFile(envPath);
  } catch {
    /* syntaxe invalide ou lecture impossible : on garde l'environnement tel quel */
  }
}

// Précédence, du plus fort au plus faible : option CLI, variable
// d'environnement (fournie par le shell ou par le .env), valeur par défaut.
export function resolveConfig(argv: string[], cwd: string): AppConfig {
  loadEnvFile(cwd);

  const port = Number(argValue(argv, 'port', process.env.PORT ?? '4545'));
  const defaultDir = argValue(argv, 'dir', process.env.DIR ?? 'docs/test-plans');

  const initialAbsDir = path.isAbsolute(defaultDir) ? defaultDir : path.resolve(cwd, defaultDir);
  const repoRoot = existsSync(initialAbsDir) ? gitToplevel(initialAbsDir) : gitToplevel(cwd);

  return { port, defaultDir, repoRoot };
}
