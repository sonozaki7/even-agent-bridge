# Agent Relay — Even Hub app

Agent Relay is an independent companion prototype for T3 Code. It uses the official Even Hub SDK to draw a 576 × 288 text interface on the G2 and receive standard touch input. The same app has a browser preview with buttons, so no glasses or ring are required to try the workflow.

## Preview without an account

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:4173`). It starts with sample threads and does not contact T3 Code. Choose **Next → View thread → Run final checks → Confirm demo** to see the full simulated interaction. After four seconds the sample status becomes **Complete**. Cancel or let the confirmation expire without starting anything.

### Even Hub simulator

![Agent Relay demo in the official 576 × 288 simulator](simulator.png)

The screenshot is from the simulator, not physical glasses.

With the development server still running, run:

```sh
npm run simulator -- http://127.0.0.1:4173
```

| Preview button | Even Hub control | Purpose |
| --- | --- | --- |
| Previous / Next | Swipe up / down | Select a thread |
| View thread | Press | Open the selected thread |
| Run final checks | Press | Ask for a simulated confirmation |
| Confirm demo | Press again | Advance the sample data only |
| Back / Cancel | Double press | Back out; the root page opens Even’s exit confirmation |

The ring and glasses touchpads are designed to use these gestures through the [Even Hub SDK](https://hub.evenrealities.com/docs/build/device-apis). Physical G2/R1 input, timing, and readability still need device testing. The app does not request microphone permissions, perform voice recognition, create system notifications, or operate outside the foreground experience. If the phone view is suspended or the Even menu opens while you are confirming, the pending demo confirmation is cancelled.

To run the repeatable framebuffer/input check, start the simulator on a fresh demo
with `npm run simulator -- http://127.0.0.1:4173 --automation-port 9898` and run
`node scripts/check-simulator.mjs` in another terminal. The check exercises the
simulator, not physical hardware.

### Try the sample on physical Even G2 and R1

This is a **demo-only** hardware test. It does not give the phone or glasses access to your T3 Code server.

1. Pair the G2 and optional R1 in the Even Realities phone app. Update the phone app and device firmware; this package requires Even App **2.2.10 or newer**. Enable the developer preview as described in [Even’s local testing guide](https://hub.evenrealities.com/docs/test/local-testing).
2. On a trusted Wi-Fi network, find the computer’s LAN IP (not `127.0.0.1`). From `app/`, use that IP in both terminals below. Keep the demo server running until testing is complete, then stop it.

   ```sh
   # Terminal 1 (replace the example address with your own)
   npm run dev:device -- --host 192.168.1.100
   # Terminal 2
   npx --no-install evenhub qr --url http://192.168.1.100:4173
   ```

3. Scan the QR code in the Even Realities app's developer preview. Verify the three sample threads appear. With the glasses touchpad, then with the R1 separately, swipe to **Run tests**, open it, and check both outcomes: double press to cancel; reopen, deliberately confirm, and see **Complete**. Repeat once by letting the confirmation expire and ensure no checks started. Double press from the list to verify the system exit prompt.
4. QR preview checks display and input, not installation or phone-lock behaviour. For those, use the packaged build with [Even’s Private Testing](https://hub.evenrealities.com/docs/test/private-testing) and [Beta Testing](https://hub.evenrealities.com/docs/test/beta-testing). Reopen after locking the phone and confirm that no stale approval can fire and the demo remains usable. The demo may reset if the phone recreates the page; no real task is affected.

Do not make the local T3 relay reachable on this network. The demo device build ignores `?source=t3`, and the default browser/developer servers still bind to the local computer unless you supply a LAN address.

### Real, read-only thread status on the local computer

Build the app and follow [the local T3 relay setup](../bridge/README.md). Open the relay URL with `?source=t3`. In that view the app retrieves thread summaries from the same local server. It has no write controls and never receives the T3 Code credential. If the relay fails, the app shows **Relay offline** instead of substituting fake live status.

The installable Even Hub package has no network permission and only shows sample data, even if a URL includes `?source=t3`. The local read-only preview is not a remote phone service. A private phone-to-relay setup and its permissions would need separate validation; do not expose this local relay to the internet.

## Checks and packaging

```sh
npm test
npm run build
npx playwright install chromium   # if using Playwright’s bundled browser
npm run test:ui
npm run pack
```

The UI check uses headless Google Chrome if installed on macOS, or Playwright Chromium. It checks 320, 375, 390, 768, 1024, and 1440 CSS-pixel widths, including the demo action, disconnected/empty relay, long labels, and the real SDK against a mocked native host. `npm run pack` builds the demo-only `dist-even/` and creates `agent-relay.ehpk` with the pinned SDK. `npm run build` builds the separate browser/relay preview into `dist/`. Packaging is not Even Hub publication or device verification. See [official device testing](https://hub.evenrealities.com/docs/test) and [packaging](https://hub.evenrealities.com/docs/ship/packaging).
