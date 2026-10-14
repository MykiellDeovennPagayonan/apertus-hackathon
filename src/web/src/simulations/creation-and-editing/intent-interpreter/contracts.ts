import {
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { strings, text } from "../input/contracts";
export type TeachingIntent = {
  goal: string;
  concepts: string[];
  interactions: string[];
  observations: string[];
  requestedInputs?: string[];
  requestedOutputs?: string[];
  explicitConstraints: { meaning: string; sourceText: string }[];
  suggestedStructure: "single" | "comparison";
  instanceCount?: number;
  comparisonConditions?: "same" | "different" | "unspecified";
  question?: string;
};
export const intentSchema = object(
  {
    goal: text(),
    concepts: strings(8),
    interactions: strings(8),
    observations: strings(8),
    requestedInputs: strings(8),
    requestedOutputs: strings(8),
    explicitConstraints: {
      type: "array",
      minItems: 0,
      maxItems: 12,
      items: object({ meaning: text(), sourceText: text() }),
    },
    suggestedStructure: { type: "enum", values: ["single", "comparison"] },
    instanceCount: num(1, 3, "", true),
    comparisonConditions: choice("same", "different", "unspecified"),
    question: text(180),
  },
  [
    "instanceCount",
    "comparisonConditions",
    "question",
    "requestedInputs",
    "requestedOutputs",
  ],
);
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
  const { requestedOutputs: _outputs, ...properties } = intentSchema.properties;
  return object({
    ...properties,
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
export type EditPlan = {
  mode: "edit" | "runtime" | "new" | "unsupported" | "clarify";
  selections: {
    candidate: string;
    scope: "selected" | "all_matching";
    fields: string[];
    adjustments?: {
      field: string;
      operation: "set" | "scale" | "offset";
      operand: number;
    }[];
    mirror?: string;
  }[];
  message: string;
};
export type EditIntent = Omit<EditPlan, "selections"> & {
  selections: Record<
    string,
    Omit<EditPlan["selections"][number], "candidate" | "adjustments" | "mirror">
  >;
  adjustments?: (NonNullable<
    EditPlan["selections"][number]["adjustments"]
  >[number] & { candidate: string })[];
};
