import type { ComponentInstance } from "../../creation-and-editing/authoring-engine/document";
import type { PublicDefinition } from "./publicDefinition";
import {
  type ParameterSchema,
  validateValue,
} from "./parameterSchema";

export const scalarControls = new Set([
  "controls/Slider",
  "controls/NumberInput",
  "controls/Toggle",
  "controls/Select",
]);
export const activityContracts: Record<
  string,
  { title: string; model: string; command: string }
> = {
  ArithmeticActivity: {
    title: "Arithmetic controls",
    model: "models/arithmetic",
    command: "SET_ARITHMETIC_TASK",
  },
  CountingActivity: {
    title: "Counting controls",
    model: "models/counting",
    command: "SET_COUNTING_TASK",
  },
  GroupingActivity: {
    title: "Equal groups controls",
    model: "models/equal-groups",
    command: "SET_GROUPING_TASK",
  },
  FractionComparisonActivity: {
    title: "Fraction comparison controls",
    model: "models/fraction-builder",
    command: "SET_FRACTION_COMPARISON",
  },
  NumberLineActivity: {
    title: "Fraction number line controls",
    model: "models/fraction-number-line",
    command: "SET_NUMBER_LINE_TASK",
  },
  TrialsActivity: {
    title: "Random trial controls",
    model: "models/probability",
    command: "SET_DISTRIBUTION",
  },
};
export const legacyActivities: Record<string, string> = {
  ArithmeticTask: "ArithmeticActivity",
  CountingTask: "CountingActivity",
  GroupingTask: "GroupingActivity",
  FractionComparison: "FractionComparisonActivity",
  NumberLineTask: "NumberLineActivity",
  TrialTask: "TrialsActivity",
};
export const retiredControls = new Set([
  "controls/ExplorationTask",
  ...Object.keys(legacyActivities).map((name) => `controls/${name}`),
]);
export function activityContract(definition: string) {
  const name = definition.split("/")[1];
  return activityContracts[legacyActivities[name] ?? name];
}
export function hasControlSettings(definition: string) {
  return (
    scalarControls.has(definition) ||
    !!activityContract(definition) ||
    definition === "controls/Form" ||
    definition === "controls/Button"
  );
}
export function acceptsScalar(definition: string, schema: ParameterSchema) {
  if (definition === "controls/Slider" || definition === "controls/NumberInput")
    return schema.type === "number" || schema.type === "integer";
  if (definition === "controls/Toggle") return schema.type === "boolean";
  if (definition === "controls/Select")
    return (
      schema.type === "enum" || (schema.type === "string" && !!schema.enum)
    );
  return false;
}
export function parameterLeaves(
  schema: ParameterSchema,
  prefix = "",
): { path: string; schema: ParameterSchema }[] {
  if (schema.type !== "object") return prefix ? [{ path: prefix, schema }] : [];
  return Object.entries(schema.properties).flatMap(([key, child]) =>
    parameterLeaves(child, prefix ? `${prefix}.${key}` : key),
  );
}
export function scalarBinding(
  node: ComponentInstance,
  schema: ParameterSchema,
) {
  const leaves = parameterLeaves(schema).filter((leaf) =>
    acceptsScalar(node.definition, leaf.schema),
  );
  const path = String(node.configuration.parameter ?? "");
  const binding = path
    ? leaves.find((leaf) => leaf.path === path)
    : leaves.length === 1
      ? leaves[0]
      : undefined;
  if (!binding)
    throw new Error(
      path
        ? `${node.label}: ${path} is not a compatible parameter.`
        : `${node.label}: choose one compatible parameter in control settings.`,
    );
  if (binding.schema.type === "number" || binding.schema.type === "integer") {
    const minimum = Number(node.configuration.min ?? binding.schema.minimum);
    const maximum = Number(node.configuration.max ?? binding.schema.maximum);
    const step = node.configuration.step;
    if (
      minimum < binding.schema.minimum ||
      maximum > binding.schema.maximum ||
      minimum >= maximum
    )
      throw new Error(
        `${node.label}: bounds must stay within ${binding.schema.minimum}–${binding.schema.maximum}, with minimum below maximum.`,
      );
    if (
      step !== undefined &&
      (Number(step) <= 0 ||
        (binding.schema.type === "integer" && !Number.isInteger(step)))
    )
      throw new Error(
        `${node.label}: step must be positive${binding.schema.type === "integer" ? " and a whole number" : ""}.`,
      );
    return { ...binding, schema: { ...binding.schema, minimum, maximum } };
  }
  return binding;
}
export function readParameter(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === "object" && Object.hasOwn(current, key)
          ? (current as Record<string, unknown>)[key]
          : undefined,
      value,
    );
}
export function writeParameter(
  value: Record<string, unknown>,
  path: string,
  next: unknown,
) {
  const result = structuredClone(value);
  const keys = path.split(".");
  if (
    keys.some(
      (key) => !key || ["__proto__", "constructor", "prototype"].includes(key),
    )
  )
    throw new Error("Invalid parameter path");
  let current = result;
  for (const key of keys.slice(0, -1)) {
    if (
      !current[key] ||
      typeof current[key] !== "object" ||
      Array.isArray(current[key])
    )
      current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = next;
  return result;
}
export function validateControlConnection(
  node: ComponentInstance,
  target: ComponentInstance,
  command: string,
  definition: PublicDefinition,
) {
  const contract = activityContract(node.definition);
  if (
    contract &&
    (target.definition !== contract.model || command !== contract.command)
  )
    throw new Error(
      `${node.label}: connect to ${contract.model} · ${contract.command}.`,
    );
  if (scalarControls.has(node.definition))
    scalarBinding(node, definition.commands[command].arguments);
  if (
    node.definition === "controls/Form" &&
    Array.isArray(node.configuration.fields)
  ) {
    const leaves = parameterLeaves(definition.commands[command].arguments);
    const seen = new Set<string>();
    for (const field of node.configuration.fields as {
      parameter: string;
      widget: string;
    }[]) {
      const leaf = leaves.find(
        (candidate) => candidate.path === field.parameter,
      );
      if (
        !leaf ||
        seen.has(field.parameter) ||
        (field.widget !== "Field" &&
          !acceptsScalar(`controls/${field.widget}`, leaf.schema))
      )
        throw new Error(
          `${node.label}: incompatible or duplicate group field ${field.parameter}.`,
        );
      seen.add(field.parameter);
    }
  }
}
export function validateScalarValue(
  node: ComponentInstance,
  schema: ParameterSchema,
  value: unknown,
) {
  const binding = scalarBinding(node, schema);
  validateValue(binding.schema, value);
  return binding;
}
