/** Historical fixture decoding only. Not imported by production or live generation. */
import { assemblyModels } from "../../src/simulations/runtime/assembly";
import {
  templateNames,
  templateParameters,
} from "../../src/simulations/runtime/capabilities";
import { type Plan, parsePlan } from "../../src/simulations/runtime/legacyPlan";
import {
  boolean,
  choice,
  object,
  type ParameterSchema,
  validateValue,
} from "../../src/simulations/runtime/parameterSchema";

const text: ParameterSchema = { type: "string", maxLength: 500 };
const texts: ParameterSchema = {
  type: "array",
  items: text,
  minItems: 1,
  maxItems: 6,
};
export interface TeachingIntent {
  schemaVersion: 1;
  kind: "create" | "edit" | "explain" | "unclear" | "unsupported";
  learningGoal: string;
  representation: string;
  relationship: string;
  initialExample: string;
  interactions: string[];
  observations: string[];
  playing: boolean;
  explanation: string;
  assumptions: string[];
}
export function parseTeachingIntent(
  content: string,
  onReferenceNormalization?: (supplied: string, canonical: string) => void,
): TeachingIntent {
  const data = json(content);
  if (
    data &&
    typeof data === "object" &&
    typeof data.representation === "string" &&
    /^(?:compositions|prefabs)\/(?:[A-Za-z][A-Za-z0-9_-]{0,79}\/)?[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(
      data.representation,
    )
  ) {
    const name = data.representation
      .slice(data.representation.lastIndexOf("/") + 1)
      .replace(/Experiment$/, "");
    const providers = assemblyModels.filter(
      (model) => model.ref.slice(model.ref.lastIndexOf("/") + 1) === name,
    );
    // Correct only a unique registered object name in the untrusted intent.
    // Executable recipe references still require exact providers in the compiler.
    if (providers.length === 1 && data.representation !== providers[0].ref) {
      onReferenceNormalization?.(data.representation, providers[0].ref);
      data.representation = providers[0].ref;
    }
  }
  validateValue(
    object({
      schemaVersion: choice(1),
      kind: choice("create", "edit", "explain", "unclear", "unsupported"),
      learningGoal: text,
      representation: choice(
        ...Object.values(templateNames).map((id) => `compositions/${id}`),
        ...assemblyModels.map((m) => m.ref),
        "unsupported",
      ),
      relationship: text,
      initialExample: text,
      interactions: texts,
      observations: texts,
      playing: boolean,
      explanation: text,
      assumptions: texts,
    }),
    data,
    "teachingIntent",
  );
  return data as TeachingIntent;
}
function json(content: string) {
  if (content.length > 16000)
    throw new Error("Creation response exceeds size limit");
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/, "$1");
  try {
    return JSON.parse(normalized);
  } catch (error) {
    // Accept an intact, schema-validated JSON object followed by at most four
    // inert repeated closing delimiters. Never repair its contents, add data,
    // accept prose/code, or select between multiple complete objects.
    for (let count = 1; count <= 4; count++) {
      const suffix = normalized.slice(-count),
        prefix = normalized.slice(0, -count).trimEnd();
      if (/^[}\]"]+$/.test(suffix) && prefix.endsWith("}")) {
        try {
          return JSON.parse(prefix);
        } catch {
          /* Keep the original parse error. */
        }
      }
    }
    throw error;
  }
}
type Configuration =
  | { outcome: "configuration"; plan: Extract<Plan, { operation: "create" }> }
  | { outcome: "clarify" | "unsupported" | "conflict"; message: string };
