import type { ParameterSchema } from "../parameterSchema";
export function numericField(schema: ParameterSchema, ...path: string[]) {
  let field = schema;
  for (const key of path) {
    if (field.type !== "object" || !field.properties[key])
      throw new Error(`Missing numeric field: ${path.join(".")}`);
    field = field.properties[key];
  }
  if (field.type !== "number" && field.type !== "integer")
    throw new Error(`Not a numeric field: ${path.join(".")}`);
  return {
    min: field.minimum ?? -Infinity,
    max: field.maximum ?? Infinity,
    unit: field.unit ?? "",
  };
}

export function numericProperty(
  schema: ParameterSchema,
  key: string,
  label: string,
  step: number,
) {
  const { min, max, unit } = numericField(schema, key);
  return { label, min, max, step, ...(unit ? { unit } : {}) };
}
