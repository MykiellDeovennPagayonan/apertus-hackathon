import {
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import type { CompositeRecipe } from "../authoring-engine/document";
import { assertData, validateAuthoredDocument } from "../validator/document";
import { parseRecipe } from "../validator/parseRecipe";
export const REQUEST_BYTE_LIMIT = 1_100_000;
export const text = (maxLength = 500, minLength = 1): ParameterSchema => ({
  type: "string",
  minLength,
  maxLength,
});
export const strings = (maxItems = 12): ParameterSchema => ({
  type: "array",
  minItems: 0,
  maxItems,
  items: text(),
});
export type GenerationRequest = {
  protocolVersion: 1;
  requestId: string;
  prompt: string;
  purpose?: "create" | "edit";
  clarification?: { prompt: string; question: string };
  destination?: "lesson" | "builder";
  construction?: "live";
  viewport: { width: number; height: number };
  active: null | {
    sessionId: string;
    authoredRevision: number;
    interactionRevision: number;
    recipe: CompositeRecipe;
    runtimeContext: Record<string, unknown>;
  };
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
    "purpose",
    "clarification",
    "destination",
    "construction",
    "viewport",
    "active",
  ]);
  if (value.protocolVersion !== 1)
    throw new Error("Unsupported generation protocol");
  identity(value.requestId);
  if (
    value.purpose !== undefined &&
    !["create", "edit"].includes(String(value.purpose))
  )
    throw new Error("Invalid request purpose");
  if (value.clarification !== undefined)
    validateValue(
      object({ prompt: text(4000), question: text(400) }),
      value.clarification,
    );
  if (
    value.destination !== undefined &&
    value.destination !== "lesson" &&
    value.destination !== "builder"
  )
    throw new Error("Invalid generation destination");
  if (
    value.construction !== undefined &&
    (value.construction !== "live" || value.destination !== "builder")
  )
    throw new Error("Live construction requires a builder destination");
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
  record(value);
  if (value.purpose === "edit" && value.active === null)
    throw new Error("Editing requires an active experiment");
  return structuredClone(value) as GenerationRequest;
}
