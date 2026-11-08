import "./style.css";
import {
  advance, afterSurfaceChange, initialState, interact, isSimulatedActionAvailable, parseStatusPayload,
  selectedAgent, setOffline, updateAgents, type Input, type Mode,
} from "./model";
import { getScreen } from "./display";
import { connectEven } from "./even";
import { createInputGate } from "./events";

// The installable package and hardware QR preview cannot enter relay mode.
const deviceBuild = import.meta.env.MODE === "evenhub";
const mode: Mode = !deviceBuild && new URLSearchParams(location.search).get("source") === "t3" ? "t3" : "demo";
const buttons = {
  up: document.querySelector<HTMLButtonElement>("#up")!,
  down: document.querySelector<HTMLButtonElement>("#down")!,
  press: document.querySelector<HTMLButtonElement>("#press")!,
  back: document.querySelector<HTMLButtonElement>("#back")!,
};
const fields = {
  heading: document.getElementById("display-heading")!,
  kicker: document.getElementById("display-kicker")!,
  body: document.getElementById("display-body")!,
  controls: document.getElementById("display-controls")!,
};
const hostStatus = document.getElementById("host-status")!;
const badge = document.getElementById("mode-badge")!;
const modeLink = document.querySelector<HTMLAnchorElement>("#mode-link")!;
const note = document.getElementById("panel-note")!;
modeLink.hidden = deviceBuild;
let state = initialState(mode);
let hardware: Awaited<ReturnType<typeof connectEven>> | undefined;
let clockTimer: ReturnType<typeof setTimeout> | undefined;
const acceptsDeviceInput = createInputGate();

function setText(element: HTMLElement, value: string) {
  if (element.textContent !== value) element.textContent = value;
}

function render() {
  const screen = getScreen(state);
  for (const key of Object.keys(fields) as Array<keyof typeof fields>) setText(fields[key], screen[key]);
  void hardware?.render(screen);
  const index = state.agents.findIndex(({ id }) => id === state.selectedId);
  buttons.up.disabled = state.page !== "list" || index <= 0;
  buttons.down.disabled = state.page !== "list" || index < 0 || index >= state.agents.length - 1;
  buttons.press.disabled = !selectedAgent(state) || (state.page === "detail" && !isSimulatedActionAvailable(state));
  buttons.back.disabled = state.page === "list";
  setText(buttons.press, state.page === "list" ? "View thread" : state.page === "confirm" ? "Confirm demo" :
    isSimulatedActionAvailable(state) ? "Run final checks" : "View only");
  setText(buttons.back, state.page === "confirm" ? "Cancel" : "Back");

  if (clockTimer !== undefined) clearTimeout(clockTimer);
  const next = [state.confirmUntil, state.demoFinishAt].filter((at) => at > 0);
  if (next.length > 0) {
    clockTimer = setTimeout(() => {
      state = advance(state, Date.now());
      render();
    }, Math.max(1, Math.ceil(Math.min(...next) - Date.now())));
  }
}

function onInput(input: Input, native = false) {
  if (native && !acceptsDeviceInput(input, performance.now())) return;
  const result = interact(state, input, Date.now());
  state = result.state;
  render();
  if (result.exit && native) void hardware?.exit();
}

function handleSurfaceChange() {
  if (mode !== "demo") return;
  state = afterSurfaceChange(state, Date.now());
  // A display update may have been rejected while the menu owned the screen.
  // Re-submit on close/resume even if the model has not changed again.
  render();
}

buttons.up.addEventListener("click", () => onInput("up"));
buttons.down.addEventListener("click", () => onInput("down"));
buttons.press.addEventListener("click", () => onInput("press"));
buttons.back.addEventListener("click", () => onInput("back"));

let pollTimer: ReturnType<typeof setTimeout> | undefined;
let pollController: AbortController | undefined;
async function refresh() {
  if (document.hidden || pollController) return;
  const controller = new AbortController();
  pollController = controller;
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch("/api/status", {
      method: "GET", cache: "no-store", redirect: "error", credentials: "omit",
      headers: { Accept: "application/json" }, signal: controller.signal,
    });
    if (!response.ok || !response.headers.get("Content-Type")?.startsWith("application/json")) {
      throw new Error("Status feed unavailable");
    }
    const raw = await response.json();
    if (document.hidden || controller.signal.aborted) return;
    state = updateAgents(state, parseStatusPayload(raw));
  } catch {
    if (!document.hidden) state = setOffline(state);
  } finally {
    clearTimeout(timeout);
    pollController = undefined;
    if (!document.hidden) {
      render();
      pollTimer = setTimeout(() => void refresh(), 5_000);
    }
  }
}

if (mode === "t3") {
  setText(badge, "Read only");
  setText(note, "Reads status from the local relay. Use T3 Code to take action.");
  setText(modeLink, "Return to sample demo");
  modeLink.href = location.pathname;
  document.addEventListener("visibilitychange", () => {
    clearTimeout(pollTimer);
    if (document.hidden) {
      pollController?.abort();
      state = setOffline(state);
      render();
    } else void refresh();
  });
  void refresh();
} else {
  // Locking the phone can pause timer callbacks. Recheck deadlines on return and
  // never keep an unconfirmed prompt open across a visibility change.
  document.addEventListener("visibilitychange", handleSurfaceChange);
}

render();
void connectEven(() => getScreen(state), (input) => onInput(input, true), handleSurfaceChange, (message) => {
  setText(hostStatus, message);
}).then((connected) => {
  hardware = connected;
  modeLink.hidden = true;
  render();
}).catch(() => {
  setText(hostStatus, "Even Hub unavailable · Browser preview still works");
});
