import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const appRoot = resolve(import.meta.dirname, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };

export function evaluatorServer({ assets = resolve(appRoot, 'benchmarks') } = {}) {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const asset = pathname.startsWith('/benchmarks/');
      const root = asset ? resolve(assets) : appRoot;
      const relative = asset ? pathname.slice('/benchmarks/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = resolve(root, relative);
      if (!file.startsWith(`${root}${sep}`) || !types[extname(file)]) { response.writeHead(404); response.end(); return; }
      const actual = await realpath(file);
      const actualRoot = await realpath(root);
      if (!actual.startsWith(`${actualRoot}${sep}`)) { response.writeHead(404); response.end(); return; }
      const data = await readFile(actual);
      response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (error) {
      if (request.url === '/benchmarks/index.json' && error.code === 'ENOENT') {
        response.writeHead(200, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ protocolVersion: 1, runs: [] }));
      } else { response.writeHead(404); response.end('Not found'); }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.EVAL_PORT ?? 43110);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('EVAL_PORT must be from 1 to 65535.');
  const host = process.env.EVAL_HOST ?? '127.0.0.1';
  const server = evaluatorServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Evaluation app: http://${host}:${port}`));
}
