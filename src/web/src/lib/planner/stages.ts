import {
  acceptsScalar,
  parameterLeaves,
} from "../../simulations/components/controls/controlContract";
import {
  patchSchema,
  recipeOverrideSchema,
  type ToolRequest,
} from "../../simulations/runtime/authoring/operations";
import { DocumentRuntime } from "../../simulations/runtime/authoring/runtime";
import type { AuthoredDocument } from "../../simulations/runtime/authoring/types";
import { assertData } from "../../simulations/runtime/authoring/validate";
import {
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { premadeRecipe } from "../../simulations/runtime/recipes/registry";
import { type JsonSchema, toJsonSchema } from "../apertus/structuredSchema";
import {
  activeHandles,
  capabilityCards,
  compatibleComponents,
} from "./catalog";
import { normalizeReferences } from "./formatFixer";
import { type Coverage, coverageSchema, exactKeys, record } from "./schema";

const text: ParameterSchema = { type: "string", maxLength: 500 };
const alias: ParameterSchema = { type: "string", maxLength: 32 };
export const lessonSchema = object({
  title: { type: "string", maxLength: 120 },
  instruction: text,
  explanation: { type: "string", minLength: 0, maxLength: 1500 },
});
export function creationSchema(slug: string) {
  return object(
    {
      instances: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: object({
          alias,
          overrides: recipeOverrideSchema(premadeRecipe(slug)),
        }),
      },
      coverage: coverageSchema,
      lesson: lessonSchema,
      extend: { type: "boolean" },
    },
    ["lesson", "extend"],
  );
}
export type CreationArguments = {
  instances: { alias: string; overrides: Record<string, unknown> }[];
  coverage: Coverage;
  lesson?: AuthoredDocument["lesson"];
  extend?: boolean;
};
export function parseCreation(value: unknown, slug: string): CreationArguments {
  validateValue(creationSchema(slug), value, "creation");
  const result = value as CreationArguments;
  const aliases = result.instances.map((i) => i.alias);
  if (
    new Set(aliases).size !== aliases.length ||
    aliases.some((v) => !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(v))
  )
    throw new Error("Invalid or duplicate instance alias");
  return structuredClone(result);
}

