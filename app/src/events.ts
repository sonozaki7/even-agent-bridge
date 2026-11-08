import { EventSourceType, OsEventTypeList, type EvenHubEvent } from "@evenrealities/even_hub_sdk";
import type { Input } from "./model";

type SimpleEvent = Pick<EvenHubEvent, "textEvent" | "sysEvent">;

export function decodeInput(event: SimpleEvent): Input | undefined {
  const text = event.textEvent;
  const sys = event.sysEvent;
  // Hosts can omit the numeric zero used for click. On a system envelope,
  // require a recognized touch source so an empty lifecycle event can't tap.
  const fromTouch = sys?.eventSource === EventSourceType.TOUCH_EVENT_FROM_GLASSES_R ||
    sys?.eventSource === EventSourceType.TOUCH_EVENT_FROM_GLASSES_L ||
    sys?.eventSource === EventSourceType.TOUCH_EVENT_FROM_RING;
  const type = text
    ? (text.eventType ?? OsEventTypeList.CLICK_EVENT)
    : (sys?.eventType ?? (fromTouch ? OsEventTypeList.CLICK_EVENT : undefined));
  switch (type) {
    case OsEventTypeList.CLICK_EVENT: return "press";
    case OsEventTypeList.SCROLL_TOP_EVENT: return "up";
    case OsEventTypeList.SCROLL_BOTTOM_EVENT: return "down";
    case OsEventTypeList.DOUBLE_CLICK_EVENT: return "back";
  }
}

export function isOverlayChange(event: SimpleEvent): boolean {
  const type = event.sysEvent?.eventType;
  // The native contextual menu emits these for its own open/close. They do not
  // tell us that the phone WebView was suspended (handled via visibilitychange).
  return type === OsEventTypeList.FOREGROUND_ENTER_EVENT || type === OsEventTypeList.FOREGROUND_EXIT_EVENT;
}

export function createInputGate() {
  let lastPress = Number.NEGATIVE_INFINITY;
  return (input: Input, now: number): boolean => {
    if (input !== "press") return true;
    // Ignore a duplicate or accidental fast second tap; require a deliberate confirmation.
    if (now - lastPress < 450) return false;
    lastPress = now;
    return true;
  };
}
