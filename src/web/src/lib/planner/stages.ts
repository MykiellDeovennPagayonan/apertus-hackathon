import {
  acceptsScalar,
  parameterLeaves,
} from "../../simulations/components/controls/controlContract";
import {
  patchSchema,
  recipeOverrideSchema,
  type ToolRequest,
} from "../../simulations/runtime/authoring/operations";
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
import { activeHandles, compatibleComponents } from "./catalog";
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
    for (const [output, port] of Object.entries(handle.outputs))
      if (port.kind === "value")
        list.push({
          tool: "add_observation",
          schema: object({
            source: target,
            output: choice(output),
            widget: choice("readout", "inspector"),
            label: text,
          }),
        });
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
  for (const operation of value.operations) {
    record(operation);
    exactKeys(operation, ["tool", "arguments"]);
    assertData(operation);
    const possibilities = allowedOperations(document).filter(
      (entry) => entry.tool === operation.tool,
    );
    let last: unknown = new Error("Unavailable operation");
    const valid = possibilities.some((entry) => {
      try {
        validateValue(entry.schema, operation.arguments);
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
