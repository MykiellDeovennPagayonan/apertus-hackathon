import {
  operations,
  templateDemo,
} from "../../simulations/runtime/capabilities";
import { validateValue } from "../../simulations/runtime/parameterSchema";
import { parseRecipe, type Recipe } from "../../simulations/runtime/resolver";
import type { DemoType } from "../../simulations/runtime/types";

export { operations as commandSpecs } from "../../simulations/runtime/capabilities";
export function isDemo(value: unknown): value is DemoType {
  return typeof value === "string" && Object.hasOwn(operations, value);
}
export interface ExperimentContext {
  sessionId: string;
  revision: number;
  composition: { ref: string; version: 1 };
  instances: {
    id: string;
    label: string;
    parameters: Record<string, unknown>;
    outputs: Record<string, unknown>;
    actions: string[];
  }[];
  views: string[];
  assumptions: string[];
}
export type TargetedCommand = {
  target: string;
  action: string;
  arguments: Record<string, unknown>;
};
export type Plan =
  | (Recipe & { operation: "create"; message: string })
  | {
      schemaVersion: 1;
      operation: "edit";
      sessionId: string;
      expectedRevision: number;
      commands: TargetedCommand[];
      message: string;
    }
  | { schemaVersion: 1; operation: "clarify"; message: string }
  | { schemaVersion: 1; operation: "unsupported"; message: string };
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
function keys(data: Record<string, unknown>, allowed: string[]) {
  // Allow and strip benign auxiliary keys often emitted by LLMs (e.g. explanation, reasoning, thought)
  const ignoredAuxiliary = ["explanation", "reasoning", "thought", "notes"];
  for (const aux of ignoredAuxiliary) {
    if (aux in data && !allowed.includes(aux)) {
      delete data[aux];
    }
  }
  const unexpected = Object.keys(data).filter((k) => !allowed.includes(k));
  if (unexpected.length > 0)
    throw new Error(`Unknown plan field: ${unexpected.join(", ")}`);
}
/** Bound nesting and all data that can enter model instructions. */
export function validateContext(value: unknown): ExperimentContext | null {
  if (value === null || value === undefined) return null;
  if (!record(value)) throw new Error("Invalid experiment context");
  let nodes = 0;
  const bounded = (v: unknown, depth = 0): void => {
    if (++nodes > 800 || depth > 6)
      throw new Error("Context exceeds nesting or node limits");
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number" && Number.isFinite(v)) return;
    if (typeof v === "string" && v.length <= 500) return;
    if (Array.isArray(v) && v.length <= 30) {
      v.forEach((c) => {
        bounded(c, depth + 1);
      });
      return;
    }
    if (
      record(v) &&
      Object.keys(v).length <= 30 &&
      Object.keys(v).every((k) => k.length <= 100)
    ) {
      Object.values(v).forEach((c) => {
        bounded(c, depth + 1);
      });
      return;
    }
    throw new Error("Invalid bounded context value");
  };
  bounded(value);
  keys(value, [
    "sessionId",
    "revision",
    "composition",
    "instances",
    "views",
    "assumptions",
  ]);
  if (
    typeof value.sessionId !== "string" ||
    !value.sessionId ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !record(value.composition) ||
    value.composition.version !== 1 ||
    typeof value.composition.ref !== "string"
  )
    throw new Error("Missing session identity or revision");
  keys(value.composition, ["ref", "version"]);
  templateDemo(value.composition.ref);
  if (
    !Array.isArray(value.instances) ||
    value.instances.length < 1 ||
    value.instances.length > 30 ||
    !Array.isArray(value.views) ||
    !value.views.every((v) => typeof v === "string") ||
    !Array.isArray(value.assumptions) ||
    !value.assumptions.every((v) => typeof v === "string")
  )
    throw new Error("Invalid context bindings");
  const seen = new Set<string>();
  for (const i of value.instances) {
    if (
      !record(i) ||
      typeof i.id !== "string" ||
      !i.id ||
      seen.has(i.id) ||
      typeof i.label !== "string" ||
      !record(i.parameters) ||
      !record(i.outputs) ||
      !Array.isArray(i.actions) ||
      !i.actions.every((a) => typeof a === "string")
    )
      throw new Error("Invalid exposed instance");
    keys(i, ["id", "label", "parameters", "outputs", "actions"]);
    seen.add(i.id);
  }
  return value as unknown as ExperimentContext;
}
export function parsePlan(
  input: unknown,
  currentDemo?: DemoType | null,
  context?: ExperimentContext | null,
): Plan {
  if (!record(input)) throw new Error("Plan must be a JSON object");
  if (input.schemaVersion !== 1)
    throw new Error(
      "Required schemaVersion must equal 1 on ALL outcomes, including clarify and unsupported",
    );
  if (
    typeof input.message !== "string" ||
    !input.message.trim() ||
    input.message.length > 500
  )
    throw new Error(
      "message must be a nonempty display string of at most 500 characters",
    );
  if (input.operation === "create") {
    keys(input, [
      "schemaVersion",
      "operation",
      "composition",
      "parameters",
      "instances",
      "views",
      "message",
    ]);
    const { operation: _operation, message: _message, ...recipe } = input;
    const parsed = parseRecipe(JSON.stringify(recipe));
    if (currentDemo && templateDemo(parsed.composition.ref) !== currentDemo)
      throw new Error(
        "Creation would replace the active model; begin a new experiment first",
      );
    return input as unknown as Plan;
  }
  if (input.operation === "edit") {
    keys(input, [
      "schemaVersion",
      "operation",
      "sessionId",
      "expectedRevision",
      "commands",
      "message",
    ]);
    if (
      typeof input.sessionId !== "string" ||
      input.sessionId.length > 100 ||
      !input.sessionId ||
      !Number.isSafeInteger(input.expectedRevision) ||
      Number(input.expectedRevision) < 0 ||
      !Array.isArray(input.commands) ||
      input.commands.length < 1 ||
      input.commands.length > 8
    )
      throw new Error("Invalid edit envelope");
    const demo =
      currentDemo ?? (context ? templateDemo(context.composition.ref) : null);
    if (!demo) throw new Error("Edit requires an active experiment");
    if (
      context &&
      (input.sessionId !== context.sessionId ||
        input.expectedRevision !== context.revision)
    )
      throw new Error("Stale session or configuration revision");
    for (const [index, c] of input.commands.entries()) {
      if (
        !record(c) ||
        typeof c.action !== "string" ||
        typeof c.target !== "string" ||
        !c.target ||
        c.target.length > 100
      )
        throw new Error(`commands[${index}]: invalid command`);
      keys(c, ["action", "target", "arguments"]);
      const op = operations[demo][c.action];
      if (!op) throw new Error(`${c.action}: unsupported ${demo} operation`);
      validateValue(op.arguments, c.arguments, `commands[${index}].arguments`);
      if (
        context &&
        c.target !== "session" &&
        !context.instances.some((i) => i.id === c.target)
      )
        throw new Error(`${c.target}: unknown target`);
    }
    return input as unknown as Plan;
  }
  if (input.operation === "clarify" || input.operation === "unsupported") {
    keys(input, ["schemaVersion", "operation", "message"]);
    return input as unknown as Plan;
  }
  throw new Error("Unknown plan outcome");
}
export function parseModelContent(
  content: string,
  demo?: DemoType | null,
  context?: ExperimentContext | null,
) {
  if (content.length > 16000)
    throw new Error("Model output exceeds size limit");
  let text = content.trim();
  // Strip markdown code fence if present
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    // If model wrapped JSON in conversational text or <think> tags, extract the outer JSON object
    const jsonMatch = text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      text = jsonMatch[1].trim();
    }
  }
  return parsePlan(JSON.parse(text), demo, context);
}

