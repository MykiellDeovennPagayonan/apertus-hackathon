import { conversionPairs } from "../../components/catalog/authoring";
import type { RuntimeProvider } from "./providers";
import { assertData } from "./validate";
export function typedData(value: unknown, type: string): unknown {
  assertData(value);
  const valid =
    type === "record"
      ? value !== null && typeof value === "object" && !Array.isArray(value)
      : type === "list"
        ? Array.isArray(value)
        : type === "text"
          ? typeof value === "string"
          : typeof value === type;
  if (!valid) throw new Error(`Expected ${type} data`);
  if (Array.isArray(value) && value.length > 512)
    throw new Error("List exceeds 512 items");
  return value;
}
export function selectField(source: unknown, path: string) {
  const parts = path.split(".");
  if (
    !path ||
    parts.length > 8 ||
    parts.some(
      (k) =>
        !/^[a-zA-Z0-9_-]+$/.test(k) ||
        ["__proto__", "constructor", "prototype"].includes(k),
    )
  )
    throw new Error("Field selector: invalid own-property path");
  let value = source;
  for (const key of parts) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
      throw new Error(`Field selector: missing ${path}`);
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
export function expressionValue(
  tree: unknown,
  variables: Record<string, unknown>,
) {
  let cost = 0;
  const evaluate = (value: unknown, depth: number): number => {
    if (++cost > 128 || depth > 12)
      throw new Error("Expression exceeds evaluation budget");
    let result: number;
    if (typeof value === "number") result = value;
    else if (value === "x" || value === "y") {
      if (typeof variables[value] !== "number")
        throw new Error(`Expression needs numeric ${value}`);
      result = variables[value];
    } else {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Expression: expected a number, x/y, or an operation");
      const record = value as Record<string, unknown>;
      if (
        Object.keys(record).some((k) => !["op", "args"].includes(k)) ||
        !Array.isArray(record.args)
      )
        throw new Error("Expression: invalid operation");
      const unary = ["abs", "negate"].includes(String(record.op));
      if (record.args.length !== (unary ? 1 : 2))
        throw new Error("Expression: incorrect argument count");
      const [a, b] = record.args.map((v) => evaluate(v, depth + 1));
      switch (record.op) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) throw new Error("Expression: division by zero");
          result = a / b;
          break;
        case "min":
          result = Math.min(a, b);
          break;
        case "max":
          result = Math.max(a, b);
          break;
        case "abs":
          result = Math.abs(a);
          break;
        case "negate":
          result = -a;
          break;
        default:
          throw new Error("Expression: unsupported operation");
      }
    }
    if (!Number.isFinite(result) || Math.abs(result) > 1e12)
      throw new Error("Expression: result outside finite bounds");
    return result;
  };
  return evaluate(tree, 0);
}
const readOnly = () => {
  throw new Error("Data operations are read-only");
};
export const dataProviders = new Map<string, RuntimeProvider>();
for (const type of ["number", "boolean", "text", "record", "list"])
  dataProviders.set(
    type === "number" ? "data/Literal" : `data/Literal-${type}`,
    {
      initialize: (n) => ({
        value: typedData(JSON.parse(String(n.configuration.json)), type),
      }),
      apply: readOnly,
      measure: (s) => s,
    },
  );
dataProviders.set("data/FieldSelector", {
  initialize: (n) => {
    selectField({ value: 0 }, "value");
    const path = String(n.configuration.path);
    if (
      !path ||
      path
        .split(".")
        .some((k) => ["__proto__", "constructor", "prototype"].includes(k))
    )
      throw new Error("Invalid field path");
    return {};
  },
  apply: readOnly,
  measure: (s) => s,
  synchronize: (_s, inputs, n) =>
    inputs.source?.length
      ? {
          value: typedData(
            selectField(inputs.source[0], String(n.configuration.path)),
            String(n.configuration.resultType),
          ),
        }
      : {},
});
dataProviders.set("data/Expression", {
  initialize: (n) => {
    const tree = JSON.parse(String(n.configuration.expression));
    assertData(tree);
    expressionValue(tree, { x: 0, y: 1 });
    return {};
  },
  apply: readOnly,
  measure: (s) => s,
  synchronize: (_s, inputs, n) => ({
    value: expressionValue(JSON.parse(String(n.configuration.expression)), {
      x: inputs.x?.[0] ?? 0,
      y: inputs.y?.[0] ?? 0,
    }),
  }),
});
for (const [name, pair] of Object.entries(conversionPairs))
  dataProviders.set(`data/${name}`, {
    initialize: () => ({}),
    apply: readOnly,
    measure: (s) => s,
    synchronize: (_s, inputs) => {
      if (!inputs.value?.length) return {};
      const value = inputs.value[0];
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error("Unit conversion requires a finite number");
      if (
        (pair.from === "K" && value < 0) ||
        (pair.from === "°C" && value < -273.15)
      )
        throw new Error("Absolute temperature is below absolute zero");
      const result = value * pair.scale + pair.offset;
      if (!Number.isFinite(result) || Math.abs(result) > 1e12)
        throw new Error("Conversion result exceeds bounds");
      return { value: result };
    },
  });
dataProviders.set("resources/Theme", {
  initialize: (n) => {
    for (const field of ["accent", "background", "foreground"])
      if (!/^#[0-9a-f]{6}$/i.test(String(n.configuration[field])))
        throw new Error(`${field}: expected a six-digit hex color`);
    return { theme: structuredClone(n.configuration) };
  },
  apply: readOnly,
  measure: (s) => s,
});
