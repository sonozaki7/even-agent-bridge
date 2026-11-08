import { strict as assert } from "node:assert";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { build, createServer, preview } from "vite";

const widths = [320, 375, 390, 768, 1024, 1440];
const app = await createServer({ server: { host: "127.0.0.1", port: 0 } });
let browser;
let deviceServer;
let deviceDir;
try {
  await app.listen();
  const base = app.resolvedUrls.local[0];
  const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browserChoice = process.env.PLAYWRIGHT_BROWSER_CHANNEL ??
    (await access(localChrome).then(() => "chrome").catch(() => undefined));
  browser = await chromium.launch({ channel: browserChoice, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(7_000);
  const expectText = (selector, text, active = page) =>
    active.waitForFunction(([selector, text]) =>
      document.querySelector(selector)?.textContent?.includes(text), [selector, text]);

  async function layout(name) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 880 });
      const breaches = await page.evaluate(() => {
        const issues = [];
        if (document.documentElement.scrollWidth > window.innerWidth) issues.push("page overflow");
        for (const selector of [".console", ".display", ".controls"]) {
          const parent = document.querySelector(selector);
          const a = parent.getBoundingClientRect();
          for (const child of parent.querySelectorAll("*")) {
            const b = child.getBoundingClientRect();
            if (b.left < a.left - 1 || b.right > a.right + 1 || b.top < a.top - 1 || b.bottom > a.bottom + 1) {
              issues.push(`${selector} > ${child.id || child.tagName}`);
            }
            if (child.scrollWidth > child.clientWidth + 1) issues.push(`clipped text: ${child.id || child.tagName}`);
          }
        }
        return issues;
      });
      assert.deepEqual(breaches, [], `${name} at ${width}px`);
    }
  }

  const apiCalls = [];
  let feed = "offline";
  await page.route("**/api/status", async (route) => {
    apiCalls.push(route.request().method());
    if (feed === "offline") return route.fulfill({ status: 503, json: { error: "offline" } });
    if (feed === "empty") return route.fulfill({ json: { agents: [] } });
    return route.fulfill({ json: { agents: [
      { id: "test", title: "W".repeat(155), provider: "W".repeat(36), status: "attention" },
    ] } });
  });

  await page.goto(base);
  await expectText("#display-body", "Build interface");
  await layout("demo list");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "View thread" }).press("Enter");
  await expectText("#display-body", "Tests complete. Next step?");
  await page.getByRole("button", { name: "Run final checks" }).click();
  await layout("demo confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expectText("#display-body", "Tests complete. Next step?");
  await page.getByRole("button", { name: "Run final checks" }).click();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expectText("#display-body", "Confirmation cancelled");
  assert.equal(await page.getByRole("button", { name: "Confirm demo" }).count(), 0);
  await page.getByRole("button", { name: "Run final checks" }).click();
  await page.getByRole("button", { name: "Confirm demo" }).click();
  await expectText("#display-body", "final checks started");
  await expectText("#display-body", "final checks complete");
  assert.deepEqual(apiCalls, []);

  await page.goto(`${base}?source=t3`);
  await expectText("#display-kicker", "RELAY OFFLINE");
  await layout("offline status");
  feed = "empty";
  await expectText("#display-body", "No T3 Code threads");
  await layout("empty relay");
  feed = "long";
  await expectText("#display-body", "WWWWWW");
  await layout("long thread list");
  await page.getByRole("button", { name: "View thread" }).click();
  await expectText("#display-body", "Needs attention");
  await layout("long read-only detail");
  assert.equal(await page.getByRole("button", { name: "View only" }).isDisabled(), true);
  assert.equal(await page.getByText("Run final checks").count(), 0);
  assert.ok(apiCalls.length > 0 && apiCalls.every((method) => method === "GET"));
  await page.close();

  // Exercise the actual pinned JS SDK in a separate headless page, mocking only the
  // native Flutter host transport. This does not validate the actual simulator or G2.
  const native = await browser.newPage();
  native.setDefaultTimeout(7_000);
  await native.addInitScript(() => {
    window.bridgeCalls = [];
    window.rejectTextUpdates = false;
    window.flutter_inappwebview = {
      callHandler: async (handler, raw) => {
        const message = JSON.parse(raw);
        window.bridgeCalls.push({ handler, ...message });
        if (message.method === "createStartUpPageContainer") return 0;
        if (message.method === "textContainerUpgrade" && window.rejectTextUpdates) return false;
        return true;
      },
    };
  });
  const emit = (type, jsonData) => native.evaluate(
    ({ type, jsonData }) => window._listenEvenAppMessage({
      type: "listen_even_app_data", method: "evenHubEvent", data: { type, jsonData },
    }),
    { type, jsonData },
  );
  // Test the compiled device-only build, including a deliberate relay query.
  deviceDir = await mkdtemp(join(tmpdir(), "agent-relay-device-"));
  await build({ mode: "evenhub", build: { outDir: deviceDir }, logLevel: "error" });
  deviceServer = await preview({ build: { outDir: deviceDir }, preview: { host: "127.0.0.1", port: 0 } });
  const deviceUrl = deviceServer.resolvedUrls.local[0];
  let deviceRequests = 0;
  await native.route("**/api/status", (route) => { deviceRequests++; return route.abort(); });
  await native.goto(`${deviceUrl}?source=t3`);
  await expectText("#display-heading", "DEMO", native);
  assert.equal(await native.locator("#mode-link").isHidden(), true);
  await expectText("#host-status", "Even Hub connected", native);
  const startup = (await native.evaluate(() => window.bridgeCalls))[0];
  assert.equal(startup.handler, "evenAppMessage");
  assert.equal(startup.method, "createStartUpPageContainer");
  assert.equal(startup.data.containerTotalNum, 4);
  assert.equal(startup.data.textObject.filter((container) => container.isEventCapture === 1).length, 1);

  await emit("textEvent", { containerID: 3, containerName: "body", eventType: 2 });
  await expectText("#display-body", "> Run tests", native);
  await emit("textEvent", { containerID: 3, containerName: "body" });
  await expectText("#display-body", "Tests complete. Next step?", native);
  await delay(500);
  await emit("sysEvent", { eventSource: 2 }); // R1 press with the zero event type omitted
  await expectText("#display-kicker", "SIMULATED ACTION", native);
  await emit("sysEvent", { eventSource: 2 }); // duplicate must not confirm
  await expectText("#display-kicker", "SIMULATED ACTION", native);
  await native.evaluate(() => { window.rejectTextUpdates = true; });
  await emit("sysEvent", { eventType: 4 }); // Even's contextual menu takes over the display
  await expectText("#display-body", "Confirmation cancelled", native);
  await expectText("#host-status", "display update failed", native);
  await native.evaluate(() => { window.rejectTextUpdates = false; });
  await emit("sysEvent", { eventType: 5 }); // Overlay dismissed: re-paint the cancelled state
  await expectText("#host-status", "Even Hub connected", native);
  assert.equal(await native.getByRole("button", { name: "Confirm demo" }).count(), 0);
  // Device double press backs out and then shows the native exit confirmation.
  await emit("sysEvent", { eventType: 3, eventSource: 2 });
  await expectText("#display-kicker", "THREADS", native);
  await emit("sysEvent", { eventType: 3, eventSource: 2 });
  await native.waitForFunction(() => window.bridgeCalls.some(({ method }) => method === "shutDownPageContainer"));
  const calls = await native.evaluate(() => window.bridgeCalls);
  assert.equal(calls.find(({ method }) => method === "shutDownPageContainer").data.exitMode, 1);
  assert.ok(calls.some(({ method, data }) => method === "textContainerUpgrade" &&
    data.containerName === "body" && data.content.includes("Tests complete")));
  assert.equal(deviceRequests, 0, "the Even build must not request the relay");
  await native.close();

  const rejected = await browser.newPage();
  await rejected.addInitScript(() => {
    window.flutter_inappwebview = { callHandler: async () => 1 }; // invalid startup
  });
  await rejected.goto(deviceUrl);
  await expectText("#host-status", "Even Hub unavailable", rejected);
  await rejected.getByRole("button", { name: "Next", exact: true }).click();
  await rejected.getByRole("button", { name: "View thread" }).click();
  await expectText("#display-body", "Tests complete. Next step?", rejected);
  await rejected.close();

  console.log(`Phone UI and SDK transport checks passed at ${widths.join(", ")} CSS pixels.`);
} finally {
  await browser?.close();
  await deviceServer?.close();
  if (deviceDir) await rm(deviceDir, { recursive: true, force: true });
  await app.close();
}