type AllowedOperation = { tool: ToolRequest["tool"]; schema: ParameterSchema };
export function creationResponseSchema(slug: string): ParameterSchema {
  const schema = creationSchema(slug);
  if (schema.type !== "object" || coverageSchema.type !== "object")
    throw new Error("Creation contracts must be objects");
  const card = capabilityCards().find((c) => c.recipeSlug === slug);
  const covered = coverageSchema.properties.covered;
  if (!card || covered.type !== "array")
    throw new Error("Missing teaching evidence");
  return object(
    {
      instances: schema.properties.instances,
      coverageLevel: coverageSchema.properties.level,
      covered: { ...covered, items: choice(...card.supports) },
      omitted: coverageSchema.properties.omitted,
      explanation: coverageSchema.properties.explanation,
      lesson: schema.properties.lesson,
      extend: schema.properties.extend,
    },
    ["lesson", "extend"],
  );
}
export function parseCreationResponse(
  value: unknown,
  slug: string,
): CreationArguments {
  if (value && typeof value === "object" && "instances" in value) {
    const rawInstances = (value as Record<string, unknown>).instances;
    if (Array.isArray(rawInstances)) {
      for (const inst of rawInstances) {
        if (
          inst &&
          typeof inst === "object" &&
          inst.overrides &&
          typeof inst.overrides === "object"
        ) {
          const ov = inst.overrides as Record<string, unknown>;
          if (slug === "bridge") {
            if (
              typeof ov.magnitude === "string" &&
              /^-?[0-9]+(?:\.[0-9]+)?$/.test(ov.magnitude.trim())
            ) {
              ov.magnitude = Number(ov.magnitude.trim());
            }
            if (typeof ov.magnitude === "number") {
              ov.magnitude = Math.min(30, Math.max(2, ov.magnitude));
            }
            if (
              typeof ov.position === "string" &&
              /^-?[0-9]+(?:\.[0-9]+)?$/.test(ov.position.trim())
            ) {
              ov.position = Number(ov.position.trim());
            }
            if (typeof ov.position === "number") {
              if (ov.position > 0.95) {
                if (ov.magnitude === undefined) {
                  ov.magnitude = Math.min(30, Math.max(2, ov.position));
                  delete ov.position;
                } else {
                  ov.position = 0.95;
                }
              } else if (ov.position < 0.05) {
                ov.position = 0.05;
              }
            }
          }
        }
      }
    }
  }
  validateValue(creationResponseSchema(slug), value, "creationArguments");
  const response = value as Record<string, unknown>;
  return parseCreation(
    {
      instances: response.instances,
      coverage: {
        level: response.coverageLevel,
        covered: response.covered,
        omitted: response.omitted,
        explanation: response.explanation,
      },
      ...(response.lesson === undefined ? {} : { lesson: response.lesson }),
      ...(response.extend === undefined ? {} : { extend: response.extend }),
    },
    slug,
  );
}
export function allowedOperations(
  document: AuthoredDocument,
): AllowedOperation[] {
  const targets = document.layout.children.map((l) => l.node ?? l.id);
  const targetList: ParameterSchema = {
    type: "array",
    minItems: 0,
    maxItems: 24,
    items: choice(...targets),
  };
  const list: AllowedOperation[] = [
    { tool: "set_lesson", schema: lessonSchema },
    {
      tool: "arrange",
      schema: object({
        template: choice("scene-with-sidebar", "comparison", "vertical"),
        main: targetList,
        controls: targetList,
        results: targetList,
        narrowOrder: targetList,
        preserveLocked: { type: "boolean" },
      }),
    },
  ];
  for (const slug of ["arithmetic", "area-perimeter", "bridge"])
    if (
      document.nodes.some(
        (node) =>
          node.definition ===
          (slug === "bridge" ? "models/BridgeResponse" : `models/${slug}`),
      )
    ) {
      const recipe = premadeRecipe(slug);
      list.push({
        tool: "insert_recipe",
        schema: object({
          recipe: choice(slug),
          version: choice(recipe.version),
          alias,
          overrides: recipeOverrideSchema(recipe),
        }),
      });
    }
  for (const handle of activeHandles(document)) {
    const target = choice(handle.target);
    list.push({
      tool: "configure",
      schema: object({
        target,
        changes: patchSchema(handle.configurationSchema),
      }),
    });
    if (handle.definition === "models/BridgeResponse")
      list.push({
        tool: "regenerate_truss",
        schema: object({
          target,
          spanScale: choice(1, 2),
          dense: { type: "boolean" },
        }),
      });
    for (const [command, contract] of Object.entries(handle.commands)) {
      for (const [widget, definition] of [
        ["slider", "controls/Slider"],
        ["number", "controls/NumberInput"],
        ["toggle", "controls/Toggle"],
        ["select", "controls/Select"],
      ] as const) {
        const fields = parameterLeaves(contract.arguments)
          .filter((leaf) => acceptsScalar(definition, leaf.schema))
          .map((leaf) => leaf.path);
        if (fields.length)
          list.push({
            tool: "add_control",
            schema: object({
              target,
              command: choice(command),
              field: choice(...fields),
              widget: choice(widget),
              label: text,
            }),
          });
      }
      if (
        contract.arguments.type === "object" &&
        !Object.keys(contract.arguments.properties).length
      )
        list.push({
          tool: "add_control",
          schema: object({
            target,
            command: choice(command),
            field: choice(""),
            widget: choice("button"),
            label: text,
          }),
        });
    }
    let snapshotOutputs: Record<string, unknown> = {};
    try {
      snapshotOutputs =
        new DocumentRuntime(document).getSnapshot().outputs[handle.target] ??
        {};
    } catch {
      // Document might not be runnable yet
    }
    for (const [output, port] of Object.entries(handle.outputs)) {
      if (port.kind === "value") {
        const val = snapshotOutputs[output];
        const isNumeric =
          (val !== undefined && typeof val === "number") || output === "board";
        const allowedWidgets = isNumeric
          ? (["readout", "inspector"] as const)
          : (["inspector"] as const);
        list.push({
          tool: "add_observation",
          schema: object({
            source: target,
            output: choice(output),
            widget: choice(...allowedWidgets),
            label: text,
          }),
        });
      }
    }
  }
  for (const def of compatibleComponents())
    list.push({
      tool: "insert_component",
      schema: object({
        definition: choice(def.id),
        version: choice(def.version),
        alias,
        configuration: patchSchema(def.configuration),
      }),
    });
  return list;
}
export function followupContract(
  document: AuthoredDocument,
  authored: boolean,
) {
  if (authored) {
    const choices = allowedOperations(document).map((entry) =>
      toJsonSchema(
        object({ tool: choice(entry.tool), arguments: entry.schema }),
      ),
    );
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { enum: ["authored", "unsupported"] },
        operations: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: { anyOf: choices },
        },
        message: toJsonSchema(text),
      },
      required: ["status", "operations", "message"],
    } satisfies JsonSchema;
  }
  const choices = activeHandles(document).flatMap((handle) =>
    Object.entries(handle.commands).map(([command, contract]) =>
      toJsonSchema(
        object({
          node: choice(handle.target),
          command: choice(command),
          arguments: contract.arguments,
        }),
      ),
    ),
  );
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      status: { enum: ["runtime", "unsupported"] },
      commands: {
        type: "array",
        minItems: 0,
        maxItems: 8,
        items: { anyOf: choices },
      },
      message: toJsonSchema(text),
    },
    required: ["status", "commands", "message"],
  } satisfies JsonSchema;
}
export function parseAuthoredFollowup(
  value: unknown,
  document: AuthoredDocument,
) {
  record(value);
  exactKeys(value, ["status", "operations", "message"]);
  validateValue(text, value.message);
  if (
    !["authored", "unsupported"].includes(String(value.status)) ||
    !Array.isArray(value.operations) ||
    value.operations.length > 8 ||
    (value.status === "authored" && !value.operations.length) ||
    (value.status === "unsupported" && value.operations.length)
  )
    throw new Error("Invalid authoring outcome");
  for (let i = 0; i < value.operations.length; i++) {
    const operation = value.operations[i];
    record(operation);
    exactKeys(operation, ["tool", "arguments"]);
    assertData(operation);
    try {
      const normalized = normalizeReferences(
        operation as ToolRequest,
        document.nodes.map((n) => n.id),
        document,
      );
      value.operations[i] = normalized.request;
    } catch {
      // ignore
    }
    const currentOp = value.operations[i] as ToolRequest;
    const possibilities = allowedOperations(document).filter(
      (entry) => entry.tool === currentOp.tool,
    );
    let last: unknown = new Error("Unavailable operation");
    const valid = possibilities.some((entry) => {
      try {
        validateValue(entry.schema, currentOp.arguments);
        return true;
      } catch (error) {
        last = error;
        return false;
      }
    });
    if (!valid) throw last;
  }
  return value as {
    status: "authored" | "unsupported";
    operations: ToolRequest[];
    message: string;
  };
}
export const followupModeSchema = object({
  mode: choice("authored", "runtime", "new", "unsupported"),
});
export const selectionSchema = (slugs: string[]) =>
  object({ selected: choice(...slugs, "unclear") });
export const viewportSchema = object({
  width: num(240, 10000, "px", true),
  height: num(240, 10000, "px", true),
});
