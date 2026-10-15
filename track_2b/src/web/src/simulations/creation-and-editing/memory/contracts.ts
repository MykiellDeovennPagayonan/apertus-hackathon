import type { JsonSchema } from "../input/inference/structuredSchema";

export type MemoryMode = "off" | "record" | "repair" | "prevent";
export type CorrectionKind = "flat_arguments" | "evaluated_numbers";
export type MemoryContext = {
  tools: string[];
  fields?: Record<string, string>;
  revision: string;
};
export type MemoryIssue = {
  code: string;
  phase: "schema" | "semantic";
  path: string;
  message: string;
  family: string;
};
export type MemoryAttempt = {
  content: string;
  issue?: MemoryIssue;
  accepted: boolean;
  semanticChecked: boolean;
};
export type RepairEpisode = {
  id: string;
  occurrence: string;
  scope: string;
  stage: string;
  contract: string;
  model: string;
  context: MemoryContext;
  schema: JsonSchema;
  attempts: MemoryAttempt[];
  usedLessons: { id: string; revision: number }[];
  complete: boolean;
  outcome: string;
};
export type RepairLesson = {
  id: string;
  key: string;
  scope: string;
  stage: string;
  contract: string;
  family: string;
  kind: CorrectionKind;
  guidance: string;
  revision: number;
};
export interface StageMemory {
  guidance(signal: AbortSignal, preventive?: boolean): Promise<string>;
  injected(): void;
  reject(
    content: string,
    phase: "schema" | "semantic",
    message: string,
    details?: Record<string, unknown>,
  ): void;
  accept(content: string, semanticChecked: boolean): void;
}
export interface RequestMemory {
  begin(
    stage: string | undefined,
    schema: JsonSchema | undefined,
    model: string,
    context?: MemoryContext,
  ): StageMemory | undefined;
  finish(outcome: string): Promise<void>;
}
