import type { Assembly } from "../../../registry/contracts/domainContribution";
import { publicDefinition } from "../../../registry/index";
import { modelRecipe } from "../../../registry/recipes/modelRecipe";
import { validateAuthoredDocument } from "../../validator/document";
import { type AuthoredDocument, emptyAuthoredDocument } from "../document";
import { insertRecipe } from "../recipes";
import { requireValue } from "../requireValue";
export function assemblyDocument(assembly: Assembly): AuthoredDocument {
  const d = emptyAuthoredDocument(),
    scope = "scope/assembly";
  d.scopes.push({ id: scope, label: assembly.title });
  for (const instance of assembly.instances) {
    const recipe = modelRecipe(instance.prefab.ref);
    const rename = new Map(
      assembly.observations
        .filter((o) => o.instance === instance.id)
        .map((o) => [`display/${o.output}`, o.id]),
    );
    const content = insertRecipe(
      emptyAuthoredDocument(),
      recipe,
      () => {
        throw new Error("Generated model recipes must be fully expanded");
      },
      (id) =>
        id === "model"
          ? instance.id
          : rename.has(id)
            ? requireValue(rename.get(id))
            : `${instance.id}/${id}`,
      instance.parameters,
    );
    requireValue(content.nodes.find((n) => n.id === instance.id)).label =
      instance.label;
    for (const node of [...content.nodes, ...content.resources])
      node.scope = scope;
    d.nodes.push(...content.nodes);
    d.resources.push(...content.resources);
    d.connections.push(...content.connections);
    d.groups.push(...content.groups);
    d.layout.children.push(...content.layout.children);
  }
  const physicalShared = new Set([
    "PEND_SET_GRAVITY",
    "PEND_SET_AMPLITUDE",
    "ROLL_SET_HEIGHT",
    "ROLL_SET_GRAVITY",
    "PHYS_PLAY",
    "PHYS_RESTART",
    "PHYS_STEP",
  ]);
  for (const action of physicalShared) {
    const links = d.connections.filter((connection) => {
      if (connection.kind !== "command" || connection.to.port !== action)
        return false;
      const target = d.nodes.find((node) => node.id === connection.to.node);
      return target?.definition.startsWith("prefabs/physical-systems/");
    });
    for (const provider of new Set(
      links.map(
        (link) =>
          requireValue(d.nodes.find((node) => node.id === link.to.node))
            .definition,
      ),
    )) {
      const group = links.filter(
        (link) =>
          requireValue(d.nodes.find((node) => node.id === link.to.node))
            .definition === provider,
      );
      if (group.length < 2) continue;
      const control = group[0].from.node,
        duplicates = new Set(group.slice(1).map((link) => link.from.node));
      for (const link of group) link.from.node = control;
      d.nodes = d.nodes.filter((node) => !duplicates.has(node.id));
      for (const recipeGroup of d.groups)
        recipeGroup.members = recipeGroup.members.filter(
          (member) => !duplicates.has(member),
        );
      const prune = (layout: import("../document").Layout) => {
        layout.children = layout.children.filter(
          (child) => !child.node || !duplicates.has(child.node),
        );
        layout.children.forEach(prune);
      };
      prune(d.layout);
    }
  }
  for (const link of [...d.connections]) {
    if (
      link.kind !== "command" ||
      !/^(PEND_SET_|ROLL_SET_|ROLL_SCALE_RESISTANCE)/.test(link.to.port) ||
      physicalShared.has(link.to.port)
    )
      continue;
    const target = requireValue(
      d.nodes.find((node) => node.id === link.to.node),
    );
    for (const peer of d.nodes.filter(
      (node) =>
        node.id !== target.id &&
        node.definition === target.definition &&
        publicDefinition(node).commands.PHYS_RESTART,
    ))
      d.connections.push({
        id: `${link.id}/restart/${peer.id}`,
        kind: "command",
        from: structuredClone(link.from),
        to: { node: peer.id, port: "PHYS_RESTART" },
        arguments: {},
      });
  }
  d.lesson = {
    title: assembly.title,
    instruction: assembly.learningGoal.slice(0, 150),
    explanation: assembly.learningGoal,
  };
  validateAuthoredDocument(d);
  return d;
}
