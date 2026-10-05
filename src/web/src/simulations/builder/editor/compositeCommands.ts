import { publicDefinition } from "../../components/catalog";
import { createPublicNode } from "../../components/composites/catalog";
import { insertRecipe } from "../../runtime/authoring/recipes";
import { visitConfigurationReferences } from "../../runtime/authoring/references";
import {
  type AuthoredDocument,
  type CompositeRecipe,
  type Endpoint,
  emptyLayout,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";

/** Add one component, optionally placing it on the selected compatible canvas. */
export function addCatalogComponent(
  d: AuthoredDocument,
  definition: string,
  id: string,
  destination: string,
  selection: string[],
) {
  const def = publicDefinition(definition);
  if (def.application) {
    const target = d.nodes.find(
      (n) =>
        selection.includes(n.id) && n.definition === def.application?.target,
    );
    if (!target)
      throw new Error(
        `Select ${publicDefinition(def.application.target).title} to apply this preset.`,
      );
    target.configuration = structuredClone(def.defaults);
    return target.id;
  }
  let canvas = d.nodes.find(
    (n) =>
      n.id === destination &&
      publicDefinition(n.definition).category === "canvases",
  );
  const appearance = def.outputs.appearance;
  if (!destination && appearance)
    canvas = d.nodes.find(
      (n) =>
        publicDefinition(n.definition).category === "canvases" &&
        publicDefinition(n.definition).inputs.objects?.unit === appearance.unit,
    );
  if (
    canvas &&
    appearance &&
    publicDefinition(canvas.definition).inputs.objects?.unit !== appearance.unit
  )
    throw new Error(
      `Choose a compatible ${appearance.unit} canvas, or choose a new compatible canvas.`,
    );
  let scope =
    canvas?.scope ??
    d.nodes.find((n) => selection.includes(n.id))?.scope ??
    d.scopes[0]?.id;
  if (def.category === "canvases" || !scope) {
    scope = `scope/${id}`;
    d.scopes.push({
      id: scope,
      label: def.category === "canvases" ? def.title : "Components",
    });
  }
  if (
    !canvas &&
    appearance &&
    ["cartesian", "physical", "diagram", "town"].includes(appearance.unit)
  ) {
    scope = `scope/canvas-${id}`;
    d.scopes.push({ id: scope, label: `${def.title} canvas` });
    canvas = createPublicNode(
      `canvases/${appearance.unit}`,
      `canvas-${id}`,
      scope,
    );
    d.nodes.push(canvas);
    d.layout.children.push({
      ...emptyLayout(`layout/canvas-${id}`),
      node: canvas.id,
    });
  }
  const n = createPublicNode(definition, id, scope);
  if (def.category === "resources") d.resources.push(n);
  else d.nodes.push(n);
  if (canvas && appearance)
    d.connections.push({
      id: `placement/${id}`,
      kind: "attachment",
      from: { node: id, port: "appearance" },
      to: { node: canvas.id, port: "objects" },
    });
  if (!["models", "resources", "behaviors"].includes(def.category))
    d.layout.children.push({
      ...emptyLayout(`layout/${id}`),
      ...(def.category === "layout"
        ? {
            kind: def.id
              .split("/")[1]
              .toLowerCase() as AuthoredDocument["layout"]["kind"],
          }
        : {}),
      node: id,
    });
  validateAuthoredDocument(d);
  return id;
}

/** Expand into one new document, optionally reusing a single matching canvas. */
export function insertComposite(
  document: AuthoredDocument,
  recipe: CompositeRecipe,
  resolve: (id: string, version: number) => CompositeRecipe,
  allocate: (id: string) => string,
  overrides: Record<string, unknown>,
  bindings: Record<string, Endpoint>,
  destination: string,
) {
  const next = insertRecipe(
    document,
    recipe,
    resolve,
    allocate,
    overrides,
    bindings,
  );
  const added = next.nodes.filter(
    (n) => !document.nodes.some((old) => old.id === n.id),
  );
  const target = destination
    ? next.nodes.find((n) => n.id === destination)
    : undefined;
  if (destination && !target)
    throw new Error("The destination canvas is no longer available.");
  const canvases = added.filter(
    (n) => publicDefinition(n.definition).category === "canvases",
  );
  if (target && canvases.length) {
    if (canvases.length !== 1 || canvases[0].definition !== target.definition)
      throw new Error(
        "This lab needs its own compatible canvases. Choose new compatible canvas / independent lab.",
      );
    const source = canvases[0];
    // Do not silently replace an already bound singleton canvas input.
    for (const c of next.connections.filter((c) => c.to.node === source.id)) {
      const p = publicDefinition(target.definition).inputs[c.to.port];
      if (
        p?.cardinality !== "many" &&
        document.connections.some(
          (old) => old.to.node === target.id && old.to.port === c.to.port,
        )
      )
        throw new Error(
          `Destination already has ${c.to.port}; use an independent lab.`,
        );
    }
    const sourceScope = source.scope;
    for (const n of [...next.nodes, ...next.resources])
      if (n.scope === sourceScope) n.scope = target.scope;
    for (const c of next.connections) {
      if (c.from.node === source.id) c.from.node = target.id;
      if (c.to.node === source.id) c.to.node = target.id;
    }
    const prune = (layout: AuthoredDocument["layout"]) => {
      layout.children = layout.children.filter((l) => l.node !== source.id);
      layout.children.forEach(prune);
    };
    prune(next.layout);
    for (const n of added)
      visitConfigurationReferences(n, (record, key) => {
        if (record[key] === source.id) record[key] = target.id;
      });
    next.nodes = next.nodes.filter((n) => n.id !== source.id);
    for (const g of next.groups) {
      g.members = g.members.filter((id) => id !== source.id);
      g.parameters = g.parameters.filter((p) => p.node !== source.id);
    }
  } else if (target && !recipe.externalPorts.length) {
    const scopes = new Set(added.map((n) => n.scope));
    if (scopes.size > 1)
      throw new Error(
        "This composite needs independent groups; choose an independent lab.",
      );
    for (const n of [...next.nodes, ...next.resources])
      if (scopes.has(n.scope)) n.scope = target.scope;
  }
  next.scopes = next.scopes.filter((s) =>
    [...next.nodes, ...next.resources].some((n) => n.scope === s.id),
  );
  for (const group of next.groups)
    if (!document.groups.some((g) => g.id === group.id) && !group.parent)
      group.collapsed = true;
  validateAuthoredDocument(next);
  return next;
}