export function parseConfiguration(
  content: string,
  selected: string,
  presentation = "measurements",
  structure: "single" | "comparison" = "single",
): Configuration {
  const data = json(content);
  if (data?.outcome !== "configuration") {
    validateValue(
      object({
        schemaVersion: choice(1),
        outcome: choice("clarify", "unsupported", "conflict"),
        message: text,
      }),
      data,
    );
    return data;
  }
  if (assemblyModels.some((m) => m.ref === selected)) {
    if (data.confirmedComposition !== selected)
      return {
        outcome: "conflict",
        message: "Selected mechanism differs from interpreted request.",
      };
    const model = assemblyModels.find((m) => m.ref === selected);
    if (!model) throw new Error("Unavailable selected mechanism");
    let assembly = data.assembly;
    if (Object.hasOwn(data, "objects")) {
      // Local Apertus occasionally annotates a registered output with its
      // current value (for example, "equation: 2x + 3 = 11" or "saltMass=10g") even though the
      // wire contract asks for output-name strings. Canonicalize only an exact
      // registered prefix; unrelated or invented names still fail validation.
      if (Array.isArray(data.objects))
        for (const candidate of data.objects) {
          if (!candidate || typeof candidate !== "object") continue;
          if (!Array.isArray(candidate.observations)) continue;
          candidate.observations = candidate.observations.map(
            (observation: unknown) => {
              if (typeof observation !== "string") return observation;
              const name = observation.split(/[:=]/, 1)[0].trim();
              return Object.hasOwn(model.outputs, name) ? name : observation;
            },
          );
        }
      validateValue(
        object(
          {
            schemaVersion: choice(1),
            outcome: choice("configuration"),
            confirmedComposition: text,
            title: { type: "string", maxLength: 100 },
            learningGoal: text,
            objects: {
              type: "array",
              minItems: 1,
              maxItems: model.maximumInstances,
              items: object({
                id: { type: "string", maxLength: 60 },
                label: { type: "string", maxLength: 100 },
                parameters: model.parameters,
                observations: {
                  type: "array",
                  minItems: 1,
                  maxItems: 12,
                  items: choice(...Object.keys(model.outputs)),
                },
              }),
            },
            message: text,
          },
          ["message"],
        ),
        data,
      );
      const objects = data.objects as {
        id: string;
        label: string;
        parameters: Record<string, unknown>;
        observations: string[];
      }[];
      if (structure === "single" && objects.length !== 1)
        throw new Error(
          "Laya selected one editable object; objects must contain exactly one item",
        );
      if (structure === "comparison" && objects.length < 2)
        throw new Error(
          "Laya selected an independent comparison; objects must contain at least two items",
        );
      const observations = objects.flatMap((i) =>
        i.observations.map((output) => ({
          id: `${i.id}/${output}`,
          instance: i.id,
          output,
          unit: model.outputs[output].unit,
        })),
      );
      assembly = {
        version: 1,
        title: data.title,
        learningGoal: data.learningGoal,
        instances: objects.map((i) => ({
          id: i.id,
          label: i.label,
          prefab: { ref: selected, version: 1 },
          parameters: i.parameters,
        })),
        observations,
        connections: observations.map((o) => ({
          type: "observation-source",
          from: { instance: o.instance, output: o.output },
          to: o.id,
        })),
        controls: objects.flatMap((i) =>
          Object.keys(model.actions).map((action) => ({
            instance: i.id,
            action,
          })),
        ),
        views: [
          {
            ref: "views/AssemblyScene",
            observations: observations.map((o) => o.id),
          },
          {
            ref: "views/AssemblyTable",
            observations: observations.map((o) => o.id),
          },
          ...(presentation === "graph"
            ? [
                {
                  ref: "views/AssemblyGraph",
                  observations: observations
                    .filter((o) => o.output === model.graphOutput)
                    .map((o) => o.id),
                },
              ]
            : []),
        ],
      };
    } else {
      validateValue(
        object({
          schemaVersion: choice(1),
          outcome: choice("configuration"),
          confirmedComposition: text,
          assembly: { type: "object", properties: {} },
          message: text,
        }),
        { ...data, assembly: {} },
      );
    }
    const plan = parsePlan({
      schemaVersion: 1,
      operation: "create",
      composition: { ref: "assemblies/GeneratedExperiment", version: 1 },
      parameters: {},
      assembly,
      message: data.message ?? data.learningGoal,
    });
    if (
      plan.operation !== "create" ||
      !plan.assembly ||
      plan.assembly.instances.some((i) => i.prefab.ref !== selected)
    )
      throw new Error("Configuration must use selected registered mechanism");
    return { outcome: "configuration", plan };
  }
  validateValue(
    object({
      schemaVersion: choice(1),
      outcome: choice("configuration"),
      confirmedComposition: text,
      parameters: templateParameters(selected),
      message: text,
    }),
    data,
  );
  if (data.confirmedComposition !== selected)
    return {
      outcome: "conflict",
      message:
        "The selected assembly does not match the independently interpreted intent.",
    };
  const plan = parsePlan({
    schemaVersion: 1,
    operation: "create",
    composition: { ref: selected, version: 1 },
    parameters: data.parameters,
    message: data.message,
  });
  if (plan.operation !== "create") throw new Error("Expected creation");
  return { outcome: "configuration", plan };
}
