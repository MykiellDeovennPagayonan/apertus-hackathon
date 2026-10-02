/** Serializable schema vocabulary. No callbacks or executable model content. */
export type ParameterSchema =
  | {
      type: "number" | "integer";
      minimum: number;
      maximum: number;
      unit?: string;
    }
  | { type: "boolean"; description?: string }
  | { type: "string"; enum?: readonly string[]; maxLength?: number }
  | { type: "enum"; values: readonly (number | string | null)[] }
  | {
      type: "object";
      properties: Record<string, ParameterSchema>;
      optional?: readonly string[];
    }
  | {
      type: "array";
      items: ParameterSchema;
      minItems: number;
      maxItems: number;
    };
export const num = (
  minimum: number,
  maximum: number,
  unit = "",
  integer = false,
): ParameterSchema => ({
  type: integer ? "integer" : "number",
  minimum,
  maximum,
  unit,
});
export const choice = (
  ...values: (string | number | null)[]
): ParameterSchema => ({ type: "enum", values });
export const object = (
  properties: Record<string, ParameterSchema>,
  optional: readonly string[] = [],
): ParameterSchema => ({ type: "object", properties, optional });
export const boolean: ParameterSchema = { type: "boolean" };
export const identity: ParameterSchema = { type: "string", maxLength: 100 };
export function validateValue(
  schema: ParameterSchema,
  value: unknown,
  path = "value",
): void {
  const fail = (reason: string): never => {
    throw new Error(`${path}: ${reason}`);
  };
  switch (schema.type) {
    case "number":
    case "integer":
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < schema.minimum ||
        value > schema.maximum ||
        (schema.type === "integer" && !Number.isInteger(value))
      )
        fail(
          `expected ${schema.type} ${schema.minimum}–${schema.maximum} ${schema.unit ?? ""}`,
        );
      break;
    case "boolean":
      if (typeof value !== "boolean") fail("expected boolean");
      break;
    case "string":
      if (
        typeof value !== "string" ||
        !value.length ||
        value.length > (schema.maxLength ?? 100) ||
        (schema.enum && !schema.enum.includes(value))
      )
        fail("unknown or invalid string");
      break;
    case "enum":
      if (!schema.values.includes(value as string | number | null))
        fail(`expected one of ${schema.values.join(", ")}`);
      break;
    case "array":
      if (
        !Array.isArray(value) ||
        value.length < schema.minItems ||
        value.length > schema.maxItems
      )
        fail(`expected ${schema.minItems}–${schema.maxItems} items`);
      (value as unknown[]).forEach((v, i) => {
        validateValue(schema.items, v, `${path}[${i}]`);
      });
      break;
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value))
        fail("expected object");
      const data = value as Record<string, unknown>;
      for (const key of Object.keys(data))
        if (!Object.hasOwn(schema.properties, key))
          fail(`unknown field ${key}`);
      for (const [key, field] of Object.entries(schema.properties)) {
        if (!Object.hasOwn(data, key) && schema.optional?.includes(key))
          continue;
        validateValue(field, data[key], `${path}.${key}`);
      }
    }
  }
}
