import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { makeServer } from './server.mjs';
import { createT3Source, localT3Origin, projectSnapshot, T3Error } from './t3.mjs';

const fixtureToken = 'fictional-test-bearer-never-issued-by-t3';
const now = '2026-11-06T05:00:00.000Z';
const exact = { authenticated: true, permissions: ['orchestration:read'] };

function thread(id, status, overrides = {}) {
  return { id, status, title: id, providerInstanceId: 'codex', updatedAt: now, ...overrides };
}

async function serve(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return 'http://127.0.0.1:' + server.address().port;
}

function reply(response, data, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(data));
}

test('loopback upstream only; credentials in the URL are refused', () => {
  assert.equal(localT3Origin('http://127.0.0.1:3773'), 'http://127.0.0.1:3773');
  assert.equal(localT3Origin('https://[::1]:3773'), 'https://[::1]:3773');
  for (const value of [
    'http://example.com:3773',
    'http://localhost:3773',
    'http://user:password@127.0.0.1',
    'http://127.0.0.1/rewrite',
    'http://127.0.0.1/?token=secret',
    'http://127.0.0.1/#secret',
  ]) assert.throws(() => localT3Origin(value));
});

test('projects only glanceable fields; ranks interruptions first and never includes archived or raw metadata', () => {
  const { agents } = projectSnapshot({
    projects: [{ cwd: '/private/project' }],
    archivedThreads: [thread('archive', 'running')],
    threads: [
      thread('completed-id', 'completed', { title: 'Done', latestVisibleMessage: { text: 'private' } }),
      thread('progress-id', 'preparing', { title: 'Build', providerInstanceId: 'claude', worktreePath: '/private/path' }),
      thread('approval-id', 'running', { title: 'Review\u202e\n change', pendingRuntimeRequest: { blocking: true } }),
      thread('optional-id', 'running', { title: 'Optional', pendingRuntimeRequest: { blocking: false }, updatedAt: '2026-11-06T05:01:00Z' }),
      thread('waiting-id', 'waiting', { title: 'Waiting for subagent', blockedOnThreadWait: true }),
      thread('error-id', 'failed', { title: 'Retry later', providerInstanceId: 'private-instance-name', lastError: 'private error details' }),
      thread('archived-id', 'running', { archivedAt: now }),
      thread('deleted-id', 'running', { deletedAt: now }),
      thread('progress-id', 'running', { title: 'Duplicate' }),
    ],
  });
  assert.deepEqual(agents.map(({ id, ...rest }) => {
    assert.match(id, /^[0-9a-f]{24}$/);
    return rest;
  }), [
    { title: 'Review change', provider: 'Codex', status: 'attention' },
    { title: 'Retry later', provider: 'Other agent', status: 'error' },
    { title: 'Optional', provider: 'Codex', status: 'running' },
    { title: 'Build', provider: 'Claude Code', status: 'running' },
    { title: 'Waiting for subagent', provider: 'Codex', status: 'running' },
    { title: 'Done', provider: 'Codex', status: 'complete' },
  ]);
  assert.equal(projectSnapshot({ threads: Array.from({ length: 50 }, (_, i) => thread('😀'.repeat(75) + i, 'idle')) }).agents.length, 12);
  assert.equal(Array.from(projectSnapshot({ threads: [thread('😀'.repeat(75), 'idle')] }).agents[0].title).length, 72);
  assert.throws(() => projectSnapshot({ threads: [{ title: 'Unexpected old server shape' }] }), T3Error);
});

