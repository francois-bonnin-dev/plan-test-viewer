#!/usr/bin/env node
// Lance en parallèle le serveur (tsx watch) et le bundler client (esbuild
// --watch), pour qu'une seule commande `npm run dev` couvre les deux moitiés
// du projet sans dépendance supplémentaire (pas de `concurrently`).
import { spawn } from 'node:child_process';
import * as esbuild from 'esbuild';

const children = [];

function spawnWatched(command, args) {
  const child = spawn(command, args, { stdio: 'inherit' });
  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

spawnWatched('npx', ['tsx', 'watch', 'src/server.ts']);

const ctx = await esbuild.context({
  entryPoints: ['client/src/index.tsx'],
  bundle: true,
  outfile: 'public/build/app.js',
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx/dom',
  target: ['es2022'],
  sourcemap: true,
  logLevel: 'info',
});
await ctx.watch();
console.log('esbuild : reconstruction automatique du client sur chaque modification.');
