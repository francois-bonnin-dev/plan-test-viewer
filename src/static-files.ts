import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Context } from 'hono';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8', // sourcemap du bundle client (esbuild)
};

// Handler custom plutôt que `serveStatic` de @hono/node-server : son option
// `root` se résout par rapport à process.cwd(), alors que PUBLIC_DIR doit
// rester relatif à l'emplacement du script (comportement à préserver — voir
// src/server.ts). Anti-traversal et table MIME identiques à l'ancien serveur.
export function createStaticFileHandler(publicDir: string) {
  return async (c: Context): Promise<Response> => {
    const pathname = c.req.path;
    const rel = pathname === '/' ? '/index.html' : pathname;
    const abs = path.join(publicDir, rel);
    if (!abs.startsWith(publicDir)) {
      return c.text('Forbidden', 403);
    }
    try {
      const data = await readFile(abs);
      const ext = path.extname(abs);
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
      return c.body(data, 200, { 'Content-Type': contentType });
    } catch {
      return c.text('Not found', 404);
    }
  };
}
