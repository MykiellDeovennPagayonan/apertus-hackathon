import { AIAgent } from "../../components/prefabs/AIAgent";
import type { AgentConfiguration } from "../../components/traits/AIAgent";
import type { RuntimeProvider } from "../authoring/providers";
import type { AgentRunView } from "./contracts";

export interface SessionProjection {
  generation: string;
  request: number;
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
