import { isSimulatedActionAvailable, selectedAgent, statusText, type State } from "./model";

export type Screen = Readonly<{ heading: string; kicker: string; body: string; controls: string }>;
const shorten = (str: string, max: number) => {
  // Only one firmware font is available; conservatively limit width before sending.
  const chars = Array.from(str);
  return chars.length > max ? chars.slice(0, max - 3).join("") + "..." : str;
};
const compactStatus = (status: keyof typeof statusText) =>
  status === "attention" ? "Attention" : statusText[status];

export function getScreen(state: State): Screen {
  const heading = state.mode === "demo" ? "AGENT RELAY  /  DEMO" : "AGENT RELAY  /  READ ONLY";
  const agent = selectedAgent(state);
  if (state.connection !== "ready") {
    const loading = state.connection === "loading";
    return {
      heading,
      kicker: loading ? "CONNECTING" : "RELAY OFFLINE",
      body: loading ? "Waiting for T3 Code status." : "No current status. Retrying.",
      controls: "Double press: exit",
    };
  }
  if (state.page === "list") {
    const index = state.agents.findIndex(({ id }) => id === state.selectedId);
    const first = Math.max(0, Math.min(state.agents.length - 3, index - 1));
    const body = state.agents.length > 0
      ? state.agents.slice(first, first + 3).map((item) =>
        `${item.id === state.selectedId ? ">" : " "} ${shorten(item.title, 22)}  /  ${compactStatus(item.status)}`).join("\n")
      : "No T3 Code threads to show.";
    return {
      heading, kicker: state.agents.length ? `THREADS  ${index + 1} OF ${state.agents.length}` : "THREADS",
      body,
      controls: state.agents.length ? "Swipe: browse   Press: view\nDouble press: exit" : "Double press: exit",
    };
  }
  if (state.page === "confirm") {
    return {
      heading, kicker: "SIMULATED ACTION",
      body: "Run final checks?\nNo real command will be sent.",
      controls: "Press: confirm demo\nDouble press: cancel",
    };
  }
  const primary = isSimulatedActionAvailable(state);
  return {
    heading,
    kicker: agent ? shorten(agent.provider.toUpperCase(), 24) : "THREAD",
    body: [
      shorten(agent?.title ?? "Unavailable", 30),
      agent?.id === "test" && primary ? "Tests complete. Next step?" : agent ? statusText[agent.status] : "",
      state.notice,
    ].filter(Boolean).join("\n"),
    controls: primary ? "Press: run final checks (demo)\nDouble press: back" : "Double press: back",
  };
}
