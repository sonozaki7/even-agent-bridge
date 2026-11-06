import {
  CreateStartUpPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";
import { decodeInput } from "./events";
import type { Input } from "./model";
import type { Screen } from "./display";

const boxes = [
  { key: "heading", id: 1, y: 12, height: 42, brightness: 3 },
  { key: "kicker", id: 2, y: 55, height: 42, brightness: 3 },
  { key: "body", id: 3, y: 99, height: 105, brightness: 4 },
  { key: "controls", id: 4, y: 216, height: 67, brightness: 3 },
] as const;

export function nativeLayout(screen: Screen): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: boxes.length,
    textObject: boxes.map(({ key, id, y, height, brightness }) =>
      new TextContainerProperty({
        xPosition: key === "body" ? 20 : 25, yPosition: y, width: key === "body" ? 536 : 526, height,
        containerID: id, containerName: key, content: screen[key],
        isEventCapture: key === "body" ? 1 : 0,
        borderWidth: key === "body" ? 2 : 0,
        borderColor: 5, paddingLength: key === "body" ? 5 : 0,
        textColor: brightness,
      })),
  });
}

export async function connectEven(
  getScreen: () => Screen,
  onInput: (input: Input) => void,
  setHostStatus: (message: string) => void,
) {
  // Remain usable as a standalone browser preview while waiting for an Even host.
  const bridge = await waitForEvenAppBridge();
  const initial = getScreen();
  const result = await bridge.createStartUpPageContainer(nativeLayout(initial));
  if (result !== StartUpPageCreateResult.success) {
    throw new Error("Even Hub rejected the initial display");
  }
  const unsubscribe = bridge.onEvenHubEvent((event) => {
    const input = decodeInput(event);
    if (input) onInput(input);
  });
  window.addEventListener("pagehide", unsubscribe, { once: true });
  setHostStatus("Even Hub connected · Display and touch input");
  console.info("[agent-relay] ready");

  let last = initial;
  let pending: Screen | undefined;
  let rendering = false;

  async function render(screen: Screen) {
    pending = screen;
    if (rendering) return;
    rendering = true;
    try {
      while (pending) {
        const next = pending;
        pending = undefined;
        for (const { key, id } of boxes) {
          if (last[key] !== next[key]) {
            const ok = await bridge.textContainerUpgrade(new TextContainerUpgrade({
              containerID: id, containerName: key, content: next[key],
            }));
            if (!ok) {
              setHostStatus("Even Hub display update failed");
              continue;
            }
            last = { ...last, [key]: next[key] };
          }
        }
      }
    } catch {
      setHostStatus("Even Hub display update failed");
    } finally {
      rendering = false;
    }
  }

  return {
    render,
    async exit() {
      try {
        if (!await bridge.shutDownPageContainer(1)) setHostStatus("Even Hub exit could not open");
      } catch {
        setHostStatus("Even Hub exit could not open");
      }
    },
  };
}