test('uses only two fixed GETs, coalesces a poll, denies broad/revoked credentials before status', async (t) => {
  let auth = exact;
  const seen = [];
  const baseUrl = await serve(t, createServer((req, res) => {
    seen.push([req.method, req.url, req.headers.authorization, req.headers['x-t3-orchestration-protocol']]);
    if (req.url === '/api/auth/session') return reply(res, auth);
    return reply(res, { threads: [thread('example-id', 'queued')] });
  }));
  const getStatus = createT3Source({ baseUrl, bearer: fixtureToken });
  const first = getStatus();
  assert.equal(getStatus(), first);
  assert.equal((await first).agents[0].status, 'running');
  assert.deepEqual(seen, [
    ['GET', '/api/auth/session', 'Bearer ' + fixtureToken, '2'],
    ['GET', '/api/orchestration/shell?omitIdleSubagents=1&omitOlderSettled=1', 'Bearer ' + fixtureToken, '2'],
  ]);

  auth = { ...exact, permissions: ['orchestration:read', 'terminal:operate'], scopes: ['orchestration:read'] };
  await assert.rejects(getStatus(), { reason: 'auth' });
  assert.equal(seen.length, 3);

  auth = { ...exact, permissions: [], scopes: ['orchestration:read'] };
  await assert.rejects(getStatus(), { reason: 'auth' });
  assert.equal(seen.length, 4);

  auth = { authenticated: false };
  await assert.rejects(getStatus(), { reason: 'auth' });
  assert.equal(seen.length, 5);

  auth = { ...exact, permissions: null, scopes: ['orchestration:read'] };
  await assert.rejects(getStatus(), { reason: 'auth' });
  assert.equal(seen.length, 6);

  auth = { authenticated: true, scopes: ['orchestration:read'] };
  assert.equal((await getStatus()).agents.length, 1);
  assert.equal(seen.length, 8);
});

test('fails without following upstream redirects or returning upstream data/errors', async (t) => {
  let mode = 'redirect';
  let redirected = false;
  const baseUrl = await serve(t, createServer((req, res) => {
    if (req.url === '/api/auth/session') {
      if (mode === 'redirect') {
        res.writeHead(302, { Location: '/redirect-target' });
        return res.end();
      }
      if (mode === 'timeout') return;
      return reply(res, exact);
    }
    if (req.url === '/redirect-target') redirected = true;
    if (mode === 'size') return reply(res, { error: 'X'.repeat(5 * 1024 * 1024) });
    return reply(res, { error: 'secret from upstream' });
  }));
  const source = createT3Source({ baseUrl, bearer: fixtureToken, timeoutMs: 500 });
  await assert.rejects(source(), { reason: 'transport' });
  assert.equal(redirected, false);
  mode = 'malformed';
  await assert.rejects(source(), { reason: 'response', message: 'T3 returned an unsupported response.' });
  mode = 'size';
  await assert.rejects(source(), { reason: 'response' });
  mode = 'timeout';
  await assert.rejects(source(), { reason: 'transport' });
});

test('loopback status rejects writes, foreign sites and forged Host, and serves only built assets', async (t) => {
  const temp = await mkdtemp(join(tmpdir(), 'even-bridge-test-'));
  const distDir = await realpath(temp);
  t.after(() => rm(temp, { recursive: true, force: true }));
  await writeFile(join(distDir, 'index.html'), '<main>HUD</main>');
  await symlink(process.execPath, join(distDir, 'outside.js'));
  let calls = 0;
  const server = makeServer({ getStatus: async () => { calls++; return { agents: [] }; }, distDir });
  const url = await serve(t, server);
  const html = await fetch(url + '/?source=t3');
  assert.equal(html.status, 200);
  assert.equal(await html.text(), '<main>HUD</main>');
  const data = await fetch(url + '/api/status');
  assert.equal(data.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await data.json(), { agents: [] });

  assert.equal((await fetch(url + '/api/status', { method: 'POST' })).status, 405);
  assert.equal((await fetch(url + '/api/status', { headers: { Origin: 'https://somewhere.invalid' } })).status, 403);
  assert.equal((await fetch(url + '/outside.js')).status, 404);
  assert.equal(await new Promise((resolve, reject) => {
    const req = request(url + '/api/status', { headers: { Host: 'rebind.invalid:' + server.address().port } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  }), 403);
  assert.equal(calls, 1);
});
