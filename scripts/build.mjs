#!/usr/bin/env node
// Build de production : compile le serveur (tsc -> dist/) et bundle le client
// (esbuild -> public/build/app.js), dans cet ordre (le client ne dépend pas
// du serveur compilé, mais autant échouer vite si le serveur ne type-check pas).
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

console.log('Compilation du serveur (tsc)…');
execFileSync('npx', ['tsc', '-p', 'tsconfig.server.json'], { stdio: 'inherit' });

console.log('Bundle du client (esbuild)…');
await esbuild.build({
  entryPoints: ['client/src/index.tsx'],
  bundle: true,
  outfile: 'public/build/app.js',
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx/dom',
  target: ['es2022'],
  minify: true,
  sourcemap: true,
});

console.log('Build terminé.');
