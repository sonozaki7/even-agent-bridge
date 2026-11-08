# Local T3 Code status bridge

This optional bridge lets the local Agent Relay preview show **real, read-only thread status** from a T3 Code server on the same computer. It uses the same T3 environment as the mobile client, not the mobile client's stored credentials. Neither the bridge nor the app can run a command, send a prompt, approve work, or open a thread on T3 Code. The wearable package defaults to a fictional demo and includes no network permission.

## Run locally

Requirements: Node.js 22+, a running [T3 Code v0.1.7](https://github.com/pingdotgg/t3code/releases/tag/v0.1.7) server accessible on a numeric loopback address, and T3's `t3` command on that computer. You do not need to expose a port or change your existing T3 mobile pairing. If you run T3 with a custom data directory, add `--base-dir /path/to/its/data` to the auth commands so the session is issued by the correct environment.

From the repository root:

```sh
npm --prefix app ci
npm --prefix app run build

# Adjust 3773 to the port of your existing local T3 server.
# Paste the command, not a token: the CLI sends the secret through the pipe.
t3 auth session issue --scope orchestration:read --ttl 1h --label 'Agent Relay preview' --token-only |
  T3_BASE_URL=http://127.0.0.1:3773 node bridge/server.mjs
```

Open [the preview](http://127.0.0.1:4174/?source=t3). The `?source=t3` is an explicit choice to show live status; without it the app shows fictional data. This origin can also be opened on the same computer with the Even Hub simulator. If the bridge port is already in use, set `BRIDGE_PORT` on the right side of the pipeline and use the printed address.

Use a fresh, short-lived token when it expires. To revoke access sooner, identify the labeled session with `t3 auth session list`, then use `t3 auth session revoke <id>` or revoke it in T3's connection settings. Stop the local bridge with Ctrl+C. Do not save or paste the bearer token into a URL, the app, an environment file, or shell arguments.

## What data moves

The bridge sends two fixed GET requests to the local T3 server:

- `/api/auth/session` verifies that the credential has exactly `orchestration:read`. Over-privileged credentials are refused, even if the read scope is also present.
- `/api/orchestration/shell` reads a light thread-status snapshot with protocol version 2. No full transcript is fetched.

The only response sent to the preview contains up to 12 current, non-archived threads: an opaque row ID, display title, provider label, and status. It omits message text, paths, errors, project metadata, raw IDs and tokens. Thread titles can still contain private information; use an empty or non-sensitive T3 environment for a shared demonstration. Threads that need input appear above routine work, even when an agent can keep working while it waits for an answer. Custom provider instances with unknown IDs show as “Other agent.” The bridge does not cache live data; unavailable or revoked access returns an error, not pretend live data.

The bridge binds only to `127.0.0.1`, refuses foreign browser origins and Host headers, and does not issue permissive cross-origin headers. It is not a multi-user web service and has no client login because it is a local tool. **Do not expose it via port forwarding, a public tunnel, or a reverse proxy.** A physical phone cannot reach the computer's loopback address. Live wearable use would need a separately authenticated private connection, a fixed HTTPS origin allowed in the Even manifest, and a device test. T3 mobile remains the full-control surface; any future ring actions would need an explicit confirmed workflow and narrower authority than generic agent control.

## Verification and contract

Run `npm --prefix bridge test`. Tests use local fixtures only. They cover status mapping, limiting data, unauthorized or broad grants, blocking network writes and foreign browser origins, timeout and malformed upstream responses, and refusing redirects. The read-only flow was also smoke-tested against an isolated installation of T3 Code v0.1.7: the bridge served the app and returned an empty real environment snapshot, then denied the next request after that session was revoked. No provider was started and no G2 or R1 hardware was involved.

Pinned sources from T3 Code v0.1.7, commit `322f6544dfad0a3c8a0c8cbecf2c7f7874b14268`:

- [HTTP routes and payloads](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/packages/contracts/src/environmentHttp.ts)
- [Orchestration protocol header](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/packages/contracts/src/environment.ts)
- [Session response and effective permissions](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/packages/contracts/src/auth.ts)
- [Thread summary fields and statuses](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/packages/contracts/src/orchestrationV2.ts)
- [Server-side read-scope check](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/apps/server/src/orchestration-v2/http.ts)
- [Mobile app source](https://github.com/pingdotgg/t3code/tree/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/apps/mobile) and [MIT license](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/LICENSE)
- [Even Hub network permissions](https://hub.evenrealities.com/docs/build/networking) and [hardware setup](https://hub.evenrealities.com/docs/get-started/quickstart/hardware)
