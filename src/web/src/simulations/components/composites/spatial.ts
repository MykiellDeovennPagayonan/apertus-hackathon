import { defaultAssembly } from "../../runtime/assembly";
import { assemblyDocument } from "../../runtime/authoring/adapters";
import { removeNodes, selectionRecipe } from "../../runtime/authoring/recipes";
import { requireValue } from "../../runtime/authoring/requireValue";
import type {
  AuthoredDocument,
  ComponentInstance,
  CompositeRecipe,
} from "../../runtime/authoring/types";
import {
  emptyAuthoredDocument,
  emptyLayout,
} from "../../runtime/authoring/types";
import { publicDefinition } from "../catalog";
import { TownExperiment } from "../compositions/TownExperiment";
import { buildTruss } from "../prefabs/TrussAssembly";
import { createPublicNode, modelRecipe } from "./catalog";

function recipe(
  id: string,
  title: string,
  d: AuthoredDocument,
): CompositeRecipe {
  return {
    recipeVersion: 1,
    id,
    version: 1,
    title,
    description: d.lesson.instruction,
    tags: ["spatial", title.includes("Town") ? "town" : "mechanics"],
    document: d,
    nested: [],
    parameters: [],
    externalPorts: [],
    dependencies: [
      ...new Map(
        d.nodes.map((n) => [
          n.definition,
          { id: n.definition, version: n.version },
        ]),
      ).values(),
    ],
    assumptions: d.lesson.explanation.split("\n"),
  };
}
function link(
  d: AuthoredDocument,
  from: string,
  port: string,
  to: string,
  input: string,
) {
  d.connections.push({
    id: `link/${from}/${to}/${input}`,
    kind: "value",
    from: { node: from, port },
    to: { node: to, port: input },
  });
}
export function trussNodes(
  response: ComponentInstance,
  allocate: (id: string) => string,
): ComponentInstance[] {
  const truss = buildTruss(
    Number(response.configuration.spanScale),
    Boolean(response.configuration.dense),
    "generated",
  );
  const ids = new Map(truss.joints.map((j) => [j.id, allocate(j.id)]));
  return [
    ...truss.joints.map((j) => ({
      ...createPublicNode(
        "models/TrussJoint",
        requireValue(ids.get(j.id)),
        response.scope,
      ),
      configuration: { x: j.x, y: j.y },
    })),
    ...truss.members.map((m) => ({
      ...createPublicNode("models/TrussMember", allocate(m.id), response.scope),
      label: requireValue(m.id.split("/").at(-1)),
      configuration: {
        a: ids.get(m.a),
        b: ids.get(m.b),
        kind: m.kind,
        present: m.present,
      },
    })),
  ];
}
export function bridgeRecipe(spanScale = 1, dense = false): CompositeRecipe {
  const base = modelRecipe("models/BridgeResponse"),
    d = base.document,
    response = requireValue(d.nodes.find((n) => n.id === "model"));
  response.configuration = { spanScale, dense };
  const topology = trussNodes(response, (id) => id);
  d.nodes.push(...topology);
  for (const n of topology)
    link(
      d,
      n.id,
      "data",
      response.id,
      n.definition === "models/TrussJoint" ? "joints" : "members",
    );
  const load = createPublicNode("models/BridgeLoad", "load", response.scope);
  d.nodes.push(load);
  link(d, "load", "data", response.id, "load");
  for (const [key, contract] of Object.entries(
    publicDefinition(load).commands,
  )) {
    if (key === "RESET") continue;
    const id = `control/${key}`,
      control = createPublicNode("controls/Slider", id, response.scope);
    control.configuration = {
      label: contract.description,
      initial: JSON.stringify({ value: key === "MOVE_LOAD" ? 0.5 : 10 }),
      mode: "immediate",
    };
    d.nodes.push(control);
    d.connections.push({
      id: `link/${id}`,
      kind: "command",
      from: { node: id, port: "submit" },
      to: { node: "load", port: key },
    });
    d.layout.children[1].children.push({
      ...emptyLayout(`layout/${id}`),
      node: id,
    });
  }
  d.nodes = d.nodes.filter((n) => n.id !== "control/SELECT_MEMBER");
  d.connections = d.connections.filter(
    (c) => c.from.node !== "control/SELECT_MEMBER",
  );
  d.layout.children[1].children = d.layout.children[1].children.filter(
    (l) => l.node !== "control/SELECT_MEMBER",
  );
  requireValue(d.nodes.find((n) => n.id === "display/selected")).definition =
    "displays/Inspector";
  const inspector = d.layout.children[2].children.find(
    (l) => l.node === "display/selected",
  );
  d.layout.children[2].children = d.layout.children[2].children.filter(
    (l) => l.node !== "display/selected",
  );
  if (inspector) d.layout.children[0].children.push(inspector);
  return recipe(
    `recipes/BridgeLab${dense ? "Dense" : ""}${spanScale === 2 ? "Long" : ""}`,
    "Bridge Lab",
    d,
  );
}
export function townRecipe(): CompositeRecipe {
  const d = modelRecipe("models/TownNavigation").document,
    scope = d.nodes[0].scope;
  for (const instance of TownExperiment.instances) {
    let n: ComponentInstance;
    if (instance.prefab === "Building") {
      const { id: _id, ...configuration } = instance.parameters as Record<
        string,
        unknown
      >;
      n = {
        ...createPublicNode("models/TownBuilding", instance.id, scope),
        configuration,
      };
      link(d, n.id, "data", "model", "buildings");
    } else if (instance.prefab === "Market") {
      n = createPublicNode("models/Market", instance.id, scope);
      link(d, n.id, "data", "model", "market");
    } else {
      const p = instance.parameters as {
        homeId: string;
        role: string;
        seed: number;
      };
      n = {
        ...createPublicNode("models/DailyRoutine", instance.id, scope),
        configuration: {
          ...p,
          daytimeId: p.role === "student" ? "school" : "workshop",
          squareId: "square",
        },
      };
      link(d, n.id, "data", "model", "routines");
    }
    d.nodes.push(n);
  }
  const market = requireValue(
    d.nodes.find((n) => n.definition === "models/Market"),
  );
  for (const [key, c] of Object.entries(
    publicDefinition(market).commands,
  )) {
    if (key === "RESET") continue;
    const id = `control/${key}`,
      n = createPublicNode("controls/Button", id, scope);
    n.configuration.label = c.description;
    d.nodes.push(n);
    d.connections.push({
      id: `link/${id}`,
      kind: "command",
      from: { node: id, port: "submit" },
      to: { node: market.id, port: key },
    });
    d.layout.children[1].children.push({
      ...emptyLayout(`layout/${id}`),
      node: id,
    });
  }
  for (const n of [...d.nodes]) {
    const visual =
      n.definition === "models/TownBuilding"
        ? "appearance/TownBuilding"
        : n.definition === "models/DailyRoutine"
          ? "appearance/TownCitizen"
          : n.definition === "models/Market"
            ? "appearance/Market"
            : undefined;
    if (!visual) continue;
    const appearance = createPublicNode(visual, `visual/${n.id}`, scope);
    appearance.configuration.target = n.id;
    d.nodes.push(appearance);
    d.connections.push({
      id: `attach/${appearance.id}`,
      kind: "attachment",
      from: { node: appearance.id, port: "scene" },
      to: { node: "appearance", port: "scene" },
    });
  }
  for (const visual of [
    "appearance/EnvironmentLighting",
    "appearance/TownScenery",
  ]) {
    const n = createPublicNode(visual, visual, scope);
    d.nodes.push(n);
    d.connections.push({
      id: `attach/${visual}`,
      kind: "attachment",
      from: { node: n.id, port: "scene" },
      to: { node: "appearance", port: "scene" },
    });
  }
  d.lesson.title = "Town Lab";
  return recipe("recipes/TownLab", "Town Lab", d);
}
export function projectileComparison(): CompositeRecipe {
  const d = emptyAuthoredDocument();
  d.scopes = [{ id: "scope/comparison", label: "Projectile comparison" }];
  for (const [index, angle] of [45, 30].entries()) {
    const child = modelRecipe("models/Projectile").document,
      prefix = `ball${index}`;
    const ids = new Map(child.nodes.map((n) => [n.id, `${prefix}/${n.id}`]));
    for (const n of child.nodes) {
      n.id = requireValue(ids.get(n.id));
      n.scope = d.scopes[0].id;
      if (n.definition === "models/Projectile") n.configuration.angle = angle;
      d.nodes.push(n);
    }
    for (const c of child.connections) {
      c.id = `${prefix}/${c.id}`;
      c.from.node = requireValue(ids.get(c.from.node));
      c.to.node = requireValue(ids.get(c.to.node));
      d.connections.push(c);
    }
    const rewrite = (l: typeof child.layout) => {
      l.id = `${prefix}/${l.id}`;
      if (l.node) l.node = requireValue(ids.get(l.node));
      l.children.forEach(rewrite);
    };
    rewrite(child.layout);
    d.layout.children.push(child.layout);
  }
  const shared = new Set([
    "set:velocity",
    "set:gravity",
    "set:playing",
    "set:slowMo",
    "LAUNCH",
    "RESET",
  ]);
  for (const c of [...d.connections])
    if (
      c.kind === "command" &&
      shared.has(c.to.port) &&
      c.from.node.startsWith("ball1/")
    ) {
      const obsolete = c.from.node;
      c.from.node = c.from.node.replace("ball1/", "ball0/");
      d.nodes = d.nodes.filter((n) => n.id !== obsolete);
      const prune = (l: typeof d.layout) => {
        l.children = l.children.filter((p) => p.node !== obsolete);
        l.children.forEach(prune);
      };
      prune(d.layout);
    }
  for (const c of [...d.connections])
    if (c.kind === "command" && c.to.port === "set:angle")
      d.connections.push({
        id: `${c.id}/restart-peer`,
        kind: "command",
        from: structuredClone(c.from),
        to: {
          node: c.to.node.startsWith("ball0/") ? "ball1/model" : "ball0/model",
          port: "RESTART",
        },
        arguments: {},
      });
  d.lesson = {
    title: "Projectile Comparison",
    instruction:
      "Compare launch angles with shared speed, gravity and playback.",
    explanation: "Same launch and landing height; no air resistance.",
  };
  return recipe("recipes/ProjectileComparison", d.lesson.title, d);
}
export function physicalComparison(
  ref: string,
  title: string,
): CompositeRecipe {
  const assembly = defaultAssembly(ref);
  assembly.title = title;
  assembly.instances.push({
    ...structuredClone(assembly.instances[0]),
    id: "object/second",
    label: "Second model",
    parameters: {
      ...assembly.instances[0].parameters,
      ...(ref.endsWith("Pendulum") ? { length: 2 } : { resistance: 0.3 }),
    },
  });
  return recipe(
    `recipes/${title.replaceAll(" ", "")}`,
    title,
    assemblyDocument(assembly),
  );
}
export function scheduledTripRecipe(): CompositeRecipe {
  const d = modelRecipe("models/ScheduledTrip").document,
    scope = d.nodes[0].scope;
  const canvas = createPublicNode("canvases/town", "world", scope);
  d.nodes.push(canvas);
  d.layout.children[0].children.push({
    ...emptyLayout("layout/world"),
    node: canvas.id,
  });
  d.connections.push({
    id: "timeline/world",
    kind: "attachment",
    from: { node: "model", port: "appearance" },
    to: { node: "world", port: "timeline" },
  });
  for (const [definition, id] of [
    ["prefabs/AuthoredGround", "ground"],
    ["prefabs/AuthoredBuilding", "destination"],
    ["prefabs/AuthoredPerson", "person"],
  ]) {
    const n = createPublicNode(definition, id, scope);
    if (id === "destination") Object.assign(n.configuration, { x: 8, z: 0 });
    if (id === "person")
      n.configuration.schedule = [
        { id: "trip", at: 8, target: "destination", x: 0, z: 0 },
      ];
    d.nodes.push(n);
    link(d, id, "data", "model", "objects");
    d.connections.push({
      id: `attach/${id}`,
      kind: "attachment",
      from: { node: id, port: "appearance" },
      to: { node: "world", port: "objects" },
    });
  }
  d.lesson.title = "Scheduled Trip";
  return recipe("recipes/ScheduledTrip", "Scheduled Trip", d);
}
export function townEnvironmentRecipe(): CompositeRecipe {
  const d = townRecipe().document;
  const removed = d.nodes
    .filter(
      (n) =>
        n.definition === "models/DailyRoutine" ||
        n.definition === "appearance/TownCitizen",
    )
    .map((n) => n.id);
  return recipe(
    "recipes/TownEnvironment",
    "Town Environment",
    removeNodes(d, removed),
  );
}
export function dailyRoutineRecipe(): CompositeRecipe {
  const d = townRecipe().document;
  const routines = d.nodes.filter(
    (n) => n.definition === "models/DailyRoutine",
  );
  const removed = new Set(routines.slice(1).map((n) => n.id));
  return recipe(
    "recipes/DailyRoutine",
    "Daily Routine",
    removeNodes(
      d,
      d.nodes
        .filter(
          (n) =>
            removed.has(n.id) || removed.has(String(n.configuration.target)),
        )
        .map((n) => n.id),
    ),
  );
}
export function marketRecipe(): CompositeRecipe {
  const d = townRecipe().document;
  return selectionRecipe(
    d,
    ["market", "visual/market", "control/MOVE_MARKET", "control/MARKET_BUSY"],
    {
      id: "recipes/Market",
      title: "Market",
      description:
        "Select a town navigation model and its World canvas, then insert a market with its appearance and controls.",
      tags: ["town"],
    },
  );
}
export function spatialRecipes(): CompositeRecipe[] {
  return [
    scheduledTripRecipe(),
    townEnvironmentRecipe(),
    dailyRoutineRecipe(),
    marketRecipe(),
    bridgeRecipe(),
    bridgeRecipe(1, true),
    bridgeRecipe(2, false),
    townRecipe(),
    projectileComparison(),
    physicalComparison(
      "prefabs/physical-systems/Pendulum",
      "Pendulum Comparison",
    ),
    physicalComparison(
      "prefabs/physical-systems/RollingTrack",
      "Rolling Comparison",
    ),
  ];
}
