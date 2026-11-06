import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createT3Source, T3Error } from './t3.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const COMMON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function send(response, status, type, body, head = false) {
  response.writeHead(status, {
    ...COMMON_HEADERS,
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(head ? undefined : body);
}

function json(response, status, body) {
  send(response, status, 'application/json; charset=utf-8', JSON.stringify(body));
}

export function makeServer({ getStatus, distDir }) {
  return createServer({ requestTimeout: 10_000, headersTimeout: 5_000 }, async (request, response) => {
    const port = request.socket.localPort;
    // Reject forged/foreign Host headers (including DNS-rebinding requests).
    const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!allowedHosts.includes(request.headers.host) ||
        (request.headers.origin && !allowedHosts.some((host) => request.headers.origin === 'http://' + host)) ||
        request.headers['sec-fetch-site'] === 'cross-site') {
      return json(response, 403, { error: 'Local use only.' });
    }

    let path;
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new Error();
      path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (path.includes('\\') || path.includes('\0') || path.split('/').some((part) => part.startsWith('.'))) {
        throw new Error();
      }
    } catch {
      return json(response, 400, { error: 'Invalid path.' });
    }
    if (!['GET', 'HEAD'].includes(request.method) || (path === '/api/status' && request.method !== 'GET')) {
      return json(response, 405, { error: 'Read-only.' });
    }
    if (path === '/api/status') {
      try {
        return json(response, 200, await getStatus());
      } catch (error) {
        if (error instanceof T3Error) {
          return json(response, error.reason === 'auth' ? 403 : 502, { error: error.message });
        }
        return json(response, 502, { error: 'T3 status is unavailable.' });
      }
    }
    const target = resolve(distDir, '.' + (path === '/' ? '/index.html' : path));
    const type = Object.hasOwn(TYPES, extname(target)) && TYPES[extname(target)];
    if (!type || !target.startsWith(distDir + sep)) {
      return json(response, 404, { error: 'Not found.' });
    }
    try {
      const actual = await realpath(target);
      if (!actual.startsWith(distDir + sep)) return json(response, 404, { error: 'Not found.' });
      send(response, 200, type, await readFile(actual), request.method === 'HEAD');
    } catch {
      json(response, 404, { error: 'Not found. Build the app first.' });
    }
  });
}

async function readBearer() {
  if (process.stdin.isTTY) {
    throw new Error('Pipe a read-only bearer directly from the T3 CLI; see bridge/README.md.');
  }
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4098) throw new Error('Expected only one scoped T3 bearer on standard input.');
  }
  return input.trim();
}

async function start() {
  const port = Number(process.env.BRIDGE_PORT ?? 4174);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error('BRIDGE_PORT must be between 1024 and 65535.');
  }
  const distDir = await realpath(fileURLToPath(new URL('../app/dist', import.meta.url))).catch(() => {
    throw new Error('Build the Even app first: npm --prefix app run build.');
  });
  const getStatus = createT3Source({
    baseUrl: process.env.T3_BASE_URL ?? 'http://127.0.0.1:3773',
    bearer: await readBearer(),
  });
  const server = makeServer({ getStatus, distDir });
  server.once('error', () => {
    process.exitCode = 1;
    process.stderr.write('Could not listen on the local bridge port. Choose a free BRIDGE_PORT.\n');
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Local read-only preview: http://127.0.0.1:${port}/?source=t3\n`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
