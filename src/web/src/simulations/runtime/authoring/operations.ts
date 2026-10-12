import { publicDefinition } from "../../components/catalog";
import { acceptedCommandArguments } from "../../components/controls/commandPresentation";
import {
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../parameterSchema";
import { loadRecipe } from "../recipes/loadRecipe";
import { premadeRecipe } from "../recipes/registry";
import { parseRecipe } from "../recipes/schema";
import { serializeRecipe } from "../recipes/serializeRecipe";
import { type ArrangementRequest, arrangeDocument } from "./arrangement";
import {
  addBoundControl,
  addBoundObservation,
  type ControlRequest,
  type ObservationRequest,
} from "./bindings";
import {
  boardItemMinimum,
  extent,
  reconcileBoard,
  resizeBoardRect,
} from "./board";
import { addCatalogComponent } from "./composites";
import { connectAuthored } from "./connections";
import { insertRecipe, removeNodes } from "./recipes";
import { regenerateTruss } from "./regenerateTruss";
import { DocumentRuntime } from "./runtime";
import type { AuthoredDocument, CompositeRecipe, Endpoint } from "./types";
import { assertData, validateAuthoredDocument } from "./validate";

export type ToolRequest =
  | {
      tool: "insert_recipe";
      arguments: {
        recipe: string;
        version: number;
        alias: string;
        overrides: Record<string, unknown>;
      };
    }
  | {
      tool: "configure";
      arguments: { target: string; changes: Record<string, unknown> };
    }
  | { tool: "add_control"; arguments: ControlRequest }
  | { tool: "add_observation"; arguments: ObservationRequest }
  | {
      tool: "insert_component";
      arguments: {
        definition: string;
        version: number;
        alias: string;
        configuration: Record<string, unknown>;
      };
    }
  | { tool: "connect"; arguments: { from: Endpoint; to: Endpoint } }
  | {
      tool: "regenerate_truss";
      arguments: { target: string; spanScale: 1 | 2; dense: boolean };
    }
  | { tool: "remove"; arguments: { targets: string[] } }
  | { tool: "arrange"; arguments: ArrangementRequest }
  | {
      tool: "resize";
      arguments: { target: string; width: number; height: number };
    }
  | { tool: "set_lesson"; arguments: AuthoredDocument["lesson"] };

/** Patches are top-level subsets. Nested objects (such as task) are complete records. */
export function patchSchema(schema: ParameterSchema): ParameterSchema {
  if (schema.type !== "object")
    throw new Error("Configuration must be an object");
  return object(schema.properties, Object.keys(schema.properties));
}
export const recipeOverrideSchema = (recipe: CompositeRecipe) =>
  object(
    Object.fromEntries(recipe.parameters.map((p) => [p.name, p.schema])),
    recipe.parameters.map((p) => p.name),
  );

export type OperationState = {
  document: AuthoredDocument;
  handles: Record<string, string>;
};
const toolFields: Record<ToolRequest["tool"], readonly string[]> = {
  insert_recipe: ["recipe", "version", "alias", "overrides"],
  configure: ["target", "changes"],
  resize: ["target", "width", "height"],
  add_control: ["target", "command", "field", "widget", "label"],
  add_observation: ["source", "output", "widget", "label"],
  insert_component: ["definition", "version", "alias", "configuration"],
  connect: ["from", "to"],
  regenerate_truss: ["target", "spanScale", "dense"],
  remove: ["targets"],
  arrange: [
    "template",
    "main",
    "controls",
    "results",
    "narrowOrder",
    "preserveLocked",
  ],
  set_lesson: ["title", "instruction", "explanation"],
};
export function validateToolRequest(request: ToolRequest) {
  assertData(request);
  if (
    !request ||
    typeof request !== "object" ||
    Object.keys(request).some((k) => !["tool", "arguments"].includes(k)) ||
    !Object.hasOwn(toolFields, request.tool) ||
    !request.arguments ||
    typeof request.arguments !== "object" ||
    Array.isArray(request.arguments)
  )
    throw new Error("Invalid authoring tool request");
  const fields = toolFields[request.tool];
  if (
    Object.keys(request.arguments).length !== fields.length ||
    fields.some((key) => !Object.hasOwn(request.arguments, key))
  )
    throw new Error("Unknown or missing operation argument");
  if (
    request.tool === "arrange" &&
    (request.arguments.preserveLocked !== true ||
      !["scene-with-sidebar", "comparison", "vertical"].includes(
        request.arguments.template,
      ))
  )
    throw new Error("Invalid semantic arrangement");
}
export function applyAuthoringOperation(
  state: OperationState,
  request: ToolRequest,
  allocate: (id: string) => string,
): OperationState {
  validateToolRequest(request);
  let document = structuredClone(state.document);
  const handles = { ...state.handles };
  const resolve = (id: string) => {
    const target = handles[id] ?? id;
    if (
      ![...document.nodes, ...document.resources].some((n) => n.id === target)
    )
      throw new Error(`${id}: unknown component handle`);
    return target;
  };
  const claimAlias = (alias: string) => {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/.test(alias) ||
      Object.hasOwn(handles, alias)
    )
      throw new Error("Invalid or duplicate alias");
  };
  switch (request.tool) {
    case "insert_recipe": {
      const args = request.arguments;
      claimAlias(args.alias);
      const recipe = premadeRecipe(args.recipe);
      if (recipe.version !== args.version)
        throw new Error("Recipe version is unavailable");
      validateValue(recipeOverrideSchema(recipe), args.overrides, "overrides");
      const mapping: Record<string, string> = {};
      document = insertRecipe(
        document,
        recipe,
        () => {
          throw new Error("Registered recipes must be expanded");
        },
        (id) => {
          const next = `${args.alias}/${id}`;
          mapping[id] = next;
          return next;
        },
        args.overrides,
      );
      for (const [id, next] of Object.entries(mapping))
        handles[`${args.alias}/${id}`] = next;
      const primary = recipe.document.nodes.find(
        (n) => publicDefinition(n).category === "models",
      );
      if (primary) handles[args.alias] = mapping[primary.id];
      const scopes = new Set(recipe.document.scopes.map((s) => mapping[s.id]));
      for (const node of document.nodes.filter((n) => scopes.has(n.scope))) {
        node.label = `${args.alias} · ${node.label}`;
        if (typeof node.configuration.label === "string")
          node.configuration.label = `${args.alias} · ${node.configuration.label}`;
      }
      for (const scope of document.scopes)
        if (scopes.has(scope.id))
          scope.label = `${args.alias} · ${scope.label}`;
      break;
    }
    case "configure": {
      const id = resolve(request.arguments.target);
      const node = [...document.nodes, ...document.resources].find(
        (n) => n.id === id,
      );
      if (!node) throw new Error("Unknown configuration target");
      const schema = publicDefinition(node).configuration;
      validateValue(patchSchema(schema), request.arguments.changes, "changes");
      node.configuration = {
        ...node.configuration,
        ...structuredClone(request.arguments.changes),
      };
      validateValue(schema, node.configuration, "configuration");
      break;
    }
    case "insert_component": {
      const args = request.arguments;
      claimAlias(args.alias);
      const def = publicDefinition(args.definition, args.version);
      validateValue(patchSchema(def.configuration), args.configuration);
      const id = allocate(args.alias);
      addCatalogComponent(document, args.definition, id, "", []);
      const node = [...document.nodes, ...document.resources].find(
        (n) => n.id === id,
      );
      if (!node)
        throw new Error(
          "Component insertion did not create a configurable instance",
        );
      node.configuration = {
        ...node.configuration,
        ...structuredClone(args.configuration),
      };
      handles[args.alias] = id;
      break;
    }
    case "add_control":
      document = addBoundControl(
        document,
        { ...request.arguments, target: resolve(request.arguments.target) },
        allocate("control"),
      );
      break;
    case "add_observation":
      document = addBoundObservation(
        document,
        { ...request.arguments, source: resolve(request.arguments.source) },
        allocate("observation"),
      );
      break;
    case "connect":
      document = connectAuthored(
        document,
        {
          ...request.arguments.from,
          node: resolve(request.arguments.from.node),
        },
        { ...request.arguments.to, node: resolve(request.arguments.to.node) },
        allocate("connection"),
      );
      break;
    case "regenerate_truss":
      document = regenerateTruss(
        document,
        resolve(request.arguments.target),
        request.arguments.spanScale,
        request.arguments.dense,
        allocate,
      ).document;
      break;
    case "remove":
      document = removeNodes(document, request.arguments.targets.map(resolve));
      break;
    case "arrange": {
      const map = (values: string[]) => values.map((id) => handles[id] ?? id);
      document = arrangeDocument(document, {
        ...request.arguments,
        main: map(request.arguments.main),
        controls: map(request.arguments.controls),
        results: map(request.arguments.results),
        narrowOrder: map(request.arguments.narrowOrder),
      });
      break;
    }
    case "resize": {
      const args = request.arguments;
      validateValue(
        object({
          target: { type: "string", minLength: 1, maxLength: 500 },
          width: num(1, 10000),
          height: num(1, 10000),
        }),
        args,
      );
      const board = document.presentation;
      if (board?.mode !== "board")
        throw new Error("Resize requires a board presentation");
      const item = board.items.find((item) => item.id === args.target);
      if (!item?.layoutId || item.locked)
        throw new Error("Resize requires an unlocked component");
      const before = item.rect;
      const minimum = boardItemMinimum(document, item.layoutId);
      if (args.width < minimum.width || args.height < minimum.height)
        throw new Error("Requested size is below the component minimum");
      item.rect = resizeBoardRect(
        before,
        args.width - before.width,
        args.height - before.height,
        item.aspectRatio,
        0,
        minimum,
      );
      const dx = item.rect.width - before.width;
      const dy = item.rect.height - before.height;
      if (dx === 0 && dy === 0)
        throw new Error(
          "Resize must change the current presentation dimensions",
        );
      // Keep adjacent content reachable without changing its size or the model.
      for (const peer of board.items.filter((peer) => peer !== item)) {
        const rect = peer.rect;
        const beside =
          rect.x >= before.x + before.width &&
          rect.y < before.y + Math.max(before.height, item.rect.height) &&
          rect.y + rect.height > before.y;
        const below =
          rect.y >= before.y + before.height &&
          rect.x < before.x + Math.max(before.width, item.rect.width) &&
          rect.x + rect.width > before.x;
        if ((beside && dx !== 0) || (below && dy !== 0)) {
          if (peer.locked) throw new Error("Resize would move locked content");
          peer.rect = {
            ...rect,
            x: rect.x + (beside ? dx : 0),
            y: rect.y + (below ? dy : 0),
          };
        }
      }
      board.startView = extent(board.items.map((item) => item.rect));
      break;
    }
    case "set_lesson":
      document.lesson = structuredClone(request.arguments);
      break;
    default:
      throw new Error("Unknown authoring tool");
  }
  assertData(document);
  reconcileBoard(document);
  validateAuthoredDocument(document);
  // Authored control defaults mirror the accepted authored target after any patch.
  const snapshot = new DocumentRuntime(document).getSnapshot();
  for (const connection of document.connections.filter(
    (c) => c.kind === "command" && !c.arguments,
  )) {
    const control = document.nodes.find((n) => n.id === connection.from.node);
    if (control && Object.hasOwn(control.configuration, "initial")) {
      const initial = acceptedCommandArguments(
        connection.to.port,
        snapshot.state[connection.to.node],
      );
      if (initial) control.configuration.initial = JSON.stringify(initial);
    }
  }
  return { document, handles };
}

