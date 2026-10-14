import type {
  CompositeRecipe,
  Layout,
} from "../../creation-and-editing/authoring-engine/document";
import { spatialRecipes } from "../../legacy/components/composites/spatial";
import { publicDefinition, publicDefinitions } from "../index";
import { modelRecipe } from "./modelRecipe";

const legacyBuiltInRecipes = [...publicDefinitions.values()]
  .filter(
    (d) =>
      d.category === "models" &&
      ((d.id.startsWith("models/") &&
        ![
          "models/TrussJoint",
          "models/TrussMember",
          "models/BridgeLoad",
          "models/BridgeResponse",
          "models/TownBuilding",
          "models/Market",
          "models/DailyRoutine",
          "models/TownNavigation",
          "models/AIAgent",
          "models/AgentSession",
          "models/DebateSession",
        ].includes(d.id)) ||
        /Authored(Line|Square|GasContainer|FractionBar)$/.test(d.id) ||
        /prefabs\/(chemistry|math-foundations|physical-systems|natural-systems|dynamic-systems)\//.test(
          d.id,
        )),
  )
  .map((d) => modelRecipe(d.id));
legacyBuiltInRecipes.push(...spatialRecipes());
export const builtInRecipes = legacyBuiltInRecipes.map(
  (original): CompositeRecipe => {
    const recipe = structuredClone(original);
    if (recipe.id === "prebuilt/prefabs-AuthoredSquare") {
      recipe.title = "Square exploration";
      recipe.description =
        "Explore size and rotation with a square, connected controls, and live geometry results.";
    }
    if (recipe.id === "prebuilt/prefabs-AuthoredFractionBar") {
      recipe.title = "Fraction bar exploration";
      recipe.description =
        "Change a fraction bar using connected controls and live fraction results.";
    }
    recipe.discovery = {
      kind: "experiment",
      group: "experiments",
      summary: recipe.description,
      placement: "Own canvas, or reuse a compatible destination",
    };
    // A small intentional interface: one primary result and one reset action.
    // Optional means connect later; full internal inspection remains in Expand.
    if (!recipe.externalPorts.length) {
      const primary =
        recipe.document.nodes.find((n) => n.id === "model") ??
        recipe.document.nodes.find(
          (n) => publicDefinition(n).category === "models",
        );
      if (primary) {
        const def = publicDefinition(primary);
        const result = Object.entries(def.outputs).find(
          ([name, port]) =>
            ["value", "dataset", "grid"].includes(port.kind) &&
            name !== "configuration",
        );
        if (result)
          recipe.externalPorts.push({
            name: `Result: ${result[0]}`,
            endpoint: { node: primary.id, port: result[0] },
            direction: "output",
            port: result[1],
            required: false,
          });
        const reset = ["reset", "RESET"].find((name) => def.commands[name]);
        if (reset)
          recipe.externalPorts.push({
            name: "Reset",
            endpoint: { node: primary.id, port: reset },
            direction: "input",
            port: { kind: "command", unit: "" },
            required: false,
          });
      }
    }
    if (recipe.id === "prebuilt/prefabs-AuthoredLine") {
      recipe.version = 2;
      recipe.title = "Line exploration";
      recipe.description =
        "Explore slope and intercept with one line, two sliders, a reset button, and live equation and slope results.";
      recipe.document.lesson.title = recipe.title;
      const keep = new Set([
        "model",
        "canvas",
        "control/set:slope",
        "control/set:intercept",
        "control/reset",
        "display/equation",
        "display/slope",
      ]);
      recipe.document.nodes = recipe.document.nodes.filter((n) =>
        keep.has(n.id),
      );
      const labels: Record<string, string> = {
        "control/set:slope": "Slope slider",
        "control/set:intercept": "Intercept slider",
        "control/reset": "Reset line",
        "display/equation": "Equation",
        "display/slope": "Slope result",
      };
      for (const node of recipe.document.nodes)
        if (labels[node.id]) node.label = labels[node.id];
      recipe.document.connections = recipe.document.connections.filter(
        (c) => keep.has(c.from.node) && keep.has(c.to.node),
      );
      const prune = (layout: Layout) => {
        layout.children = layout.children.filter(
          (child) => !child.node || keep.has(child.node),
        );
        layout.children.forEach(prune);
      };
      prune(recipe.document.layout);
      recipe.parameters = recipe.parameters.filter((p) => keep.has(p.node));
      const model = publicDefinition("prefabs/AuthoredLine");
      recipe.externalPorts = [
        {
          name: "Line appearance",
          endpoint: { node: "model", port: "appearance" },
          direction: "output",
          port: model.outputs.appearance,
          required: false,
        },
        {
          name: "Slope",
          endpoint: { node: "model", port: "slope" },
          direction: "output",
          port: model.outputs.slope,
          required: false,
        },
        {
          name: "Intercept",
          endpoint: { node: "model", port: "intercept" },
          direction: "output",
          port: model.outputs.intercept,
          required: false,
        },
      ];
      recipe.discovery.summary = recipe.description;
    }
    return recipe;
  },
);
export function builtInRecipe(id: string, version = 1) {
  const r = [...builtInRecipes, ...legacyBuiltInRecipes].find(
    (r) => r.id === id && r.version === version,
  );
  if (!r) throw new Error(`${id}@${version}: unresolved recipe dependency`);
  return r;
}
