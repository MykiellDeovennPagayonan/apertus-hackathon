import type { ParameterSchema } from "../../simulations/runtime/parameterSchema";

export type JsonSchema = Record<string, unknown>;
export function toJsonSchema(schema: ParameterSchema): JsonSchema {
  switch (schema.type) {
    case "number":
    case "integer":
      return {
        type: schema.type,
        minimum: schema.minimum,
        maximum: schema.maximum,
        ...(schema.unit ? { description: `Quantity in ${schema.unit}` } : {}),
      };
    case "boolean":
      return {
        type: "boolean",
        ...(schema.description ? { description: schema.description } : {}),
      };
    case "string":
      return {
        type: "string",
        minLength: schema.minLength ?? 1,
        maxLength: schema.maxLength ?? 100,
        ...(schema.enum ? { enum: [...schema.enum] } : {}),
      };
    case "enum":
      return { enum: [...schema.values] };
    case "array":
      return {
        type: "array",
        items: toJsonSchema(schema.items),
        minItems: schema.minItems,
        maxItems: schema.maxItems,
      };
    case "object":
      return {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          Object.entries(schema.properties).map(([key, field]) => [
            key,
            toJsonSchema(field),
          ]),
        ),
        required: Object.keys(schema.properties).filter(
          (key) => !schema.optional?.includes(key),
        ),
      };
  }
}
