import { strict as assert } from "node:assert";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.argv[2] ?? 9898);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535, "invalid automation port");
const base = `http://127.0.0.1:${port}`;

async function request(path, body) {
  const response = await fetch(base + path, {
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response;
}

async function retry(test, description) {
  const deadline = Date.now() + 20_000;
  do {
    try { const result = await test(); if (result) return result; } catch { /* simulator may still be starting */ }
    await delay(200);
  } while (Date.now() < deadline);
  throw new Error(`Simulator did not reach ${description}`);
}

async function screenshot() {
  const bytes = Buffer.from(await (await request("/api/screenshot/glasses")).arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), 576);
  assert.equal(bytes.readUInt32BE(20), 288);
  return bytes;
}

async function transition(action, previous) {
  await request("/api/input", { action });
  return retry(async () => {
    const current = await screenshot();
    if (current.equals(previous)) return false;
    await delay(250);
    return current.equals(await screenshot()) ? current : false;
  }, action);
}

await retry(async () => {
  const log = await (await request("/api/console")).json();
  return log.entries.some(({ message }) => message.includes("[agent-relay] ready"));
}, "Agent Relay startup");
await delay(350);
const list = await screenshot();
const testsSelected = await transition("down", list);
const detail = await transition("click", testsSelected);
await delay(500);
const firstConfirmation = await transition("click", detail);
const expired = await retry(async () => {
  const image = await screenshot();
  return !image.equals(firstConfirmation) ? image : false;
}, "confirmation expiry without an input");
assert.notDeepEqual(expired, detail, "expiry should display the expiry notice");
const confirmation = await transition("click", expired);
assert.deepEqual(confirmation, firstConfirmation, "a new press after expiry must request confirmation again");
const back = await transition("double_click", confirmation);
assert.deepEqual(back, detail, "cancelled confirmation should return to the unchanged thread");
await delay(500);
const listAgain = await transition("double_click", back);
assert.deepEqual(listAgain, testsSelected, "back should preserve thread selection");
await delay(500);
const detailAgain = await transition("click", listAgain);
await delay(500);
const secondConfirmation = await transition("click", detailAgain);
await delay(500);
const running = await transition("click", secondConfirmation);
const complete = await retry(async () => {
  const image = await screenshot();
  return !image.equals(running) ? image : false;
}, "demo completion");
const finalList = await transition("double_click", complete);
await delay(500);
await transition("double_click", finalList);
console.log("Official Even Hub simulator: framebuffer, swipe, press, expiry, cancel, simulated run, back and exit checks passed.");
