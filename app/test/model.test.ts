import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  EventSourceType,
  OsEventTypeList,
  Text_ItemEvent,
  Sys_ItemEvent,
  validateEvenHubPageContainer,
} from "@evenrealities/even_hub_sdk";
import { getScreen } from "../src/display";
import { nativeLayout } from "../src/even";
import { createInputGate, decodeInput } from "../src/events";
import {
  advance, afterSurfaceChange, initialState, interact, parseStatusPayload, selectedAgent, setOffline, updateAgents,
  type Input, type State,
} from "../src/model";

const step = (state: State, input: Input, now = 1_000) => interact(state, input, now).state;
function openTests() {
  return step(step(initialState("demo"), "down"), "press");
}

test("demo lets a user browse work and rehearse a follow-up, but only after explicit confirmation", () => {
  const detail = openTests();
  assert.equal(getScreen(detail).body, "Run tests\nTests complete. Next step?");
  const confirm = step(detail, "press");
  assert.equal(confirm.page, "confirm");
  assert.equal(selectedAgent(confirm)?.status, "attention");
  const running = step(confirm, "press", 1_600);
  assert.equal(running.page, "detail");
  assert.equal(selectedAgent(running)?.status, "running");
  assert.equal(advance(running, 5_599), running);
  const done = advance(running, 5_600);
  assert.equal(selectedAgent(done)?.status, "complete");
  assert.match(getScreen(done).body, /Demo: final checks complete/);
  assert.equal(step(done, "press"), done);
});

test("back cancels a demo action; expired confirmations do not execute", () => {
  const confirm = step(openTests(), "press");
  const cancelled = step(confirm, "back");
  assert.equal(cancelled.page, "detail");
  assert.equal(selectedAgent(cancelled)?.status, "attention");
  const late = step(confirm, "press", 9_000);
  assert.equal(late.page, "detail");
  assert.equal(selectedAgent(late)?.status, "attention");
  assert.match(late.notice, /expired/);
  assert.equal(interact(step(cancelled, "back"), "back", 1_200).exit, true);
});

test("a native overlay or suspended phone cancels a pending choice but reconciles an already-confirmed run", () => {
  const pending = step(openTests(), "press", 1_000);
  const cancelled = afterSurfaceChange(pending, 1_100);
  assert.equal(cancelled.page, "detail");
  assert.equal(selectedAgent(cancelled)?.status, "attention");
  assert.equal(afterSurfaceChange(cancelled, 2_000), cancelled);
  const running = step(pending, "press", 1_500);
  const resumed = afterSurfaceChange(running, 120_000);
  assert.equal(selectedAgent(resumed)?.status, "complete");
});

test("T3 mode never allows a command, even for a thread that matches the demo ID", () => {
  const list = updateAgents(initialState("t3"), [
    { id: "test", title: "Run tests", provider: "Codex", status: "attention" },
  ]);
  const detail = step(list, "press");
  assert.equal(detail.page, "detail");
  assert.equal(step(detail, "press"), detail);
  assert.match(getScreen(detail).heading, /READ ONLY/);
  assert.doesNotMatch(getScreen(detail).controls, /checks/);
  const offline = setOffline(detail);
  assert.equal(offline.agents.length, 0);
  assert.match(getScreen(offline).kicker, /OFFLINE/);
  assert.doesNotMatch(getScreen(offline).body, /Run tests/);
  assert.match(getScreen(updateAgents(offline, [])).body, /No T3 Code threads/);
});

test("thread refresh preserves selection by ID, and clears a detail page after its thread disappears", () => {
  const first = { id: "1", title: "First", provider: "Codex", status: "running" } as const;
  const second = { id: "2", title: "Second", provider: "Claude Code", status: "running" } as const;
  const list = updateAgents(initialState("t3"), [first, second]);
  const detail = step(step(list, "down"), "press");
  const reordered = updateAgents(detail, [second, first]);
  assert.equal(reordered.page, "detail");
  assert.equal(selectedAgent(reordered), second);
  assert.equal(updateAgents(reordered, [first]).page, "list");
});

test("relay payload projection omits extra fields and rejects malformed or duplicate IDs", () => {
  const thread = { id: "a", title: "Open\nthing\u202e", provider: "Codex", status: "running" };
  assert.deepEqual(parseStatusPayload({ agents: [{ ...thread, raw: "unused" }] }), [
    { id: "a", title: "Open thing", provider: "Codex", status: "running" },
  ]);
  assert.equal(parseStatusPayload({ agents: [{ ...thread, title: "W".repeat(2_000) }] })[0]?.title.length, 160);
  assert.throws(() => parseStatusPayload({ agents: [thread, thread] }));
  assert.throws(() => parseStatusPayload({ agents: [{ ...thread, status: "approved" }] }));
  assert.throws(() => parseStatusPayload({ agents: [{ ...thread, provider: null }] }));
});

test("native text/sys envelopes match SDK types and duplicate presses are ignored", () => {
  assert.equal(decodeInput({ textEvent: new Text_ItemEvent({}) }), "press");
  assert.equal(decodeInput({ textEvent: new Text_ItemEvent({ eventType: OsEventTypeList.SCROLL_BOTTOM_EVENT }) }), "down");
  assert.equal(decodeInput({ sysEvent: new Sys_ItemEvent({ eventType: OsEventTypeList.DOUBLE_CLICK_EVENT }) }), "back");
  assert.equal(decodeInput({ sysEvent: new Sys_ItemEvent({}) }), undefined);
  assert.equal(decodeInput({ sysEvent: new Sys_ItemEvent({ eventSource: EventSourceType.TOUCH_EVENT_FROM_GLASSES_R }) }), "press");
  assert.equal(decodeInput({ sysEvent: new Sys_ItemEvent({ eventSource: EventSourceType.TOUCH_EVENT_FROM_RING }) }), "press");
  assert.equal(decodeInput({ sysEvent: new Sys_ItemEvent({ eventType: OsEventTypeList.LONG_PRESS_EVENT }) }), undefined);
  const gate = createInputGate();
  assert.equal(gate("press", 2_000), true);
  assert.equal(gate("press", 2_449), false);
  assert.equal(gate("down", 2_449), true);
  assert.equal(gate("press", 2_450), true);
});

test("the 576×288 display fits SDK layout constraints with one capture target", () => {
  const layout = nativeLayout(getScreen(initialState("demo")));
  assert.equal(validateEvenHubPageContainer(layout).valid, true);
  const boxes = layout.textObject ?? [];
  assert.equal(boxes.length, 4);
  assert.equal(boxes.filter((box) => box.isEventCapture === 1).length, 1);
  for (const box of boxes) {
    assert.ok((box.xPosition ?? 0) + (box.width ?? 0) <= 576);
    assert.ok((box.yPosition ?? 0) + (box.height ?? 0) <= 288);
  }
});
