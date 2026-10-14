import {
  num,
  object,
  type ParameterSchema,
} from "../../../registry/contracts/parameterSchema";

const text = (maxLength: number): ParameterSchema => ({
  type: "string",
  minLength: 1,
  maxLength,
});
export const agentProfileSchema = object(
  {
    name: text(80),
    persona: text(1200),
    objective: text(1200),
    expertise: text(400),
    team: { type: "string", enum: ["Proposition", "Opposition"] },
    communicationStyle: text(400),
  },
  ["team", "communicationStyle"],
);
export interface AgentProfile {
  name: string;
  persona: string;
  objective: string;
  expertise: string;
  team?: "Proposition" | "Opposition";
  communicationStyle?: string;
}
export interface AgentConfiguration extends AgentProfile {
  id: string;
}
export const agentEnvironmentSchema = object({
  topic: text(1200),
  maxSteps: num(1, 40, "actions", true),
  maxWords: num(20, 180, "words", true),
});
export interface AgentEnvironmentConfiguration {
  topic: string;
  maxSteps: number;
  maxWords: number;
}

/** Configuration is authored; private memory belongs to accepted server transitions. */
export interface AgentMemory {
  notes: string;
  sources: string[];
}
export interface AgentPlan {
  steps: string[];
  completed: number;
}
export type AgentActivity = "ready" | "working" | "failed" | "completed";
export const agentDefaults: AgentProfile = {
  name: "Curious explorer",
  persona: "Curious, respectful, and willing to reconsider assumptions.",
  objective:
    "Explore the topic, ask useful questions, and respond to other participants.",
  expertise: "General knowledge",
};
