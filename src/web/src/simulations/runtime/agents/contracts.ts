import type {
  AgentConfiguration,
  AgentMemory,
  AgentPlan,
} from "../../components/traits/AIAgent";

export class AgentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AgentError";
  }
}
export interface AgentEvent {
  id: string;
  sequence: number;
  actor: string;
  name: string;
  kind: "speak" | "setMetric";
  text: string;
  references: string[];
  audience: "public" | string[];
}
export type AgentProposal =
  | {
      action: "speak";
      text: string;
      references: string[];
      memory: string;
      plan: string[];
    }
  | {
      action: "setMetric";
      key: string;
      value: number;
      references: string[];
      memory: string;
      plan: string[];
    };
export interface AgentRunConfiguration {
  schemaVersion: 1;
  agents: AgentConfiguration[];
  environment: string;
  maxSteps: number;
  maxWords: number;
  capabilities: ("speak" | "setMetric")[];
}
export interface ModelIdentity {
  settingsFingerprint?: string;
  provider: string;
  model: string;
  connection: string;
}
export interface AttemptMetadata {
  model: ModelIdentity;
  elapsedMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  /** False when only a partial usage total is known. */
  inputTokensComplete?: boolean;
  outputTokensComplete?: boolean;
}
export class AgentModelError extends AgentError {
  constructor(
    message: string,
    status: number,
    readonly metadata: AttemptMetadata,
  ) {
    super(message, status);
  }
}
export interface AttemptReceipt extends AttemptMetadata {
  workId: string;
  actor: string;
  fence: number;
  outcome: "working" | "accepted" | "failed" | "cancelled" | "expired";
}
export interface AgentReservation {
  id: string;
  actor: string;
  fence: number;
  expiresAt: number;
}
export interface AgentRun {
  nextActor: string;
  schemaVersion: 1;
  id: string;
  owner: string;
  revision: number;
  fence: number;
  configuration: AgentRunConfiguration;
  status: "ready" | "working" | "failed" | "completed" | "cancelled";
  events: AgentEvent[];
  memories: Record<string, AgentMemory>;
  plans: Record<string, AgentPlan>;
  metrics: Record<string, number>;
  pending: AgentReservation | null;
  attempts: number;
  error: string;
  model: ModelIdentity;
  receipts: Record<string, AttemptMetadata>;
  /** Optional only for runs written before attempt accounting was introduced. */
  attemptReceipts?: Record<string, AttemptReceipt>;
  updatedAt: number;
}
export interface AgentObservation {
  plan: AgentPlan;
  environment: string;
  actor: AgentConfiguration;
  events: AgentEvent[];
  memory: AgentMemory;
  metrics: Record<string, number>;
  allowed: AgentRunConfiguration["capabilities"];
  maxWords: number;
}
export interface AgentModel {
  generate(
    observation: AgentObservation,
    signal: AbortSignal,
  ): Promise<{ proposal: AgentProposal; metadata: AttemptMetadata }>;
}
export interface RunRepository {
  create(run: AgentRun): Promise<void>;
  read(id: string, owner: string): Promise<AgentRun>;
  replace(run: AgentRun, expectedRevision: number): Promise<void>;
}
export interface EnvironmentAdapter {
  observe(run: AgentRun, actor: AgentConfiguration): AgentObservation;
  apply(
    run: AgentRun,
    actor: AgentConfiguration,
    proposal: AgentProposal,
    eventId: string,
  ): AgentRun;
}
/** Public projection deliberately excludes private memory, plans, ownership, and leases. */
export type AgentRunView = Pick<
  AgentRun,
  | "schemaVersion"
  | "id"
  | "revision"
  | "status"
  | "error"
  | "model"
  | "updatedAt"
> & {
  events: AgentEvent[];
  nextActor: string;
  count: number;
  maxSteps: number;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    elapsedMs: number;
  };
};
export function runView(run: AgentRun): AgentRunView {
  const receipts = Object.values(run.attemptReceipts ?? run.receipts);
  const tokens = (key: "inputTokens" | "outputTokens") =>
    receipts.length === run.attempts &&
    receipts.length &&
    receipts.every(
      (receipt) => receipt[key] !== null && receipt[`${key}Complete`] !== false,
    )
      ? receipts.reduce((sum, receipt) => sum + (receipt[key] ?? 0), 0)
      : null;
  return {
    schemaVersion: 1,
    id: run.id,
    revision: run.revision,
    status: run.status,
    error: run.error,
    model: run.model,
    updatedAt: run.updatedAt,
    events: run.events.filter((event) => event.audience === "public"),
    nextActor: (
      run.configuration.agents.find((agent) => agent.id === run.nextActor) ??
      run.configuration.agents[
        run.events.length % run.configuration.agents.length
      ]
    ).name,
    count: run.events.length,
    maxSteps: run.configuration.maxSteps,
    usage: {
      inputTokens: tokens("inputTokens"),
      outputTokens: tokens("outputTokens"),
      elapsedMs: receipts.reduce((sum, receipt) => sum + receipt.elapsedMs, 0),
    },
  };
}
