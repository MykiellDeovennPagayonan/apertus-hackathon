import { publicDefinition } from "../../simulations/components/catalog";
import type { ScopedCommand } from "../../simulations/runtime/authoring/runtime";
import type { CompositeRecipe } from "../../simulations/runtime/authoring/types";
import {
  assertData,
  validateAuthoredDocument,
} from "../../simulations/runtime/authoring/validate";
import {
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { parseRecipe } from "../../simulations/runtime/recipes/schema";

export const REQUEST_BYTE_LIMIT = 1_100_000;
const text = (maxLength = 500, minLength = 1): ParameterSchema => ({
  type: "string",
  minLength,
  maxLength,
});
const strings = (maxItems = 12): ParameterSchema => ({
  type: "array",
  minItems: 0,
  maxItems,
  items: text(),
});
export type Coverage = {
  level: "full" | "partial";
  covered: string[];
  omitted: string[];
  explanation: string;
};
export type TeachingIntent = {
  goal: string;
  concepts: string[];
  interactions: string[];
  observations: string[];
  explicitConstraints: { meaning: string; sourceText: string }[];
  suggestedStructure: "single" | "comparison";
};
export const intentSchema = object({
  goal: text(),
  concepts: strings(8),
  interactions: strings(8),
  observations: strings(8),
  explicitConstraints: {
    type: "array",
    minItems: 0,
    maxItems: 12,
    items: object({ meaning: text(), sourceText: text() }),
  },
  suggestedStructure: { type: "enum", values: ["single", "comparison"] },
});
export const coverageSchema = object({
  level: { type: "enum", values: ["full", "partial"] },
  covered: strings(),
  omitted: strings(),
  explanation: text(1500, 0),
});
export type GenerationRequest = {
  protocolVersion: 1;
  requestId: string;
  prompt: string;
  viewport: { width: number; height: number };
  active: null | {
    sessionId: string;
    authoredRevision: number;
    interactionRevision: number;
    recipe: CompositeRecipe;
    runtimeContext: Record<string, unknown>;
  };
};
export type GenerationResult =
  | {
      protocolVersion: 1;
      status: "created" | "updated";
      requestId: string;
      expectedSessionId: string | null;
      expectedAuthoredRevision: number | null;
      expectedInteractionRevision?: number;
      recipe: CompositeRecipe;
      coverage: Coverage;
    }
  | {
      protocolVersion: 1;
      status: "runtime_action";
      requestId: string;
      expectedSessionId: string;
      expectedInteractionRevision: number;
      commands: ScopedCommand[];
      message: string;
    }
  | {
      protocolVersion: 1;
      status: "unsupported";
      requestId: string;
      message: string;
    }
  | {
      protocolVersion: 1;
      status: "failed";
      requestId: string;
      message: string;
      retryable: boolean;
    };

export function record(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a JSON object");
}
export function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("Unknown protocol field");
}
export function identity(value: unknown) {
  validateValue(text(100), value, "identity");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_:.-]*$/.test(value as string))
    throw new Error("Invalid identity");
}
export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error("Invalid revision");
}
export function boundedRuntimeContext(
  value: unknown,
): asserts value is Record<string, unknown> {
  record(value);
  let count = 0;
  const visit = (v: unknown, depth = 0) => {
    if (++count > 800 || depth > 6)
      throw new Error("Runtime context exceeds bounds");
    if (
      v === null ||
      typeof v === "boolean" ||
      (typeof v === "number" && Number.isFinite(v))
    )
      return;
    if (typeof v === "string" && v.length <= 500) return;
    if (Array.isArray(v) && v.length <= 12) {
      v.forEach((item) => {
        visit(item, depth + 1);
      });
      return;
    }
    if (
      v &&
      typeof v === "object" &&
      Object.keys(v).length <= 30 &&
      Object.keys(v).every((k) => k.length <= 160)
    ) {
      Object.values(v).forEach((item) => {
        visit(item, depth + 1);
      });
      return;
    }
    throw new Error("Invalid runtime context value");
  };
  assertData(value);
  visit(value);
}
export function parseGenerationRequest(value: unknown): GenerationRequest {
  record(value);
  exactKeys(value, [
    "protocolVersion",
    "requestId",
    "prompt",
    "viewport",
    "active",
  ]);
  if (value.protocolVersion !== 1)
    throw new Error("Unsupported generation protocol");
  identity(value.requestId);
  validateValue(text(4000), value.prompt, "prompt");
  if (!(value.prompt as string).trim())
    throw new Error("Prompt must not be blank");
  validateValue(
    object({
      width: num(240, 10000, "px", true),
      height: num(240, 10000, "px", true),
    }),
    value.viewport,
    "viewport",
  );
  if (value.active !== null) {
    record(value.active);
    exactKeys(value.active, [
      "sessionId",
      "authoredRevision",
      "interactionRevision",
      "recipe",
      "runtimeContext",
    ]);
    identity(value.active.sessionId);
    revision(value.active.authoredRevision);
    revision(value.active.interactionRevision);
    const recipe = parseRecipe(value.active.recipe);
    if (recipe.recipeVersion !== 2)
      throw new Error("Active recipe must be fully expanded");
    validateAuthoredDocument(recipe.document, true);
    boundedRuntimeContext(value.active.runtimeContext);
    value = { ...value, active: { ...value.active, recipe } };
  }
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength >
    REQUEST_BYTE_LIMIT
  )
    throw new Error("Request too large");
  return structuredClone(value) as GenerationRequest;
}
export function parseIntentShape(value: unknown): TeachingIntent {
  validateValue(intentSchema, value, "intent");
  return structuredClone(value as TeachingIntent);
}
export function intentSources(prompt: string) {
  const sources: { id: string; text: string }[] = [];
  let start = 0;
  while (start < prompt.length) {
    let end = Math.min(start + 500, prompt.length);
    if (end < prompt.length) {
      const space = prompt.lastIndexOf(" ", end);
      if (space > start) end = space;
    }
    sources.push({
      id: `source-${sources.length + 1}`,
      text: prompt.slice(start, end),
    });
    start = end;
  }
  return sources;
}
export function intentResponseSchema(prompt: string): ParameterSchema {
  if (intentSchema.type !== "object")
    throw new Error("Intent contract must be an object");
  return object({
    ...intentSchema.properties,
    explicitConstraints: {
      type: "array",
      minItems: 0,
      maxItems: 12,
      items: object({
        meaning: text(),
        sourceId: {
          type: "enum",
          values: intentSources(prompt).map((s) => s.id),
        },
      }),
    },
  });
}
export function parseIntentResponse(
  value: unknown,
  prompt: string,
): TeachingIntent {
  validateValue(intentResponseSchema(prompt), value, "intent");
  const response = value as Omit<TeachingIntent, "explicitConstraints"> & {
    explicitConstraints: { meaning: string; sourceId: string }[];
  };
  const sources = new Map(intentSources(prompt).map((s) => [s.id, s.text]));
  return parseIntent(
    {
      ...response,
      explicitConstraints: response.explicitConstraints.map((c) => ({
        meaning: c.meaning,
        sourceText: sources.get(c.sourceId),
      })),
    },
    prompt,
  );
}
export function parseIntent(value: unknown, prompt: string): TeachingIntent {
  const intent = parseIntentShape(value);
  for (const constraint of intent.explicitConstraints)
    if (!prompt.includes(constraint.sourceText))
      throw new Error(
        "Constraint source text must occur in the original request",
      );
  return structuredClone(intent);
}
export function parseCoverage(value: unknown): Coverage {
  validateValue(coverageSchema, value, "coverage");
  const coverage = value as Coverage;
  if (
    !coverage.covered.length ||
    (coverage.level === "full" && coverage.omitted.length) ||
    (coverage.level === "partial" &&
      (!coverage.omitted.length || !coverage.explanation.trim()))
  )
    throw new Error("Inconsistent coverage");
  return structuredClone(coverage);
}
export function parseGenerationResult(
  value: unknown,
  request?: GenerationRequest,
): GenerationResult {
  record(value);
  if (value.protocolVersion !== 1)
    throw new Error("Unsupported generation result");
  identity(value.requestId);
  if (request && value.requestId !== request.requestId)
    throw new Error("Mismatched request identity");
  const base = ["protocolVersion", "requestId", "status"];
  if (value.status === "created" || value.status === "updated") {
    exactKeys(value, [
      ...base,
      "expectedSessionId",
      "expectedAuthoredRevision",
      "expectedInteractionRevision",
      "recipe",
      "coverage",
    ]);
    if (value.expectedSessionId !== null) identity(value.expectedSessionId);
    if (value.expectedAuthoredRevision !== null)
      revision(value.expectedAuthoredRevision);
    if (value.expectedInteractionRevision !== undefined)
      revision(value.expectedInteractionRevision);
    if (
      (value.status === "created" &&
        (value.expectedSessionId !== null ||
          value.expectedAuthoredRevision !== null)) ||
      (value.status === "updated" &&
        (value.expectedSessionId === null ||
          value.expectedAuthoredRevision === null))
    )
      throw new Error("Invalid authoring dependencies");
    const recipe = parseRecipe(value.recipe);
    if (recipe.recipeVersion !== 2 || recipe.nested.length)
      throw new Error("Result must be a complete canonical recipe");
    validateAuthoredDocument(recipe.document, true);
    if (
      !recipe.document.nodes.length ||
      !recipe.document.lesson.title.trim() ||
      !recipe.document.lesson.instruction.trim()
    )
      throw new Error("Result has no learner content");
    const coverage = parseCoverage(value.coverage);
    if (
      coverage.level === "partial" &&
      !recipe.document.lesson.explanation.includes(coverage.explanation)
    )
      throw new Error("Coverage limitations must persist in lesson content");
    if (
      request &&
      value.status === "updated" &&
      (value.expectedSessionId !== request.active?.sessionId ||
        value.expectedAuthoredRevision !== request.active?.authoredRevision)
    )
      throw new Error("Result does not match authoring dependencies");
    return { ...value, recipe, coverage } as GenerationResult;
  }
  if (value.status === "runtime_action") {
    exactKeys(value, [
      ...base,
      "expectedSessionId",
      "expectedInteractionRevision",
      "commands",
      "message",
    ]);
    identity(value.expectedSessionId);
    revision(value.expectedInteractionRevision);
    if (
      !Array.isArray(value.commands) ||
      !value.commands.length ||
      value.commands.length > 8
    )
      throw new Error("Invalid runtime command batch");
    for (const command of value.commands) {
      record(command);
      exactKeys(command, ["node", "command", "arguments"]);
      identity(command.node);
      validateValue(text(100), command.command);
      record(command.arguments);
      assertData(command.arguments);
      if (request) {
        const node = request.active?.recipe.document.nodes.find(
          (n) => n.id === command.node,
        );
        const contract =
          node &&
          publicDefinition(node.definition).commands[String(command.command)];
        if (!contract) throw new Error("Unknown runtime command target");
        validateValue(contract.arguments, command.arguments);
      }
    }
    if (
      request &&
      (value.expectedSessionId !== request.active?.sessionId ||
        value.expectedInteractionRevision !==
          request.active?.interactionRevision)
    )
      throw new Error("Result does not match interaction dependencies");
    validateValue(text(1500), value.message);
    return structuredClone(value) as GenerationResult;
  }
  if (value.status === "unsupported" || value.status === "failed") {
    exactKeys(value, [
      ...base,
      "message",
      ...(value.status === "failed" ? ["retryable"] : []),
    ]);
    validateValue(text(1500), value.message);
    if (value.status === "failed" && typeof value.retryable !== "boolean")
      throw new Error("Invalid retry policy");
    return structuredClone(value) as GenerationResult;
  }
  throw new Error("Unknown generation outcome");
}
