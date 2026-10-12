import type { ParameterSchema } from "../../simulations/runtime/parameterSchema";

/** Paths describe editable values; nested patches keep every unrequested sibling. */
export function editableFields(
  schema: ParameterSchema,
  prefix = "",
): Record<string, ParameterSchema> {
  if (schema.type !== "object") return {};
  return Object.fromEntries(
    Object.entries(schema.properties).flatMap(([key, field]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return [[path, field], ...Object.entries(editableFields(field, path))];
    }),
  );
}

export function fieldValue(
  configuration: Record<string, unknown>,
  path: string,
): unknown {
  let value: unknown = configuration;
  for (const key of path.split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
      return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

export function configurationPatch(
  configuration: Record<string, unknown>,
  changes: Record<string, unknown>,
) {
  const patch: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split(".");
    const root = keys[0];
    if (keys.length === 1) {
      Object.defineProperty(patch, root, { value, enumerable: true, writable: true, configurable: true });
      continue;
    }
    if (!Object.hasOwn(patch, root))
      Object.defineProperty(patch, root, { value: structuredClone(configuration[root]), enumerable: true, writable: true, configurable: true });
    let target = patch[root] as Record<string, unknown>;
    for (const key of keys.slice(1, -1))
      target = target[key] as Record<string, unknown>;
    Object.defineProperty(target, keys.at(-1)!, { value, enumerable: true, writable: true, configurable: true });
  }
  return patch;
}
