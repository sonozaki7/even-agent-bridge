export const statuses = ["running", "attention", "complete", "idle", "error"] as const;
export type Status = (typeof statuses)[number];
export type Agent = Readonly<{ id: string; title: string; provider: string; status: Status }>;
export type Mode = "demo" | "t3";
export type Connection = "ready" | "loading" | "offline";
export type Input = "up" | "down" | "press" | "back";
export type State = Readonly<{
  mode: Mode;
  connection: Connection;
  agents: readonly Agent[];
  selectedId: string | null;
  page: "list" | "detail" | "confirm";
  confirmUntil: number;
  demoFinishAt: number;
  notice: string;
}>;

const demoAgents: readonly Agent[] = [
  { id: "build", title: "Build interface", provider: "Codex", status: "running" },
  { id: "test", title: "Run tests", provider: "Codex", status: "attention" },
  { id: "review", title: "Review code", provider: "Claude Code", status: "running" },
];

export const statusText: Record<Status, string> = {
  running: "Running",
  attention: "Needs attention",
  complete: "Complete",
  idle: "Idle",
  error: "Error",
};

export function initialState(mode: Mode): State {
  const agents = mode === "demo" ? demoAgents : [];
  return {
    mode, agents,
    connection: mode === "demo" ? "ready" : "loading",
    selectedId: agents[0]?.id ?? null,
    page: "list",
    confirmUntil: 0,
    demoFinishAt: 0,
    notice: "",
  };
}

export function selectedAgent(state: State): Agent | undefined {
  return state.agents.find(({ id }) => id === state.selectedId);
}

export function isSimulatedActionAvailable(state: State): boolean {
  const agent = selectedAgent(state);
  return state.mode === "demo" && agent?.id === "test" && agent.status === "attention";
}

export function updateAgents(state: State, agents: readonly Agent[]): State {
  const selectionExists = agents.some(({ id }) => id === state.selectedId);
  return {
    ...state, agents,
    connection: "ready",
    selectedId: selectionExists ? state.selectedId : (agents[0]?.id ?? null),
    page: selectionExists ? state.page : "list",
  };
}

export function setOffline(state: State): State {
  return {
    ...state, connection: "offline", agents: [], selectedId: null,
    page: "list", confirmUntil: 0, notice: "",
  };
}

export function advance(state: State, now: number): State {
  if (state.page === "confirm" && now >= state.confirmUntil) {
    return { ...state, page: "detail", confirmUntil: 0, notice: "Confirmation expired. Try again." };
  }
  if (state.mode === "demo" && state.demoFinishAt > 0 && now >= state.demoFinishAt) {
    return {
      ...state,
      agents: state.agents.map((agent) => agent.id === "test" ? { ...agent, status: "complete" } : agent),
      demoFinishAt: 0,
      notice: "Demo: final checks complete.",
    };
  }
  return state;
}

// Closing the phone view or opening an OS overlay invalidates an unconfirmed choice.
export function afterSurfaceChange(previous: State, now: number): State {
  const state = advance(previous, now);
  return state.page === "confirm"
    ? { ...state, page: "detail", confirmUntil: 0, notice: "Confirmation cancelled." }
    : state;
}

export function interact(previous: State, input: Input, now: number): { state: State; exit: boolean } {
  const state = advance(previous, now);
  // A press after expiry is not allowed to reopen and confirm in the same step.
  if (input === "press" && previous.page === "confirm" && state.page !== "confirm") {
    return { state, exit: false };
  }
  if (input === "back") {
    if (state.page === "list") return { state, exit: true };
    return {
      state: { ...state, page: state.page === "confirm" ? "detail" : "list", confirmUntil: 0, notice: "" },
      exit: false,
    };
  }
  if (state.page === "list") {
    if (input === "press" && selectedAgent(state)) {
      return { state: { ...state, page: "detail", notice: "" }, exit: false };
    }
    if ((input === "up" || input === "down") && state.agents.length > 0) {
      const index = state.agents.findIndex(({ id }) => id === state.selectedId);
      const nextIndex = Math.max(0, Math.min(state.agents.length - 1, index + (input === "up" ? -1 : 1)));
      return {
        state: { ...state, selectedId: state.agents[nextIndex]?.id ?? null, notice: "" },
        exit: false,
      };
    }
  }
  if (state.page === "detail" && input === "press" && isSimulatedActionAvailable(state)) {
    return { state: { ...state, page: "confirm", confirmUntil: now + 8_000, notice: "" }, exit: false };
  }
  if (state.page === "confirm" && input === "press" && isSimulatedActionAvailable(state)) {
    return {
      state: {
        ...state,
        page: "detail",
        confirmUntil: 0,
        agents: state.agents.map((agent) => agent.id === state.selectedId ? { ...agent, status: "running" } : agent),
        demoFinishAt: now + 4_000,
        notice: "Demo: final checks started.",
      },
      exit: false,
    };
  }
  return { state, exit: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedLabel(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim();
  return cleaned ? Array.from(cleaned).slice(0, limit).join("") : null;
}

// Copy only the allowlisted display fields; do not display tool output, paths, or messages.
export function parseStatusPayload(value: unknown): readonly Agent[] {
  if (!isRecord(value) || !Array.isArray(value.agents) || value.agents.length > 50) {
    throw new Error("Invalid status response");
  }
  const ids = new Set<string>();
  return value.agents.map((raw: unknown) => {
    if (!isRecord(raw)) throw new Error("Invalid agent");
    const id = raw.id;
    const title = boundedLabel(raw.title, 160);
    const provider = boundedLabel(raw.provider, 40);
    const status = statuses.find((item) => item === raw.status);
    if (typeof id !== "string" || !id || id.length > 200 || ids.has(id) || !title || !provider || !status) {
      throw new Error("Invalid agent fields");
    }
    ids.add(id);
    return { id, title, provider, status };
  });
}
