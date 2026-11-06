// Transport checked against T3 Code v0.1.7 (see README for pinned contracts).
import { createHash } from 'node:crypto';

const SESSION = '/api/auth/session';
const SNAPSHOT = '/api/orchestration/shell?omitIdleSubagents=1&omitOlderSettled=1';
const SCOPE = 'orchestration:read';
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const ACTIVE = new Set(['queued', 'preparing', 'starting', 'running']);
const IDLE = new Set(['idle', 'cancelled', 'interrupted', 'rolled_back']);
const PROVIDERS = new Map([
  ['codex', 'Codex'],
  ['claude', 'Claude Code'],
  ['antigravity', 'Antigravity'],
  ['opencode', 'OpenCode'],
  ['cursor', 'Cursor'],
  ['grok', 'Grok'],
]);
const PRIORITY = { attention: 0, error: 1, running: 2, complete: 3, idle: 4 };
const FAILURE = {
  auth: 'T3 authorization is invalid, expired, revoked, or not read-only.',
  transport: 'T3 is unavailable on the configured local address.',
  response: 'T3 returned an unsupported response.',
};

export class T3Error extends Error {
  constructor(reason) {
    super(FAILURE[reason]);
    this.reason = reason;
  }
}

export function localT3Origin(raw) {
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) {
    throw new Error('T3_BASE_URL must be a numeric loopback origin, e.g. http://127.0.0.1:3773');
  }
  return url.origin;
}

async function readJson(response) {
  if (!response.body || !response.headers.get('content-type')?.startsWith('application/json')) {
    void response.body?.cancel().catch(() => {});
    throw new T3Error('response');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_RESPONSE_BYTES) {
        void reader.cancel().catch(() => {});
        throw new T3Error('response');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof T3Error) throw error;
    throw new T3Error('response');
  } finally {
    reader.releaseLock();
  }
}

function assertReadOnly(session) {
  const grants = session && Object.hasOwn(session, 'permissions')
    ? session.permissions
    : session?.scopes;
  // permissions is the exact grant when supplied; scopes is the legacy projection.
  if (session?.authenticated !== true ||
      !Array.isArray(grants) || grants.length !== 1 || grants[0] !== SCOPE) {
    throw new T3Error('auth');
  }
}

function safeTitle(raw) {
  const clean = raw.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ' ').replace(/\s+/g, ' ').trim();
  const symbols = Array.from(clean);
  return symbols.length > 72 ? symbols.slice(0, 71).join('') + '…' : clean || 'Untitled thread';
}

function statusFor(thread) {
  if (thread.pendingRuntimeRequest?.blocking !== false && thread.pendingRuntimeRequest != null) {
    return 'attention';
  }
  if (thread.hasActionableProposedPlan || thread.pendingGuestMessageCount > 0) return 'attention';
  if (thread.status === 'failed') return 'error';
  if (thread.status === 'waiting') return thread.blockedOnThreadWait ? 'running' : 'attention';
  if (ACTIVE.has(thread.status)) return 'running';
  if (thread.status === 'completed') return 'complete';
  if (IDLE.has(thread.status)) return 'idle';
  throw new T3Error('response');
}

export function projectSnapshot(snapshot) {
  if (!Array.isArray(snapshot?.threads)) throw new T3Error('response');
  const seen = new Set();
  const rows = [];
  for (const thread of snapshot.threads) {
    if (!thread || typeof thread.id !== 'string' || !thread.id ||
        typeof thread.title !== 'string' || typeof thread.providerInstanceId !== 'string' ||
        typeof thread.status !== 'string' || typeof thread.updatedAt !== 'string' ||
        !Number.isFinite(Date.parse(thread.updatedAt))) {
      throw new T3Error('response');
    }
    if (thread.archivedAt != null || thread.deletedAt != null || seen.has(thread.id)) continue;
    seen.add(thread.id);
    rows.push({
      id: createHash('sha256').update(thread.id).digest('hex').slice(0, 24),
      title: safeTitle(thread.title),
      provider: PROVIDERS.get(thread.providerInstanceId) ?? 'Other agent',
      status: statusFor(thread),
      updated: Date.parse(thread.updatedAt),
    });
  }
  return {
    agents: rows
      .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.updated - a.updated)
      .slice(0, 12)
      .map(({ id, title, provider, status }) => ({ id, title, provider, status })),
  };
}

export function createT3Source({ baseUrl, bearer, timeoutMs = 5_000 }) {
  const origin = localT3Origin(baseUrl);
  if (typeof bearer !== 'string' || !/^[a-zA-Z0-9._~+/-]{20,4096}={0,2}$/.test(bearer)) {
    throw new Error('Provide one scoped T3 bearer on standard input.');
  }

  async function get(path, signal) {
    let response;
    try {
      response = await fetch(origin + path, {
        signal,
        redirect: 'error',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + bearer,
          'X-T3-Orchestration-Protocol': '2',
        },
      });
    } catch {
      throw new T3Error('transport');
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new T3Error([401, 403].includes(response.status) ? 'auth' : 'response');
    }
    return readJson(response);
  }

  // Coalesce simultaneous refreshes but never serve a cached snapshot after a
  // revoked token or a failed fetch. Verify the effective grant on each refresh.
  let pending;
  return function getStatus() {
    if (!pending) {
      const signal = AbortSignal.timeout(timeoutMs);
      pending = (async () => {
        assertReadOnly(await get(SESSION, signal));
        return projectSnapshot(await get(SNAPSHOT, signal));
      })().finally(() => { pending = undefined; });
    }
    return pending;
  };
}
