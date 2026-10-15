import { AIAgent } from "../../../legacy/components/prefabs/AIAgent";
import { debateDefaults } from "../../../legacy/components/systems/debate/protocol";
import type { AgentConfiguration } from "../../../legacy/components/traits/AIAgent";
import type { RuntimeProvider } from "../providers";
import type { AgentRunView, DebateRules } from "./contracts";

export interface SessionProjection {
  scenario?: DebateRules;
  scope?: string;
  minWords?: number;
  outputTokens?: number;
  history?: AgentRunView[];
  generation: string;
  request: number;
  resuming?: boolean;
  playing: boolean;
  busy: boolean;
  cancelled: boolean;
  error: string;
  topic: string;
  maxSteps: number;
  maxWords: number;
  agents: AgentConfiguration[];
  handle: { id: string; token?: string } | null;
  view: AgentRunView | null;
  recording: AgentRunView | null;
  persistence: "process" | "database";
}
export const sessionProjection = (state: Record<string, unknown>) =>
  state as unknown as SessionProjection;
const initialize: RuntimeProvider["initialize"] = (node) => ({
  ...node.configuration,
  generation: crypto.randomUUID(),
  request: 0,
  playing: false,
  busy: false,
  cancelled: false,
  error: "",
  agents: [],
  handle: null,
  view: null,
  recording: null,
  persistence: "process",
});
export const agentProviders: [string, RuntimeProvider][] = [
  [
    "models/AIAgent",
    {
      initialize: (node) => ({ ...AIAgent(node.id, node.configuration) }),
      apply: (state) => state,
      measure: (state) => ({ profile: { ...state } }),
    },
  ],
  [
    "models/AgentSession",
    {
      initialize,
      synchronize(state, inputs, node) {
        const agents = (inputs.agents ?? []) as AgentConfiguration[];
        if (JSON.stringify(agents) === JSON.stringify(state.agents))
          return state;
        return { ...initialize(node), agents: structuredClone(agents) };
      },
      apply(state, command) {
        const next = structuredClone(state),
          session = sessionProjection(next);
        if (command === "RESUME") {
          if (session.busy || session.view)
            throw new Error("Restart before resuming a saved run.");
          session.resuming = true;
          session.request++;
          session.error = "";
          return next;
        }
        if (command === "REPLAY") {
          if (session.busy)
            throw new Error("Wait for the current response, or cancel it.");
          const recording = session.recording ?? session.view;
          if (!recording?.events.length)
            throw new Error("Generate a response before replaying it.");
          session.recording = structuredClone(recording);
          session.view = {
            ...structuredClone(recording),
            events: [],
            count: 0,
            maxSteps: recording.events.length,
            status: "ready",
            nextActor: recording.events[0].name,
          };
          session.playing = false;
          session.cancelled = false;
          session.error = "";
          return next;
        }
        if (session.recording && ["NEXT", "PLAY"].includes(command)) {
          const count =
            command === "PLAY"
              ? session.recording.events.length
              : Math.min(
                  (session.view?.count ?? 0) + 1,
                  session.recording.events.length,
                );
          session.view = {
            ...structuredClone(session.recording),
            events: session.recording.events.slice(0, count),
            count,
            maxSteps: session.recording.events.length,
            status:
              count === session.recording.events.length ? "completed" : "ready",
            nextActor: session.recording.events[count]?.name ?? "",
          };
          return next;
        }
        if (command === "PAUSE") {
          session.playing = false;
          return next;
        }
        if (command === "CANCEL") {
          session.generation = crypto.randomUUID();
          session.request = 0;
          session.cancelled = true;
          session.busy = false;
          session.playing = false;
          session.error = "Response cancelled. Restart to begin a new run.";
          return next;
        }
        if (!session.agents.length)
          throw new Error("Connect at least one AI agent to this environment.");
        if (session.busy)
          throw new Error("Wait for the current response, or cancel it.");
        if (
          session.cancelled ||
          session.view?.status === "completed" ||
          session.view?.status === "cancelled"
        )
          throw new Error("Restart the conversation to begin a new run.");
        session.request++;
        session.playing = command === "PLAY";
        session.error = "";
        return next;
      },
      measure(state) {
        const session = sessionProjection(state);
        return {
          session: structuredClone(session),
          count: session.view?.count ?? 0,
          status:
            session.error ||
            (session.busy
              ? `${session.view?.nextActor ?? session.agents[0]?.name ?? "Agent"} is responding…`
              : session.view?.status === "completed"
                ? "Conversation complete"
                : session.view
                  ? `Next: ${session.view.nextActor}`
                  : "Choose Next response to begin"),
        };
      },
    },
  ],
];

const conversationProvider = agentProviders.find(
  ([id]) => id === "models/AgentSession",
)?.[1];
if (!conversationProvider)
  throw new Error("Agent session provider is missing.");
agentProviders.push([
  "models/DebateSession",
  {
    ...conversationProvider,
    initialize(node) {
      const state = initialize(node);
      return {
        ...state,
        maxSteps: 18,
        history: [],
        scenario: {
          kind: "debate",
          version: 1,
          visibility: "sequential-public",
          scope: state.scope ?? debateDefaults.scope,
          minWords: state.minWords ?? debateDefaults.minWords,
          outputTokens: state.outputTokens ?? debateDefaults.outputTokens,
        },
      };
    },
    reinitialize(state, node) {
      return {
        ...this.initialize(node),
        history: archivedRuns(sessionProjection(state)),
      };
    },
    synchronize(state, inputs, node) {
      const agents = (inputs.agents ?? []) as AgentConfiguration[];
      if (JSON.stringify(agents) === JSON.stringify(state.agents)) return state;
      const fresh = this.initialize(node);
      return {
        ...fresh,
        agents: structuredClone(agents),
        history: archivedRuns(sessionProjection(state)),
      };
    },
    apply(state, command, args, node) {
      const session = sessionProjection(state);
      if (command === "RESTART")
        return {
          ...this.initialize(node),
          agents: structuredClone(session.agents),
          history: archivedRuns(session),
        };
      if (
        !session.recording &&
        !["PAUSE", "CANCEL", "REPLAY"].includes(command) &&
        (session.agents.filter((agent) => agent.team === "Proposition")
          .length !== 3 ||
          session.agents.filter((agent) => agent.team === "Opposition")
            .length !== 3)
      )
        throw new Error(
          "Assign three agents to each team in setup before beginning.",
        );
      return conversationProvider.apply(state, command, args, node);
    },
  },
]);
function archivedRuns(session: SessionProjection): AgentRunView[] {
  const previous = session.recording ?? session.view;
  const history = [...(session.history ?? [])];
  if (previous?.events.length) {
    const index = history.findIndex((run) => run.id === previous.id);
    if (index < 0) history.push(structuredClone(previous));
    else if (history[index].count < previous.count)
      history[index] = structuredClone(previous);
  }
  return history.slice(-10);
}
