import { publicDefinition } from "../../components/catalog";
import { DocumentRuntime } from "../../runtime/authoring/runtime";
import type {
  AuthoredDocument,
  CompositeRecipe,
  Endpoint,
  Port,
} from "../../runtime/authoring/types";
import { addCatalogComponent, insertComposite } from "./compositeCommands";

const compatible = (source: Port, target: Port) =>
  (target.kind === "command"
    ? source.kind === "event"
    : target.kind === "attachment"
      ? source.kind === "attachment"
      : ["value", "dataset", "grid"].includes(source.kind) &&
        ["value", "dataset", "grid"].includes(target.kind)) &&
  (target.unit === "*" || source.unit === target.unit);
function resolveExternalBindings(
  recipe: CompositeRecipe,
  authored: AuthoredDocument,
  selection: string[],
) {
  const selected = [...authored.nodes, ...authored.resources].filter((n) =>
      selection.includes(n.id),
    ),
    result: Record<string, Endpoint> = {};
  for (const external of recipe.externalPorts) {
    if (external.required === false) continue;
    const candidates: Endpoint[] = [];
    for (const node of selected) {
      const definition = publicDefinition(node.definition);
      if (external.direction === "input") {
        for (const [port, contract] of Object.entries(definition.outputs))
          if (compatible(contract, external.port))
            candidates.push({ node: node.id, port });
      } else {
        for (const [port, contract] of Object.entries(definition.inputs))
          if (compatible(external.port, contract))
            candidates.push({ node: node.id, port });
        if (external.port.kind === "event")
          for (const port of Object.keys(definition.commands))
            candidates.push({ node: node.id, port });
      }
    }
    if (candidates.length !== 1)
      throw new Error(
        `${recipe.title} needs one selected compatible endpoint for ${external.name}; found ${candidates.length}.`,
      );
    result[external.name] = candidates[0];
  }
  return result;
}

export type InsertionRequest =
  | { definition: string }
  | { recipe: CompositeRecipe; overrides?: Record<string, unknown> };
/** Plan on a clone; the same validated result is used for eligibility and execution. */
export function planInsertion(
  document: AuthoredDocument,
  request: InsertionRequest,
  destination: string,
  selection: string[],
  resolve: (id: string, version: number) => CompositeRecipe,
  prefix: string,
) {
  const canvas = document.nodes.find(
    (n) =>
      n.id === destination &&
      publicDefinition(n.definition).category === "canvases",
  );
  if (destination && !canvas)
    throw new Error(
      "The selected canvas was removed. Choose another canvas or use automatic placement.",
    );
  let next: AuthoredDocument;
  let selected: string[];
  if ("definition" in request) {
    next = structuredClone(document);
    selected = [
      addCatalogComponent(
        next,
        request.definition,
        prefix,
        destination,
        selection,
      ),
    ];
  } else {
    next = insertComposite(
      document,
      request.recipe,
      resolve,
      (id) => `${prefix}/${id}`,
      request.overrides ?? {},
      resolveExternalBindings(request.recipe, document, selection),
      destination,
    );
    selected = next.nodes
      .filter((n) => !document.nodes.some((old) => old.id === n.id))
      .map((n) => n.id);
  }
  new DocumentRuntime(next);
  const added = next.nodes.filter(
    (n) => !document.nodes.some((old) => old.id === n.id),
  );
  const addedCanvas = added.find(
    (n) => publicDefinition(n.definition).category === "canvases",
  );
  let summary: string;
  if ("definition" in request) {
    const definition = publicDefinition(request.definition);
    const attachment = next.connections.find(
      (c) => c.from.node === prefix && c.to.port === "objects",
    );
    const target = next.nodes.find((n) => n.id === attachment?.to.node);
    summary = definition.application
      ? `Applies this preset to ${next.nodes.find((n) => n.id === selected[0])?.label}.`
      : target
        ? `Adds one ${definition.title.toLowerCase()} to ${target.label}.`
        : (definition.discovery?.placement ??
          "Adds one component to the workspace.");
  } else
    summary = addedCanvas
      ? "Adds a separate experiment with its own canvas."
      : canvas
        ? `Adds ${request.recipe.title} using ${canvas.label}.`
        : "Adds a reusable assembly to the workspace.";
  return { document: next, selected, summary };
}
