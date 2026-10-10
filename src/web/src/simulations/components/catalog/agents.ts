import type { PublicDefinition } from "../../runtime/authoring/types";
import { object } from "../../runtime/parameterSchema";
import {
  debateDefaults,
  debateSessionSchema,
} from "../systems/debate/protocol";
import {
  agentDefaults,
  agentEnvironmentSchema,
  agentProfileSchema,
} from "../traits/AIAgent";
import { base } from "./generic";

const model = (
  id: string,
  title: string,
  configuration: PublicDefinition["configuration"],
  defaults: Record<string, unknown>,
): PublicDefinition => ({
  ...base(id, title, "models", configuration, defaults),
  tags: ["ai", "agents", "social"],
  placement: ["logic"],
  runtimeProvider: id,
  presentationProvider: undefined,
  lifecycle: {
    authored: Object.keys(defaults),
    presentation: [],
    clock: false,
    reset: "authored",
    capture: false,
  },
});
const display = (
  id: string,
  title: string,
  unit: string,
): PublicDefinition => ({
  ...base(id, title, "displays"),
  inputs: { value: { kind: "value", unit, optional: true, crossScope: true } },
  tags: ["ai", "agents"],
});
export const agentDefinitions: PublicDefinition[] = [
  {
    ...model("models/AIAgent", "AI agent", agentProfileSchema, {
      ...agentDefaults,
    }),
    description:
      "An independent participant with a persona, expertise, and objective. Connect it to an agent session.",
    outputs: {
      profile: {
        kind: "value",
        unit: "agent/profile",
        cardinality: "many",
        crossScope: true,
      },
    },
    commands: {
      RESET: {
        arguments: object({}),
        description: "Restore the authored profile",
        timing: "rebuild",
      },
    },
  },
  {
    ...model(
      "models/AgentSession",
      "Agent environment",
      agentEnvironmentSchema,
      {
        topic: "How can a city make daily travel easier?",
        maxSteps: 8,
        maxWords: 100,
      },
    ),
    description:
      "A shared topic and bounded execution lifecycle for independently connected agents.",
    inputs: {
      agents: { kind: "value", unit: "agent/profile", cardinality: "many" },
    },
    outputs: {
      session: {
        kind: "value",
        unit: "agent/session",
        crossScope: true,
        cardinality: "many",
      },
      status: { kind: "value", unit: "", crossScope: true },
      count: { kind: "value", unit: "actions", crossScope: true },
    },
    commands: Object.fromEntries(
      ["NEXT", "PLAY", "PAUSE", "CANCEL", "RESET", "REPLAY", "RESUME"].map(
        (command) => [
          command,
          {
            arguments: object({}),
            description:
              {
                RESUME:
                  "Restore the previous run for this setup from the browser tab",
                NEXT: "Generate the next agent response",
                PLAY: "Continue responses automatically",
                PAUSE: "Stop after the current response",
                CANCEL: "Cancel pending work",
                RESET: "Start a new run from the authored setup",
                REPLAY: "Replay accepted responses without calling the model",
              }[command] ?? command,
            timing: command === "RESET" ? "rebuild" : "live",
          },
        ],
      ),
    ),
    assumptions: [
      "Generated arguments are not verified facts.",
      "Guest runs expire after one hour without activity or when the server restarts.",
    ],
  },
  {
    ...display("displays/AgentProfile", "Agent profile", "agent/profile"),
    description: "Inspect one agent's persona and objective.",
    inputs: {
      value: {
        kind: "value",
        unit: "agent/profile",
        optional: true,
        crossScope: true,
      },
      session: {
        kind: "value",
        unit: "agent/session",
        optional: true,
        crossScope: true,
      },
    },
  },
  {
    ...display(
      "displays/AgentTranscript",
      "Agent conversation",
      "agent/session",
    ),
    description:
      "Read accepted responses and follow links to earlier messages.",
  },
  {
    ...base("controls/AgentActions", "Agent actions", "controls"),
    tags: ["ai", "agents"],
    description:
      "Step, continue, pause, cancel, or restart a connected agent environment.",
    inputs: { value: { kind: "value", unit: "agent/session", optional: true } },
    outputs: Object.fromEntries(
      ["NEXT", "PLAY", "PAUSE", "CANCEL", "RESET", "REPLAY", "RESUME"].map(
        (command) => [command, { kind: "event", unit: "", schema: object({}) }],
      ),
    ),
  },
];

const sessionDefinition = agentDefinitions.find(
  (definition) => definition.id === "models/AgentSession",
);
if (!sessionDefinition) throw new Error("Agent session definition is missing.");
agentDefinitions.push({
  ...structuredClone(sessionDefinition),
  id: "models/DebateSession",
  title: "AI debate session",
  description:
    "A motion, two teams of three, and eighteen speeches in opening, rebuttal, and closing rounds. Connect six independent AI agents.",
  runtimeProvider: "models/DebateSession",
  configuration: debateSessionSchema,
  defaults: { ...debateDefaults },
  lifecycle: {
    ...sessionDefinition.lifecycle,
    authored: Object.keys(debateDefaults),
  },
  commands: {
    ...sessionDefinition.commands,
    RESTART: {
      arguments: object({}),
      description: "Start a fresh debate and retain the previous transcript",
      timing: "live",
    },
  },
  assumptions: [
    ...sessionDefinition.assumptions,
    "Rebuttal links establish valid references, not meaningful engagement or truth.",
    "One comparison cannot establish a causal personality effect.",
  ],
});
