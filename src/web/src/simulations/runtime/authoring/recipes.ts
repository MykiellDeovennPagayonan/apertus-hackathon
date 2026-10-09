import { publicDefinition } from "../../components/catalog";
import { validateValue } from "../parameterSchema";
import { reconcileBoard } from "./board";
import { visitConfigurationReferences } from "./references";
import { requireValue } from "./requireValue";
import {
  type AuthoredDocument,
  type CompositeRecipe,
  emptyAuthoredDocument,
  emptyLayout,
  type Layout,
} from "./types";
import { assertData, limits, validateAuthoredDocument } from "./validate";
export type RecipeResolver = (id: string, version: number) => CompositeRecipe;
export function validateRecipe(r: CompositeRecipe) {
  assertData(r);
  if (
    !r ||
    ![1, 2].includes(r.recipeVersion) ||
    typeof r.id !== "string" ||
    !r.id ||
    !Number.isInteger(r.version) ||
    r.version < 1 ||
    typeof r.title !== "string" ||
    !r.title.trim() ||
    typeof r.description !== "string" ||
    !Array.isArray(r.tags) ||
    r.tags.some((t) => typeof t !== "string") ||
    !Array.isArray(r.nested) ||
    !Array.isArray(r.dependencies) ||
    !Array.isArray(r.parameters) ||
    !Array.isArray(r.externalPorts) ||
    !Array.isArray(r.assumptions)
  )
    throw new Error("recipe: invalid format or metadata");
  if (
    r.discovery &&
    (![
      "component",
      "object",
      "model",
      "preset",
      "composite",
      "experiment",
    ].includes(r.discovery.kind) ||
      ![
        "objects",
        "controls",
        "displays",
        "canvases",
        "models",
        "layout",
        "composites",
        "experiments",
      ].includes(r.discovery.group) ||
      typeof r.discovery.summary !== "string" ||
      !r.discovery.summary.trim() ||
      typeof r.discovery.placement !== "string" ||
      !r.discovery.placement.trim())
  )
    throw new Error("recipe: invalid discovery metadata");
  if (r.recipeVersion === 2) {
    if (r.nested.length)
      throw new Error("Current recipes must be fully expanded");
    const used = new Set(
      [...r.document.nodes, ...r.document.resources].map(
        (node) => `${node.definition}@${node.version}`,
      ),
    );
    const declared = r.dependencies.map(
      (dependency) => `${dependency.id}@${dependency.version}`,
    );
    if (
      declared.length !== new Set(declared).size ||
      declared.some((key) => !used.has(key))
    )
      throw new Error(
        "Current recipe dependencies must have exactly one entry per used definition version",
      );

    if (r.document.lesson.title !== r.title)
      throw new Error("Recipe and lesson titles must agree");
    if (
      r.catalog &&
      (typeof r.catalog.icon !== "string" ||
        !r.catalog.icon.trim() ||
        !["physics", "mathematics", "social-systems"].includes(
          r.catalog.category,
        ) ||
        !Number.isInteger(r.catalog.order))
    )
      throw new Error("Invalid recipe catalog metadata");
    for (const parameter of r.parameters) {
      const child = [...r.document.nodes, ...r.document.resources].find(
        (n) => n.id === parameter.node,
      );
      if (
        JSON.stringify(child?.configuration[parameter.field]) !==
        JSON.stringify(parameter.default)
      )
        throw new Error(
          `${parameter.name}: default differs from authored configuration`,
        );
    }
  }
  validateAuthoredDocument(r.document);
  for (const dep of r.dependencies) publicDefinition(dep.id, dep.version);
  for (const n of [...r.document.nodes, ...r.document.resources])
    if (
      !r.dependencies.some(
        (d) => d.id === n.definition && d.version === n.version,
      )
    )
      throw new Error(`${n.id}: undeclared recipe dependency`);
  const params = new Set<string>();
  for (const p of r.parameters) {
    const n = [...r.document.nodes, ...r.document.resources].find(
      (n) => n.id === p.node,
    );
    if (params.has(p.name) || !n || !Object.hasOwn(n.configuration, p.field))
      throw new Error(`${p.name}: invalid exposed parameter`);
    params.add(p.name);
    validateValue(p.schema, p.default, p.name);
    const def = publicDefinition(n.definition);
    if (
      def.configuration.type !== "object" ||
      !def.configuration.properties[p.field] ||
      JSON.stringify(def.configuration.properties[p.field]) !==
        JSON.stringify(p.schema)
    )
      throw new Error(
        `${p.name}: parameter schema must match child configuration`,
      );
  }
  const external = new Set<string>();
  for (const p of r.externalPorts) {
    const n = [...r.document.nodes, ...r.document.resources].find(
      (n) => n.id === p.endpoint?.node,
    );
    if (
      !n ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      external.has(p.name) ||
      !["input", "output"].includes(p.direction) ||
      (p.required !== undefined && typeof p.required !== "boolean")
    )
      throw new Error(`${p.name}: invalid external port`);
    external.add(p.name);
    const def = publicDefinition(n.definition);
    const port =
      p.direction === "input"
        ? (def.inputs[p.endpoint.port] ??
          (def.commands[p.endpoint.port]
            ? { kind: "command", unit: "" }
            : undefined))
        : def.outputs[p.endpoint.port];
    if (!port || JSON.stringify(port) !== JSON.stringify(p.port))
      throw new Error(`${p.name}: external port contract mismatch`);
  }
}
/** Rewrite declared identities only. User text and command argument strings are never heuristically rewritten. */
export function remapDocument(
  d: AuthoredDocument,
  allocate: (id: string) => string,
): AuthoredDocument {
  const next = structuredClone(d),
    mapping = new Map<string, string>();
  const claim = (id: string) => {
    if (!mapping.has(id)) mapping.set(id, allocate(id));
    return requireValue(mapping.get(id));
  };
  for (const n of [...next.nodes, ...next.resources]) claim(n.id);
  for (const s of next.scopes) claim(s.id);
  for (const c of next.connections) claim(c.id);
  for (const g of next.groups) claim(g.id);
  function claimLayout(l: Layout) {
    claim(l.id);
    l.children.forEach(claimLayout);
  }
  claimLayout(next.layout);
  const ref = (id: string) => {
    const result = mapping.get(id);
    if (!result) throw new Error(`${id}: reference escapes copied content`);
    return result;
  };
  for (const n of [...next.nodes, ...next.resources]) {
    visitConfigurationReferences(n, (record, key) => {
      const target = record[key];
      if (typeof target === "string" && mapping.has(target))
        record[key] = ref(target);
    });
    n.id = ref(n.id);
    n.scope = ref(n.scope);
  }
  for (const s of next.scopes) s.id = ref(s.id);
  for (const c of next.connections) {
    c.id = ref(c.id);
    c.from.node = ref(c.from.node);
    c.to.node = ref(c.to.node);
    for (const b of Object.values(c.argumentBindings ?? {}))
      b.from.node = ref(b.from.node);
  }
  for (const g of next.groups) {
    g.id = ref(g.id);
    g.members = g.members.map(ref);
    if (g.parent) g.parent = ref(g.parent);
    for (const p of g.parameters) p.node = ref(p.node);
    for (const p of g.exposedPorts ?? [])
      p.endpoint.node = ref(p.endpoint.node);
  }
  function rewriteLayout(l: Layout) {
    l.id = ref(l.id);
    if (l.node) l.node = ref(l.node);
    for (const key of ["visibleWhen", "disabledWhen", "theme"] as const)
      if (l[key]) requireValue(l[key]).node = ref(requireValue(l[key]).node);
    l.children.forEach(rewriteLayout);
  }
  rewriteLayout(next.layout);
  if (next.presentation?.mode === "board") {
    const p = next.presentation;
    for (const i of p.items) claim(i.id);
    for (const g of p.groups) claim(g.id);
    for (const o of p.immersive.overlays) claim(o.id);
    if (p.separatedLayouts) p.separatedLayouts = p.separatedLayouts.map(ref);
    if (p.responsiveRows)
      p.responsiveRows = p.responsiveRows.map((row) => row.map(ref));
    for (const i of p.items) {
      i.id = ref(i.id);
      if (i.layoutId) i.layoutId = ref(i.layoutId);
    }
    for (const g of p.groups) {
      g.id = ref(g.id);
      g.members = g.members.map(ref);
    }
    if (p.immersive.sceneItemId)
      p.immersive.sceneItemId = ref(p.immersive.sceneItemId);
    for (const o of p.immersive.overlays) {
      o.id = ref(o.id);
      o.sceneItemId = ref(o.sceneItemId);
      o.contentItemIds = o.contentItemIds.map(ref);
    }
  }
  next.editor.positions = Object.fromEntries(
    Object.entries(next.editor.positions).map(([id, p]) => [ref(id), p]),
  );
  return next;
}
function append(d: AuthoredDocument, addition: AuthoredDocument) {
  d.nodes.push(...addition.nodes);
  d.resources.push(...addition.resources);
  d.connections.push(...addition.connections);
  d.scopes.push(...addition.scopes);
  d.groups.push(...addition.groups);
  d.layout.children.push(addition.layout);
  if (
    d.presentation?.mode === "board" &&
    addition.presentation?.mode === "board"
  ) {
    const incoming = structuredClone(addition.presentation);
    if (incoming.version === 2) d.presentation.version = 2;
    for (const item of incoming.items) {
      item.rect.x += 40;
      item.rect.y += 40;
    }
    if (incoming.separatedLayouts)
      d.presentation.separatedLayouts = [
        ...(d.presentation.separatedLayouts ?? []),
        ...incoming.separatedLayouts,
      ];
    if (d.presentation.responsiveRows || incoming.responsiveRows)
      d.presentation.responsiveRows = [
        ...(d.presentation.responsiveRows ??
          d.presentation.items.map((item) => [item.id])),
        ...(incoming.responsiveRows ?? incoming.items.map((item) => [item.id])),
      ];
    d.presentation.items.push(...incoming.items);
    d.presentation.groups.push(...incoming.groups);
    d.presentation.immersive.overlays.push(...incoming.immersive.overlays);
  }
  Object.assign(d.editor.positions, addition.editor.positions);
}
export function insertRecipe(
  document: AuthoredDocument,
  recipe: CompositeRecipe,
  resolve: RecipeResolver,
  allocate: (id: string) => string,
  overrides: Record<string, unknown> = {},
  externalBindings: Record<string, import("./types").Endpoint> = {},
): AuthoredDocument {
  validateAuthoredDocument(document);
  let total = document.nodes.length + document.resources.length;
  function expand(
    r: CompositeRecipe,
    ancestors: string[],
    depth: number,
  ): AuthoredDocument {
    const key = `${r.id}@${r.version}`;
    if (ancestors.includes(key))
      throw new Error(`recipe cycle: ${[...ancestors, key].join(" → ")}`);
    if (depth > limits.depth)
      throw new Error(`${key}: nested recipe depth exceeds ${limits.depth}`);
    validateRecipe(r);
    total += r.document.nodes.length + r.document.resources.length;
    if (total > limits.nodes)
      throw new Error(`${key}: expanded component limit exceeded`);
    const result = structuredClone(r.document);
    const group = {
      id: `group/${r.id}`,
      label: r.title,
      members: [...result.nodes, ...result.resources].map((n) => n.id),
      source: { id: r.id, version: r.version },
      collapsed: false,
      parameters: structuredClone(r.parameters),
      exposedPorts: structuredClone(r.externalPorts),
    };
    for (const g of result.groups) if (!g.parent) g.parent = group.id;
    result.groups.push(group);
    for (const nested of r.nested) {
      const child = resolve(nested.recipe, nested.version);
      if (child.id !== nested.recipe || child.version !== nested.version)
        throw new Error(`${nested.id}: unresolved recipe version`);
      const content = remapDocument(
        expand(child, [...ancestors, key], depth + 1),
        (id) => `${nested.id}/${id}`,
      );
      for (const g of content.groups) if (!g.parent) g.parent = group.id;
      group.members.push(
        ...[...content.nodes, ...content.resources].map((n) => n.id),
      );
      append(result, content);
    }
    return result;
  }
  const expanded = expand(recipe, [], 0);
  for (const [name, value] of Object.entries(overrides)) {
    const p = recipe.parameters.find((p) => p.name === name);
    if (!p) throw new Error(`${name}: unknown exposed parameter`);
    validateValue(p.schema, value, name);
    requireValue(
      [...expanded.nodes, ...expanded.resources].find((n) => n.id === p.node),
    ).configuration[p.field] = structuredClone(value);
  }
  const next = structuredClone(document),
    mapping = new Map<string, string>();
  const addition = remapDocument(expanded, (id) => {
    const allocated = allocate(id);
    mapping.set(id, allocated);
    return allocated;
  });
  append(next, addition);
  const scopeBindings = new Map<string, string>();
  for (const external of recipe.externalPorts) {
    const bound = externalBindings[external.name];
    if (!bound) continue;
    const kind =
      external.port.kind === "command" || external.port.kind === "event"
        ? "command"
        : external.port.kind === "attachment"
          ? "attachment"
          : "value";
    const internal = requireValue(
        addition.nodes.find(
          (node) => node.id === mapping.get(external.endpoint.node),
        ),
      ),
      externalNode = requireValue(
        [...document.nodes, ...document.resources].find(
          (node) => node.id === bound.node,
        ),
      ),
      accepted = scopeBindings.get(internal.scope);
    if (kind !== "command") {
      const input =
        external.direction === "input"
          ? external.port
          : publicDefinition(externalNode.definition).inputs[bound.port];
      const output =
        external.direction === "input"
          ? publicDefinition(externalNode.definition).outputs[bound.port]
          : external.port;
      if (input?.crossScope && output?.crossScope) continue;
    }
    if (accepted && accepted !== externalNode.scope)
      throw new Error(
        `${recipe.title}: external bindings require incompatible scopes`,
      );
    scopeBindings.set(internal.scope, externalNode.scope);
  }
  for (const node of [...addition.nodes, ...addition.resources])
    if (scopeBindings.has(node.scope))
      node.scope = requireValue(scopeBindings.get(node.scope));
  next.scopes = next.scopes.filter((scope) =>
    [...next.nodes, ...next.resources].some((node) => node.scope === scope.id),
  );
  for (const [index, external] of recipe.externalPorts.entries()) {
    const bound = externalBindings[external.name];
    if (!bound) continue;
    const internal = {
      node: requireValue(mapping.get(external.endpoint.node)),
      port: external.endpoint.port,
    };
    next.connections.push({
      id: allocate(`external/${index}`),
      kind:
        external.port.kind === "command" || external.port.kind === "event"
          ? "command"
          : external.port.kind === "attachment"
            ? "attachment"
            : "value",
      from: external.direction === "input" ? structuredClone(bound) : internal,
      to: external.direction === "input" ? internal : structuredClone(bound),
    });
  }
  reconcileBoard(next);
  validateAuthoredDocument(next);
  return next;
}
export function selectionRecipe(
  document: AuthoredDocument,
  selection: string[],
  metadata: { id: string; title: string; description: string; tags: string[] },
  external: "expose" | "reject" | "include" = "expose",
): CompositeRecipe {
  validateAuthoredDocument(document);
  const chosen = new Set(selection),
    allComponents = [...document.nodes, ...document.resources];
  if (external === "include") {
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of document.connections)
        if (chosen.has(c.from.node) !== chosen.has(c.to.node)) {
          chosen.add(c.from.node);
          chosen.add(c.to.node);
          changed = true;
        }
    }
  }
  if (
    !chosen.size ||
    selection.some((id) => !allComponents.some((n) => n.id === id))
  )
    throw new Error("Choose existing components to save");
  const d = emptyAuthoredDocument();
  d.nodes = structuredClone(document.nodes.filter((n) => chosen.has(n.id)));
  d.resources = structuredClone(
    document.resources.filter((n) => chosen.has(n.id)),
  );
  d.scopes = structuredClone(
    document.scopes.filter((s) =>
      [...d.nodes, ...d.resources].some((n) => n.scope === s.id),
    ),
  );
  d.connections = structuredClone(
    document.connections.filter(
      (c) => chosen.has(c.from.node) && chosen.has(c.to.node),
    ),
  );
  for (const c of d.connections)
    for (const b of Object.values(c.argumentBindings ?? {}))
      if (!chosen.has(b.from.node))
        throw new Error(
          `${c.id}: include the bound argument source ${b.from.node} in the selection`,
        );
  const ports: CompositeRecipe["externalPorts"] = [];
  for (const c of document.connections)
    if (chosen.has(c.from.node) !== chosen.has(c.to.node)) {
      if (external === "reject")
        throw new Error(`${c.id}: selection has external dependencies`);
      const direction = chosen.has(c.to.node) ? "input" : "output",
        endpoint = direction === "input" ? c.to : c.from;
      const def = publicDefinition(
        requireValue(
          [...d.nodes, ...d.resources].find((n) => n.id === endpoint.node),
        ).definition,
      );
      const port =
        direction === "input"
          ? (def.inputs[endpoint.port] ?? {
              kind: "command" as const,
              unit: "",
            })
          : def.outputs[endpoint.port];
      if (
        !ports.some(
          (p) =>
            p.endpoint.node === endpoint.node &&
            p.endpoint.port === endpoint.port &&
            p.direction === direction,
        )
      )
        ports.push({
          name: `${endpoint.node}/${endpoint.port}`,
          endpoint: structuredClone(endpoint),
          direction,
          port,
        });
    }
  d.groups = structuredClone(
    document.groups.filter((g) => g.members.every((id) => chosen.has(id))),
  );
  const groupIds = new Set(d.groups.map((g) => g.id));
  for (const g of d.groups)
    if (g.parent && !groupIds.has(g.parent)) delete g.parent;
  // Intentional interfaces survive selection export, even without boundary wires.
  for (const g of d.groups.filter((g) => !g.parent))
    for (const p of g.exposedPorts ?? [])
      if (
        !ports.some(
          (e) =>
            e.direction === p.direction &&
            e.endpoint.node === p.endpoint.node &&
            e.endpoint.port === p.endpoint.port,
        )
      ) {
        let name = p.name;
        let suffix = 2;
        while (ports.some((e) => e.name === name))
          name = `${p.name} ${suffix++}`;
        ports.push({ ...structuredClone(p), name, required: false });
      }
  function prune(l: Layout): Layout | null {
    const children = l.children
      .map(prune)
      .filter((l): l is Layout => Boolean(l));
    if (!(l.node && chosen.has(l.node)) && !children.length) return null;
    const next = { ...l, children };
    if (next.node && !chosen.has(next.node)) delete next.node;
    return next;
  }
  d.layout = prune(document.layout) ?? emptyLayout();
  d.editor.positions = structuredClone(
    Object.fromEntries(
      Object.entries(document.editor.positions).filter(
        ([id]) => chosen.has(id) || groupIds.has(id),
      ),
    ),
  );
  d.lesson = structuredClone(document.lesson);
  if (document.presentation) {
    d.presentation = structuredClone(document.presentation);
    if (d.presentation.mode === "board")
      d.presentation.items = d.presentation.items.filter(
        (item) => item.kind !== "text" && item.kind !== "box",
      );
    reconcileBoard(d);
  }
  const r: CompositeRecipe = {
    recipeVersion: 1,
    ...metadata,
    version: 1,
    document: d,
    nested: [],
    externalPorts: ports,
    parameters: [],
    dependencies: [
      ...new Map(
        [...d.nodes, ...d.resources].map((n) => [
          n.definition,
          { id: n.definition, version: n.version },
        ]),
      ).values(),
    ],
    assumptions: [],
  };
  validateRecipe(r);
  return r;
}
export function removeNodes(document: AuthoredDocument, selection: string[]) {
  const next = structuredClone(document),
    ids = new Set(selection);
  next.nodes = next.nodes.filter((n) => !ids.has(n.id));
  next.resources = next.resources.filter((n) => !ids.has(n.id));
  next.connections = next.connections.filter(
    (c) => !ids.has(c.from.node) && !ids.has(c.to.node),
  );
  function prune(l: Layout) {
    l.children = l.children.filter((c) => !c.node || !ids.has(c.node));
    l.children.forEach(prune);
    if (l.node && ids.has(l.node)) delete l.node;
  }
  prune(next.layout);
  for (const g of next.groups) {
    g.members = g.members.filter((id) => !ids.has(id));
    g.parameters = g.parameters.filter((p) => !ids.has(p.node));
    if (g.exposedPorts)
      g.exposedPorts = g.exposedPorts.filter((p) => !ids.has(p.endpoint.node));
  }
  const empty = new Set(
    next.groups.filter((g) => !g.members.length).map((g) => g.id),
  );
  next.groups = next.groups.filter((g) => !empty.has(g.id));
  for (const g of next.groups)
    if (g.parent && empty.has(g.parent)) delete g.parent;
  for (const id of [...ids, ...empty]) delete next.editor.positions[id];
  reconcileBoard(next);
  validateAuthoredDocument(next);
  return next;
}
