import {
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { CompositeRecipe } from "../authoring-engine/document";
import type { ScopedCommand } from "../runtime-engine/DocumentRuntime";
import { assertData, validateAuthoredDocument } from "../validator/document";
import { parseRecipe } from "../validator/parseRecipe";
import {
  exactKeys,
  type GenerationRequest,
  identity,
  record,
  revision,
  strings,
  text,
} from "./contracts";
export type Coverage = {
  level: "full" | "partial";
  covered: string[];
  omitted: string[];
  explanation: string;
};
export const coverageSchema = object({
  level: { type: "enum", values: ["full", "partial"] },
  covered: strings(),
  omitted: strings(),
  explanation: text(1500, 0),
});
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
      learnerExplanation?: string;
    }
  | {
      protocolVersion: 1;
      status: "updated";
      requestId: string;
      expectedSessionId: string;
      expectedAuthoredRevision: number;
      expectedInteractionRevision?: number;
      recipe: CompositeRecipe;
      coverage?: Coverage;
      learnerExplanation?: string;
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
      status: "clarification";
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
export function parseCoverage(value: unknown): Coverage {
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (Array.isArray(rec.covered) && rec.covered.length > 12) {
      rec.covered = rec.covered.slice(0, 12);
    }
    if (Array.isArray(rec.omitted) && rec.omitted.length > 12) {
      rec.omitted = rec.omitted.slice(0, 12);
    }
  }
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
    const allowed = [
      ...base,
      "expectedSessionId",
      "expectedAuthoredRevision",
      "expectedInteractionRevision",
      "recipe",
      "coverage",
    ];
    if (Object.hasOwn(value, "learnerExplanation")) {
      allowed.push("learnerExplanation");
      if (typeof value.learnerExplanation !== "string")
        throw new Error("Invalid learnerExplanation");
    }
    exactKeys(value, allowed);
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
    const coverage =
      value.status === "updated" && value.coverage === undefined
        ? undefined
        : parseCoverage(value.coverage);
    if (
      coverage?.level === "partial" &&
      !recipe.document.lesson.explanation.includes(coverage.explanation)
    )
      throw new Error("Coverage limitations must persist in lesson content");
    if (
      request &&
      value.status === "updated" &&
      (value.expectedSessionId !== request.active?.sessionId ||
        value.expectedAuthoredRevision !== request.active?.authoredRevision ||
        (value.expectedInteractionRevision !== undefined &&
          value.expectedInteractionRevision !==
            request.active?.interactionRevision))
    )
      throw new Error("Result does not match authoring dependencies");
    return {
      ...value,
      recipe,
      ...(coverage ? { coverage } : {}),
    } as GenerationResult;
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
  if (
    value.status === "unsupported" ||
    value.status === "clarification" ||
    value.status === "failed"
  ) {
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
