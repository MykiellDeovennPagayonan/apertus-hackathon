import { type DefaultTreeAdapterMap, parse } from "parse5";
import type { ComponentInstance } from "../../authoring-engine/document";
import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
import { type ParameterSchema, validateValue } from "../../../registry/contracts/parameterSchema";

export const IMPORTED_HTML = "displays/ImportedHTML";
export const componentLimits = {
  source: 256 * 1024,
  payload: 256 * 1024,
  depth: 32,
  declarations: 64,
  startup: 5000,
  handler: 2000,
  queue: 64,
  messages: 1024,
};
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export type Declaration = {
  description: string;
  schema: ParameterSchema;
  unit: string;
};
export type Manifest = {
  formatVersion: 1;
  apiVersion: 1;
  id: string;
  version: number;
  name: string;
  description: string;
  settings: Record<string, Declaration & { default: JsonValue }>;
  inputs: Record<
    string,
    Declaration & { required: boolean; default?: JsonValue }
  >;
  outputs: Record<string, Declaration>;
  actions: Record<string, { description: string; arguments: ParameterSchema }>;
  clock: boolean;
};
export type Diagnostic = {
  code: string;
  severity: "error" | "warning";
  stage: "package" | "interface" | "runtime";
  message: string;
  path?: string;
  expected?: string;
  received?: JsonValue;
  requestId?: number;
  reproduction?: JsonValue;
  repair: string;
};
export type VerificationReport = {
  sourceHash: string;
  apiVersion: number;
  verifierVersion: string;
  checkedAt: string;
  status: "passed" | "failed" | "incomplete";
  checks: { id: string; status: "passed" | "failed" | "not-run" }[];
  diagnostics: Diagnostic[];
};
export class ComponentError extends Error {
  constructor(
    public code: string,
    message: string,
    public path?: string,
  ) {
    super(message);
  }
}
export function diagnostic(
  error: unknown,
  stage: Diagnostic["stage"] = "package",
): Diagnostic {
  return {
    code: error instanceof ComponentError ? error.code : `${stage}.invalid`,
    severity: "error",
    stage,
    message: error instanceof Error ? error.message : "Component failed",
    ...(error instanceof ComponentError && error.path
      ? { path: error.path }
      : {}),
    repair:
      "Correct the reported field or handler, keep API version 1, and return a complete HTML file.",
  };
}
function fail(path: string, message: string): never {
  throw new ComponentError("manifest.invalid", `${path}: ${message}`, path);
}
export function jsonData(value: unknown, path = "value", depth = 0): void {
  if (depth > componentLimits.depth) fail(path, "data is nested too deeply");
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return;
  if (Array.isArray(value)) {
    if (value.length > 10000) fail(path, "too many items");
    value.forEach((v, i) => {
      jsonData(v, `${path}[${i}]`, depth + 1);
    });
    return;
  }
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    for (const [key, v] of Object.entries(value)) {
      safeKey(key, path);
      jsonData(v, `${path}.${key}`, depth + 1);
    }
    return;
  }
  fail(path, "expected finite JSON data");
}
function safeKey(key: string, path: string) {
  if (["__proto__", "prototype", "constructor"].includes(key))
    fail(path, `forbidden key ${key}`);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(path, "expected object");
  return value as Record<string, unknown>;
}
function keys(
  value: Record<string, unknown>,
  required: string[],
  optional: string[],
  path: string,
) {
  for (const key of Object.keys(value)) {
    safeKey(key, path);
    if (![...required, ...optional].includes(key))
      fail(`${path}.${key}`, "unknown field");
  }
  for (const key of required)
    if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, "required field");
}
function text(value: unknown, path: string, max = 1000, empty = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim())
  )
    fail(path, "expected bounded text");
}
function integer(value: unknown, path: string, max = 10000) {
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > max
  )
    fail(path, "expected bounded nonnegative integer");
}
export function validateSchema(
  value: unknown,
  path = "schema",
  depth = 0,
): asserts value is ParameterSchema {
  if (depth > componentLimits.depth) fail(path, "schema is nested too deeply");
  const s = record(value, path);
  switch (s.type) {
    case "number":
    case "integer":
      keys(s, ["type", "minimum", "maximum"], ["unit"], path);
      if (
        typeof s.minimum !== "number" ||
        typeof s.maximum !== "number" ||
        !Number.isFinite(s.minimum) ||
        !Number.isFinite(s.maximum) ||
        s.minimum > s.maximum ||
        (s.type === "integer" &&
          (!Number.isInteger(s.minimum) || !Number.isInteger(s.maximum)))
      )
        fail(path, "invalid numeric bounds");
      if (s.unit !== undefined) text(s.unit, `${path}.unit`, 80, true);
      break;
    case "boolean":
      keys(s, ["type"], ["description"], path);
      if (s.description !== undefined) text(s.description, path);
      break;
    case "string":
      keys(s, ["type", "minLength", "maxLength"], ["enum"], path);
      integer(s.minLength, path);
      integer(s.maxLength, path);
      if ((s.minLength as number) > (s.maxLength as number))
        fail(path, "invalid string bounds");
      if (
        s.enum !== undefined &&
        (!Array.isArray(s.enum) ||
          !s.enum.length ||
          s.enum.length > 64 ||
          s.enum.some(
            (v) =>
              typeof v !== "string" ||
              v.length < (s.minLength as number) ||
              v.length > (s.maxLength as number),
          ))
      )
        fail(path, "invalid string enum");
      break;
    case "enum":
      keys(s, ["type", "values"], [], path);
      if (
        !Array.isArray(s.values) ||
        !s.values.length ||
        s.values.length > 64 ||
        s.values.some(
          (v) =>
            v !== null &&
            typeof v !== "string" &&
            !(typeof v === "number" && Number.isFinite(v)),
        )
      )
        fail(path, "invalid enum values");
      break;
    case "array":
      keys(s, ["type", "items", "minItems", "maxItems"], [], path);
      integer(s.minItems, path);
      integer(s.maxItems, path);
      if ((s.minItems as number) > (s.maxItems as number))
        fail(path, "invalid array bounds");
      validateSchema(s.items, `${path}.items`, depth + 1);
      break;
    case "object": {
      keys(s, ["type", "properties"], ["optional"], path);
      const properties = record(s.properties, `${path}.properties`);
      if (Object.keys(properties).length > componentLimits.declarations)
        fail(path, "too many properties");
      for (const [key, child] of Object.entries(properties)) {
        safeKey(key, path);
        validateSchema(child, `${path}.${key}`, depth + 1);
      }
      if (
        s.optional !== undefined &&
        (!Array.isArray(s.optional) ||
          s.optional.some(
            (k) => typeof k !== "string" || !Object.hasOwn(properties, k),
          ) ||
          new Set(s.optional).size !== s.optional.length)
      )
        fail(path, "invalid optional fields");
      break;
    }
    default:
      fail(path, "unsupported schema type");
  }
}
export function validateManifest(value: unknown): asserts value is Manifest {
  jsonData(value, "manifest");
  const m = record(value, "manifest");
  keys(
    m,
    [
      "formatVersion",
      "apiVersion",
      "id",
      "version",
      "name",
      "description",
      "settings",
      "inputs",
      "outputs",
      "actions",
      "clock",
    ],
    [],
    "manifest",
  );
  if (m.formatVersion !== 1 || m.apiVersion !== 1)
    throw new ComponentError(
      "manifest.version",
      "Only formatVersion 1 and apiVersion 1 are supported.",
    );
  text(m.id, "manifest.id", 160);
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(m.id as string))
    fail("manifest.id", "use namespace/name");
  integer(m.version, "manifest.version", 1000000);
  if (!m.version) fail("manifest.version", "must be positive");
  text(m.name, "manifest.name", 100);
  text(m.description, "manifest.description");
  if (typeof m.clock !== "boolean") fail("manifest.clock", "expected boolean");
  for (const category of ["settings", "inputs", "outputs", "actions"]) {
    const map = record(m[category], `manifest.${category}`);
    if (Object.keys(map).length > componentLimits.declarations)
      fail(category, "too many declarations");
    for (const [name, value] of Object.entries(map)) {
      const path = `manifest.${category}.${name}`;
      safeKey(name, path);
      if (
        !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(name) ||
        ["reset", "RESET", "source", "settings", "inputs"].includes(name)
      )
        fail(path, "invalid or reserved name");
      const d = record(value, path);
      keys(
        d,
        category === "actions"
          ? ["description", "arguments"]
          : [
              "description",
              "schema",
              "unit",
              ...(category === "settings"
                ? ["default"]
                : category === "inputs"
                  ? ["required"]
                  : []),
            ],
        category === "inputs" ? ["default"] : [],
        path,
      );
      text(d.description, `${path}.description`);
      validateSchema(category === "actions" ? d.arguments : d.schema, path);
      if (category === "actions") {
        if ((d.arguments as ParameterSchema).type !== "object")
          fail(path, "action arguments must be an object");
        continue;
      }
      text(d.unit, `${path}.unit`, 80, true);
      const schema = d.schema as ParameterSchema;
      if (
        "unit" in schema &&
        schema.unit !== undefined &&
        schema.unit !== d.unit
      )
        fail(path, "schema and port units differ");
      if (
        category === "inputs" &&
        (typeof d.required !== "boolean" ||
          (!d.required && !Object.hasOwn(d, "default")))
      )
        fail(path, "optional inputs need a default");
      if (Object.hasOwn(d, "default"))
        validateValue(schema, d.default, `${path}.default`);
    }
  }
}
type HtmlNode = DefaultTreeAdapterMap["node"];
export function inspectSource(source: string): Manifest {
  if (
    typeof source !== "string" ||
    new TextEncoder().encode(source).length > componentLimits.source
  )
    throw new ComponentError(
      "package.size",
      "HTML exceeds the 256 KiB component limit.",
    );
  if (source.includes("\u0000") || source.includes("\ufffd"))
    throw new ComponentError(
      "package.encoding",
      "Use a valid UTF-8 HTML file.",
    );
  const tree = parse(source);
  const manifests: string[] = [];
  if (!tree.childNodes.some((n) => n.nodeName === "#documentType"))
    throw new ComponentError(
      "package.document",
      "Include <!doctype html> and a complete HTML document.",
    );
  function visit(node: HtmlNode, depth: number) {
    if (depth > 64)
      throw new ComponentError("package.depth", "HTML is nested too deeply.");
    if ("tagName" in node) {
      const attrs = Object.fromEntries(
        node.attrs.map((a) => [a.name, a.value]),
      );
      if (
        [
          "base",
          "iframe",
          "frame",
          "frameset",
          "object",
          "embed",
          "link",
          "form",
        ].includes(node.tagName) ||
        (node.tagName === "meta" && "http-equiv" in attrs)
      )
        throw new ComponentError(
          "package.resource",
          `Unsupported element: ${node.tagName}. Bundle styles and assets in the file.`,
        );
      for (const [key, value] of Object.entries(attrs)) {
        if (
          [
            "href",
            "xlink:href",
            "action",
            "formaction",
            "srcset",
            "ping",
          ].includes(key) &&
          value &&
          !value.startsWith("#")
        )
          throw new ComponentError(
            "package.resource",
            `${key}: navigation and external resources are unavailable.`,
          );
        if (
          ["src", "poster", "background"].includes(key) &&
          !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)
        )
          throw new ComponentError(
            "package.resource",
            `${key}: use embedded raster images; remote resources are unavailable.`,
          );
      }
      if (node.tagName === "script" && attrs.id === "apertus-component") {
        if (attrs.type !== "application/json")
          throw new ComponentError(
            "manifest.missing",
            "The manifest must use type=application/json.",
          );
        manifests.push(
          node.childNodes.map((n) => ("value" in n ? n.value : "")).join(""),
        );
      }
      if ("content" in node) visit(node.content, depth + 1);
    }
    if ("childNodes" in node)
      node.childNodes.forEach((child) => {
        visit(child, depth + 1);
      });
  }
  visit(tree, 0);
  if (manifests.length !== 1)
    throw new ComponentError(
      "manifest.missing",
      "Include exactly one script#apertus-component JSON manifest.",
    );
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifests[0]);
  } catch {
    throw new ComponentError(
      "manifest.json",
      "The manifest is not valid JSON.",
    );
  }
  validateManifest(manifest);
  return manifest;
}
// Cache only parsed data, never code or instance state; bounded for long editing sessions.
const manifests = new Map<string, Manifest>();
export function manifestFor(source: string) {
  let m = manifests.get(source);
  if (!m) {
    m = inspectSource(source);
    if (manifests.size >= 16) {
      const oldest = manifests.keys().next().value;
      if (oldest) manifests.delete(oldest);
    }
    manifests.set(source, m);
  }
  return m;
}
export function declarationsSchema(
  declarations: Record<string, Declaration>,
): ParameterSchema {
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(declarations).map(([k, d]) => [k, d.schema]),
    ),
  };
}
export function defaults(
  declarations: Record<string, Declaration & { default?: JsonValue }>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(declarations)
      .filter(([, d]) => Object.hasOwn(d, "default"))
      .map(([k, d]) => [k, structuredClone(d.default)]),
  );
}
export function inputValues(
  manifest: Manifest,
  manual: Record<string, unknown>,
  connected: Record<string, unknown> = {},
) {
  const values = { ...defaults(manifest.inputs), ...manual, ...connected };
  for (const [name, d] of Object.entries(manifest.inputs)) {
    if (!Object.hasOwn(values, name) || values[name] === undefined)
      throw new ComponentError(
        "input.required",
        `Provide a value for ${name}.`,
        `inputs.${name}`,
      );
    validateValue(d.schema, values[name], `inputs.${name}`);
  }
  return values;
}
export function importedDefinition(node?: ComponentInstance): PublicDefinition {
  const m = node ? manifestFor(String(node.configuration.source)) : undefined;
  const ports = (ds: Record<string, Declaration>) =>
    Object.fromEntries(
      Object.entries(ds).map(([key, d]) => [
        key,
        {
          kind: "value" as const,
          unit: d.unit,
          schema: d.schema,
          optional: true,
          crossScope: true,
        },
      ]),
    );
  return {
    id: IMPORTED_HTML,
    version: 1,
    title: m?.name ?? "Imported HTML component",
    description: m?.description ?? "Import a self-contained HTML component",
    category: "displays",
    tags: ["imported"],
    placement: ["lesson"],
    configuration: {
      type: "object",
      properties: {
        source: {
          type: "string",
          minLength: 1,
          maxLength: componentLimits.source,
        },
        settings: m
          ? declarationsSchema(m.settings)
          : { type: "object", properties: {} },
        inputs: m
          ? ({
              ...declarationsSchema(m.inputs),
              optional: Object.keys(m.inputs),
            } as ParameterSchema)
          : { type: "object", properties: {} },
      },
    },
    defaults: {},
    inputs: ports(m?.inputs ?? {}),
    outputs: ports(m?.outputs ?? {}),
    commands: {
      ...Object.fromEntries(
        Object.entries(m?.actions ?? {}).map(([key, a]) => [
          key,
          { ...a, timing: "live" as const },
        ]),
      ),
      reset: {
        description: "Reset component",
        arguments: { type: "object", properties: {} },
        timing: "rebuild",
      },
    },
    lifecycle: {
      authored: ["source", "settings", "inputs"],
      presentation: [],
      clock: m?.clock ?? false,
      reset: "authored",
      capture: false,
    },
    assumptions: [],
    runtimeProvider: IMPORTED_HTML,
    presentationProvider: IMPORTED_HTML,
  };
}
export function stableSchema(schema: ParameterSchema): string {
  const normalize = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, normalize((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(normalize(schema));
}
