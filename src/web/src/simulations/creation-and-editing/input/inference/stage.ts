import type { GenerationBudget } from "../../budget";
import type { TeachingIntent } from "../../intent-interpreter/contracts";
import type { GenerationRequest } from "../contracts";
import { parseStageJson, stageMessages } from "./messages";
import { requestStructured } from "./transport";
export async function requestStage<T>(
  task: string,
  request: GenerationRequest,
  budget: GenerationBudget,
  schema: Record<string, unknown>,
  contract: unknown,
  parse: (value: unknown) => T,
  intent?: TeachingIntent,
  relevant?: unknown,
  maxTokens = 768,
  verify?: (result: T) => void,
) {
  budget.check();
  const messages = stageMessages(
    task,
    request.prompt,
    { ...(contract as object), responseSchema: schema },
    intent,
    relevant,
  );
  budget.trace?.("stage", {
    task,
    inputCharacters: JSON.stringify(messages).length,
    promptTokens: null,
  });
  return requestStructured(
    messages,
    (content) => {
      let value = parseStageJson(
        content,
        schema.type === "array" ? "array" : "object",
      );
      const wrappers: string[] = [];
      for (let depth = 0; depth < 2; depth++) {
        if (!value || typeof value !== "object" || Array.isArray(value)) break;
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record);
        const key = keys[0];
        const argumentStage = task === "runtime_command_arguments";
        const declared = (schema.properties ?? {}) as Record<string, unknown>;
        if (
          keys.length === 1 &&
          !(key in declared) &&
          (key === task ||
            (argumentStage && ["arguments", "command_arguments"].includes(key)))
        ) {
          value = record[key];
          wrappers.push(key);
        } else if (
          argumentStage &&
          (keys.length === 2 || keys.length === 3) &&
          keys.includes("command") &&
          keys.includes("arguments") &&
          keys.every((key) => ["command", "arguments", "node"].includes(key)) &&
          (!("node" in record) ||
            record.node ===
              (contract as { selected?: { node?: string } }).selected?.node) &&
          !("command" in declared) &&
          record.command ===
            (contract as { selected?: { command?: string } }).selected?.command
        ) {
          value = record.arguments;
          wrappers.push("matching selected command");
        } else break;
      }
      const result = parse(value);
      if (wrappers.length) {
        budget.trace?.(`${task}.formatNormalized`, {
          kind: "bounded known stage or argument envelope",
          stage: task,
          wrappers,
        });
      }
      return result;
    },
    `Return only this stage's schema, preserving the original constraints. Do not repeat valid prior operations.${
      task === "teaching_intent"
        ? " Keep each of concepts, interactions, and observations to at most THREE concise entries. Combine related concepts into one entry. Do not list individual terms as separate concepts. This is a compact intent summary, not a glossary."
        : task === "runtime_command_arguments"
          ? " Return only the selected command's argument object. The application owns the command envelope. Close each nested argument object before the root object."
          : task === "authoring_arguments"
            ? " For operations, close the arguments object with }, then the operation object with }, then the operations array with ], and finally the root object with }."
            : ""
    }`,
    budget.signal,
    {
      budget,
      schema,
      maxTokens,
      stage: task,
      verify,
      onEvent: (event, data) => budget.trace?.(`${task}.${event}`, data),
    },
  );
}
