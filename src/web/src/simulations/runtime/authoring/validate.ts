import { publicDefinition } from "../../components/catalog";
import { validateControlConnection } from "../../components/controls/controlContract";
import type { Joint, Member } from "../../components/traits/MemberEndpoints";
import { assemblyModels } from "../assembly";
import { validateValue } from "../parameterSchema";
import { bridgeResponseFromParts } from "../trussModel";
import { validateBoard } from "./board";
import { visitConfigurationReferences } from "./references";
import { requireValue } from "./requireValue";
import type { AuthoredDocument, Connection, Layout } from "./types";

export const limits = {
  nodes: 512,
  connections: 1024,
  depth: 12,
  bytes: 1_000_000,
};
export function assertData(input: unknown) {
  let count = 0;
  function visit(value: unknown, path: string, depth: number) {
    if (++count > 100000 || depth > 40)
      throw new Error(`${path}: data exceeds complexity limit`);
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "string"
    )
      return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        visit(v, `${path}[${i}]`, depth + 1);
      });
      return;
    }
    if (
      value &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      for (const [key, v] of Object.entries(value)) {
        if (["__proto__", "prototype", "constructor"].includes(key))
          throw new Error(`${path}.${key}: forbidden key`);
        visit(v, `${path}.${key}`, depth + 1);
      }
      return;
    }
    throw new Error(`${path}: expected finite JSON data`);
  }
  visit(input, "document", 0);
  if (JSON.stringify(input).length > limits.bytes)
    throw new Error("Document exceeds storage budget");
}
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9/_:.-]{0,159}$/;
export function validateAuthoredDocument(
  input: unknown,
  runnable = false,
): asserts input is AuthoredDocument {
  assertData(input);
  const d = input as AuthoredDocument;
  if (!d || d.formatVersion !== 3)
    throw new Error("Unsupported canonical document format");
  for (const field of [
    "nodes",
    "connections",
    "resources",
    "scopes",
    "groups",
  ] as const)
    if (!Array.isArray(d[field])) throw new Error(`${field}: expected array`);
  if (
    d.nodes.length + d.resources.length > limits.nodes ||
    d.connections.length > limits.connections
  )
    throw new Error("Expanded document exceeds component/connection limit");
  for (const model of assemblyModels)
    if (
      d.nodes.filter((node) => node.definition === model.ref).length >
      model.maximumInstances
    )
      throw new Error(
        `${model.ref}: exceeds maximum ${model.maximumInstances} independent objects`,
      );
  // Boundary overflow is a sharing concern; drafts and previews remain editable.
  validateBoard(d);
  const ids = new Set<string>();
  const claim = (id: string, path: string) => {
    if (typeof id !== "string" || !idPattern.test(id) || ids.has(id))
      throw new Error(`${path}: invalid or duplicate identity ${id}`);
    ids.add(id);
  };
  for (const s of d.scopes) {
    claim(s.id, "scope");
    if (typeof s.label !== "string") throw new Error("Scope requires a label");
  }
  const scopes = new Set(d.scopes.map((s) => s.id));
  for (const n of [...d.nodes, ...d.resources]) {
    claim(n.id, "node");
    const def = publicDefinition(n.definition, n.version);
    if (typeof n.label !== "string" || !scopes.has(n.scope))
      throw new Error(`${n.id}: missing label or scope`);
    validateValue(def.configuration, n.configuration, `${n.id}.configuration`);
  }
  const nodes = new Map([...d.nodes, ...d.resources].map((n) => [n.id, n]));
  for (const n of nodes.values())
    visitConfigurationReferences(n, (record, key, definition) => {
      if (record[key] === "") return;
      const target = nodes.get(String(record[key]));
      if (
        target &&
        (target.definition !== definition || target.scope !== n.scope)
      )
        throw new Error(`${n.id}.${key}: incompatible reference`);
      if (runnable && !target)
        throw new Error(`${n.id}.${key}: missing referenced component`);
    });
  const writers = new Set<string>();
  const dependency = new Map<string, string[]>();
  for (const c of d.connections) {
    claim(c.id, "connection");
    validateConnection(d, c);
    const to = publicDefinition(requireValue(nodes.get(c.to.node)).definition);
    const port = to.inputs[c.to.port];
    if (c.kind !== "command" && port?.cardinality !== "many") {
      const key = `${c.to.node}:${c.to.port}`;
      if (writers.has(key))
        throw new Error(`${c.id}: multiple writers for ${key}`);
      writers.add(key);
    }
    if (c.kind === "value")
      dependency.set(c.from.node, [
        ...(dependency.get(c.from.node) ?? []),
        c.to.node,
      ]);
  }
  for (const n of d.nodes.filter(
    (n) => n.definition === "models/BridgeResponse",
  )) {
    const parts = (port: string) =>
      d.connections
        .filter(
          (c) => c.kind === "value" && c.to.node === n.id && c.to.port === port,
        )
        .map((c) => {
          const child = requireValue(nodes.get(c.from.node));
          return { ...child.configuration, id: child.id };
        });
    const joints = parts("joints"),
      members = parts("members"),
      loads = parts("load");
    if (joints.length && members.length && loads.length)
      bridgeResponseFromParts(
        {
          spanScale: Number(n.configuration.spanScale),
          dense: Boolean(n.configuration.dense),
        },
        joints as unknown as Joint[],
        members as unknown as Member[],
        loads[0] as { id: string; position: number; magnitude: number },
        n.id,
        n.label,
      );
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error(`${id}: immediate value cycle`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of dependency.get(id) ?? []) visit(child);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  const placed = new Set<string>();
  function layout(l: Layout, depth = 0) {
    if (!l || depth > limits.depth) throw new Error("layout: excessive depth");
    claim(l.id, "layout");
    if (
      ![
        "stack",
        "row",
        "grid",
        "panel",
        "disclosure",
        "tabs",
        "split",
        "repeater",
      ].includes(l.kind) ||
      typeof l.label !== "string" ||
      !Number.isFinite(l.gap) ||
      l.gap < 0 ||
      l.gap > 64 ||
      !Number.isInteger(l.columns) ||
      l.columns < 1 ||
      l.columns > 6 ||
      (l.mobileColumns !== undefined &&
        (!Number.isInteger(l.mobileColumns) ||
          l.mobileColumns < 1 ||
          l.mobileColumns > 6)) ||
      (l.alignment !== undefined &&
        !["stretch", "start", "center", "end"].includes(l.alignment)) ||
      (l.font !== undefined &&
        !["inherit", "system", "serif", "mono"].includes(l.font)) ||
      (l.fontSize !== undefined &&
        (!Number.isFinite(l.fontSize) || l.fontSize < 12 || l.fontSize > 32)) ||
      !Array.isArray(l.children)
    )
      throw new Error(`${l.id}: invalid layout settings`);
    for (const [name, endpoint] of [
      ["visibleWhen", l.visibleWhen],
      ["disabledWhen", l.disabledWhen],
      ["theme", l.theme],
    ] as const) {
      if (!endpoint) continue;
      const node = nodes.get(endpoint.node),
        output =
          node && publicDefinition(node.definition).outputs[endpoint.port];
      if (!node || !output)
        throw new Error(`${l.id}.${name}: missing binding endpoint`);
      if (name === "theme" && output.unit !== "theme")
        throw new Error(`${l.id}.theme: expected a theme output`);
      if (
        name !== "theme" &&
        output.schema?.type !== "boolean" &&
        output.unit !== "boolean"
      )
        throw new Error(`${l.id}.${name}: expected a boolean output`);
    }
    if (l.node) {
      if (!nodes.has(l.node) || placed.has(l.node))
        throw new Error(`${l.id}: missing or duplicate layout node ${l.node}`);
      placed.add(l.node);
    }
    for (const child of l.children) layout(child, depth + 1);
  }
  layout(d.layout);
  for (const g of d.groups) {
    claim(g.id, "group");
    if (
      !Array.isArray(g.members) ||
      new Set(g.members).size !== g.members.length ||
      g.members.some((id) => !nodes.has(id)) ||
      typeof g.label !== "string" ||
      typeof g.collapsed !== "boolean" ||
      !Array.isArray(g.parameters)
    )
      throw new Error(`${g.id}: invalid group membership`);
    if (g.parent && !d.groups.some((p) => p.id === g.parent && p.id !== g.id))
      throw new Error(`${g.id}: missing group parent`);
    const ancestors = new Set([g.id]);
    let parent = g.parent;
    while (parent) {
      if (ancestors.has(parent)) throw new Error(`${g.id}: group cycle`);
      ancestors.add(parent);
      parent = d.groups.find((p) => p.id === parent)?.parent;
    }
    if (g.exposedPorts !== undefined && !Array.isArray(g.exposedPorts))
      throw new Error(`${g.label}: invalid exposed interface`);
    const names = new Set<string>();
    const endpoints = new Set<string>();
    for (const p of g.exposedPorts ?? []) {
      const node = nodes.get(p.endpoint?.node);
      const def = node && publicDefinition(node.definition, node.version);
      const contract =
        p.direction === "input"
          ? (def?.inputs[p.endpoint.port] ??
            (def?.commands[p.endpoint.port]
              ? { kind: "command", unit: "" }
              : undefined))
          : p.direction === "output"
            ? def?.outputs[p.endpoint.port]
            : undefined;
      const key = `${p.direction}:${p.endpoint?.node}:${p.endpoint?.port}`;
      if (
        !node ||
        !g.members.includes(node.id) ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        names.has(p.name) ||
        endpoints.has(key) ||
        !contract ||
        JSON.stringify(contract) !== JSON.stringify(p.port) ||
        (p.required !== undefined && typeof p.required !== "boolean")
      )
        throw new Error(`${g.label}: invalid exposed port`);
      names.add(p.name);
      endpoints.add(key);
    }
    for (const p of g.parameters) {
      const node = nodes.get(p.node);
      if (
        !node ||
        !g.members.includes(p.node) ||
        !Object.hasOwn(node.configuration, p.field)
      )
        throw new Error(`${g.id}.${p.name}: missing parameter target`);
      validateValue(p.schema, p.default, `${g.id}.${p.name}`);
    }
  }
  if (
    !d.lesson ||
    [d.lesson.title, d.lesson.instruction, d.lesson.explanation].some(
      (s) => typeof s !== "string" || s.length > 10000,
    )
  )
    throw new Error("lesson: invalid content");
  validateEditorMetadata(
    d.editor,
    new Set([...nodes.keys(), ...d.groups.map((g) => g.id)]),
  );
  if (runnable)
    for (const n of d.nodes) {
      const def = publicDefinition(n.definition);
      for (const [name, p] of Object.entries(def.inputs))
        if (
          !p.optional &&
          !d.connections.some((c) => c.to.node === n.id && c.to.port === name)
        )
          throw new Error(`${n.label}: connect required ${name} input`);
      if (
        def.category === "controls" &&
        !d.connections.some((c) => c.from.node === n.id && c.kind === "command")
      )
        throw new Error(`${n.label}: connect a command before running`);
    }
}
export function validateConnection(d: AuthoredDocument, c: Connection) {
  const nodes = [...d.nodes, ...d.resources];
  const from = nodes.find((n) => n.id === c.from?.node),
    to = nodes.find((n) => n.id === c.to?.node);
  if (!from || !to) throw new Error(`${c.id}: missing connection endpoint`);
  const a = publicDefinition(from.definition),
    b = publicDefinition(to.definition);
  const output = a.outputs[c.from.port];
  if (!output) throw new Error(`${c.id}: missing output ${c.from.port}`);
  if (c.kind === "command") {
    if (output.kind !== "event" || !b.commands[c.to.port])
      throw new Error(`${c.id}: expected event → supported command`);
    // Fixed argument links are auxiliary actions (e.g. restarting a peer model).
    if (!c.arguments) validateControlConnection(from, to, c.to.port, b);
    if (from.scope !== to.scope)
      throw new Error(
        `${c.id}: commands must stay in their explicit runtime scope`,
      );
    for (const [key, binding] of Object.entries(c.argumentBindings ?? {})) {
      const source = nodes.find((n) => n.id === binding.from.node);
      if (
        !source ||
        source.scope !== to.scope ||
        !publicDefinition(source.definition).outputs[binding.from.port]
      )
        throw new Error(`${c.id}.${key}: invalid scoped argument source`);
      if (
        binding.path &&
        (!Array.isArray(binding.path) ||
          binding.path.length > 8 ||
          binding.path.some(
            (key) =>
              typeof key !== "string" ||
              ["__proto__", "constructor", "prototype"].includes(key),
          ))
      )
        throw new Error(`${c.id}.${key}: invalid argument path`);
      if (
        binding.transform &&
        !["identity", "not", "multiply", "atLeast"].includes(binding.transform)
      )
        throw new Error(`${c.id}.${key}: unsupported transform`);
      if (binding.operand !== undefined && !Number.isFinite(binding.operand))
        throw new Error(`${c.id}.${key}: invalid transform operand`);
      const argumentSchema = b.commands[c.to.port].arguments;
      if (
        argumentSchema.type !== "object" ||
        !Object.hasOwn(argumentSchema.properties, key)
      )
        throw new Error(`${c.id}.${key}: unknown command argument`);
    }
    if (c.arguments)
      validateValue(
        b.commands[c.to.port].arguments,
        c.arguments,
        `${c.id}.arguments`,
      );
    return;
  }
  if (c.kind !== "value" && c.kind !== "attachment")
    throw new Error(`${c.id}: unsupported relationship`);
  const input = b.inputs[c.to.port];
  if (
    !input ||
    (c.kind === "attachment"
      ? output.kind !== "attachment" || input.kind !== "attachment"
      : !["value", "dataset", "grid"].includes(output.kind) ||
        !["value", "dataset", "grid"].includes(input.kind))
  )
    throw new Error(`${c.id}: incompatible port kinds`);
  if (input.unit !== "*" && output.unit !== input.unit)
    throw new Error(
      `${c.id}: incompatible quantities/units ${output.unit} → ${input.unit}`,
    );
  if (from.scope !== to.scope && (!input.crossScope || !output.crossScope))
    throw new Error(`${c.id}: incompatible runtime scopes`);
}

/** The working envelope and the portable authored document share this contract. */
export function validateEditorMetadata(
  editor: AuthoredDocument["editor"],
  identities: Set<string>,
) {
  if (
    !editor ||
    !Number.isFinite(editor.zoom) ||
    editor.zoom < 0.2 ||
    editor.zoom > 2 ||
    !editor.positions ||
    typeof editor.positions !== "object" ||
    Array.isArray(editor.positions)
  )
    throw new Error("editor: invalid metadata");
  if (
    editor.pan !== undefined &&
    (!editor.pan ||
      typeof editor.pan !== "object" ||
      Array.isArray(editor.pan) ||
      !Number.isFinite(editor.pan.x) ||
      !Number.isFinite(editor.pan.y))
  )
    throw new Error("editor: invalid viewport position");
  for (const [id, p] of Object.entries(editor.positions))
    if (
      !identities.has(id) ||
      !p ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y)
    )
      throw new Error(`${id}: invalid editor position`);
}
