import {
  builtInRecipe,
  modelRecipe,
} from "../../components/composites/catalog";
import { bridgeRecipe, townRecipe } from "../../components/composites/spatial";
import { type Recipe, resolveRecipe } from "../resolver";
import { insertRecipe, remapDocument } from "./recipes";
import { requireValue } from "./requireValue";
import {
  type AuthoredDocument,
  emptyAuthoredDocument,
  type Layout,
} from "./types";
import { validateAuthoredDocument } from "./validate";
/** Lossless conversion of supported legacy spatial configuration, with original recipe retained for recovery. */
export function spatialRecipeDocument(recipe: Recipe): AuthoredDocument {
  const resolved = resolveRecipe(recipe);
  let d: AuthoredDocument;
  if (resolved.demo === "bridge") {
    d = remapDocument(
      bridgeRecipe(
        Number(resolved.defaults.spanScale),
        Boolean(resolved.defaults.dense),
      ).document,
      (id) => (id.startsWith("generated/") ? `bridge/${id.slice(10)}` : id),
    );
    requireValue(d.nodes.find((n) => n.id === "load")).configuration = {
      position: resolved.defaults.loadPos,
      magnitude: resolved.defaults.loadTons,
    };
    if (resolved.defaults.removedMember) {
      const middle = d.nodes.find(
        (n) =>
          n.label ===
          `diag${Math.floor(resolved.defaults.dense ? 8 / 2 : 5 / 2)}`,
      );
      if (middle) middle.configuration.present = false;
    }
  } else if (resolved.demo === "town") {
    d = townRecipe().document;
    for (const key of ["time", "playing", "speed", "roadClosed"])
      requireValue(d.nodes.find((n) => n.id === "model")).configuration[key] =
        resolved.defaults[key];
    requireValue(d.nodes.find((n) => n.id === "market")).configuration = {
      nearSchool: resolved.defaults.marketNearSchool,
      busy: resolved.defaults.marketBusy,
    };
  } else if (resolved.demo === "projectile") {
    d = emptyAuthoredDocument();
    for (const instance of resolved.instances) {
      const child = modelRecipe("models/Projectile");
      Object.assign(
        requireValue(child.document.nodes.find((n) => n.id === "model"))
          .configuration,
        instance.parameters,
        {
          playing: resolved.defaults.playing,
          slowMo: resolved.defaults.slowMo,
          showVectors: resolved.defaults.showVectors,
        },
      );
      d = insertRecipe(d, child, builtInRecipe, (id) =>
        id === "model" ? instance.id : `${instance.id}/${id}`,
      );
    }
    const scope = "scope/projectile-comparison";
    d.scopes = [{ id: scope, label: "Projectile comparison" }];
    d.nodes.forEach((n) => {
      n.scope = scope;
    });
    const shared = new Set([
      "set:velocity",
      "set:gravity",
      "set:playing",
      "set:slowMo",
      "LAUNCH",
      "RESET",
    ]);
    for (const command of shared) {
      const links = d.connections.filter(
        (c) => c.kind === "command" && c.to.port === command,
      );
      const first = links[0];
      if (!first) continue;
      const removed = new Set(links.slice(1).map((c) => c.from.node));
      links.forEach((c) => {
        c.from.node = first.from.node;
      });
      d.nodes = d.nodes.filter((n) => !removed.has(n.id));
      d.groups.forEach((g) => {
        g.members = g.members.filter((id) => !removed.has(id));
      });
      const prune = (layout: Layout) => {
        layout.children = layout.children.filter(
          (l) => !l.node || !removed.has(l.node),
        );
        layout.children.forEach(prune);
      };
      prune(d.layout);
    }
    for (const link of [...d.connections].filter(
      (c) => c.kind === "command" && c.to.port === "set:angle",
    ))
      for (const peer of resolved.instances.filter(
        (i) => i.id !== link.to.node,
      ))
        d.connections.push({
          id: `${link.id}/restart/${peer.id}`,
          kind: "command",
          from: structuredClone(link.from),
          to: { node: peer.id, port: "RESTART" },
          arguments: {},
        });
    d.lesson = {
      title:
        resolved.instances.length > 1
          ? "Projectile Comparison"
          : "Projectile Lab",
      instruction: "Explore launch angle, speed and gravity.",
      explanation: resolved.assumptions.join("\n"),
    };
  } else throw new Error(`${resolved.demo}: not a spatial recipe`);
  d.compatibility = {
    source: structuredClone(recipe) as unknown as Record<string, unknown>,
    notices: [],
  };
  validateAuthoredDocument(d, true);
  return d;
}
