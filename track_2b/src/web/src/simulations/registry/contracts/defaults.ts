import type { ParameterSchema } from "./parameterSchema";
export function schemaDefault(schema: ParameterSchema): unknown {
  switch (schema.type) {
    case "number":
    case "integer":
      return Math.max(schema.minimum, Math.min(schema.maximum, 1));
    case "boolean":
      return false;
    case "enum":
      return schema.values[0];
    case "string":
      return schema.enum?.[0] ?? "";
    case "array":
      return Array.from({ length: schema.minItems }, () =>
        schemaDefault(schema.items),
      );
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties)
          .filter(([key]) => !schema.optional?.includes(key))
          .map(([key, s]) => [key, schemaDefault(s)]),
      );
  }
}