/** Headless preparation uses the same serializer/parser/runtime as import and Remix. */
export function finalizeRecipe(
  document: AuthoredDocument,
  metadata: Partial<CompositeRecipe> = {},
) {
  validateAuthoredDocument(document, true);
  if (
    !document.nodes.length ||
    !document.lesson.title.trim() ||
    !document.lesson.instruction.trim()
  )
    throw new Error("A lesson needs content, title, and instructions");
  for (const node of document.nodes.filter(
    (n) => n.definition === "models/BridgeResponse",
  ))
    for (const port of ["joints", "members", "load"])
      if (
        !document.connections.some(
          (c) => c.to.node === node.id && c.to.port === port,
        )
      )
        throw new Error("A bridge needs declared topology and load");
  const candidate: CompositeRecipe = {
    recipeVersion: 2,
    id: metadata.id ?? "generated/lesson",
    version: metadata.version ?? 1,
    title: document.lesson.title,
    description: metadata.description ?? document.lesson.instruction,
    tags: metadata.tags ?? [],
    document: structuredClone(document),
    nested: [],
    parameters: metadata.parameters ?? [],
    externalPorts: metadata.externalPorts ?? [],
    dependencies: [],
    assumptions: metadata.assumptions ?? [],
  };
  const recipe = parseRecipe(serializeRecipe(candidate));
  loadRecipe(recipe);
  return recipe;
}
