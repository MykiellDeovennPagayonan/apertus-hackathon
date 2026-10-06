import { boardLayouts, convertToBoard, extent } from "../../authoring/board";
import { type AuthoredDocument, emptyLayout } from "../../authoring/types";

/** Scenes, measurements and actions remain individual editable board items. */
export function arrangeFocusedExperiment(
  document: AuthoredDocument,
  kind: "projectile" | "counting",
) {
  if (kind === "projectile") consolidateProjectileComparison(document);
  document.presentation = convertToBoard(document);
  document.presentation.responsive = true;
  const layouts = boardLayouts(document);
  document.presentation.items.forEach((item) => {
    const layout = layouts.find((layout) => layout.id === item.layoutId);
    const node = document.nodes.find((node) => node.id === layout?.node);
    if (node?.definition.startsWith("appearance/"))
      item.rect = {
        x: 0,
        y: 0,
        width: kind === "projectile" ? 620 : 680,
        height: kind === "counting" ? 440 : 360,
      };
    else if (node?.id.endsWith("display/count"))
      item.rect = { x: 712, y: 90, width: 320, height: 160 };
    else if (node?.id.includes("projectile/primary/display/range"))
      item.rect = { x: 644, y: 0, width: 304, height: 96 };
    else if (node?.id.includes("projectile/primary/display/maxHeight"))
      item.rect = { x: 644, y: 104, width: 304, height: 96 };
    else if (node?.id.includes("projectile/primary/control/set:angle"))
      item.rect = { x: 644, y: 216, width: 304, height: 128 };
    else if (node?.id.includes("projectile/secondary/display/range"))
      item.rect = { x: 964, y: 0, width: 304, height: 96 };
    else if (node?.id.includes("projectile/secondary/display/maxHeight"))
      item.rect = { x: 964, y: 104, width: 304, height: 96 };
    else if (node?.id.includes("projectile/secondary/control/set:angle"))
      item.rect = { x: 964, y: 216, width: 304, height: 128 };
    else
      item.rect = {
        x: kind === "counting" ? 712 : 240,
        y: kind === "counting" ? 274 : 416,
        width: 320,
        height: 64,
      };
  });
  document.presentation.startView = extent(
    document.presentation.items.map((item) => item.rect),
  );
}

/** Two projectiles share one scene while their inputs and results remain editable. */
function consolidateProjectileComparison(document: AuthoredDocument) {
  const appearances = document.nodes.filter(
    (node) => node.definition === "appearance/Projectile",
  );
  const scene = appearances[0];
  if (!scene) return;
  const removed = new Set<string>();
  for (const extra of appearances.slice(1)) {
    const modelLinks = document.connections.filter(
      (link) =>
        link.kind === "attachment" &&
        link.to.node === extra.id &&
        link.to.port === "model",
    );
    for (const link of modelLinks) {
      link.to.node = scene.id;
      link.id = `${link.id}/shared-scene`;
    }
    removed.add(extra.id);
    for (const link of document.connections)
      if (
        link.kind === "attachment" &&
        link.to.node === extra.id &&
        link.to.port === "visuals"
      )
        removed.add(link.from.node);
  }
  document.nodes = document.nodes.filter((node) => !removed.has(node.id));
  document.connections = document.connections.filter(
    (link) => !removed.has(link.from.node) && !removed.has(link.to.node),
  );
  for (const group of document.groups) {
    group.members = group.members.filter((id) => !removed.has(id));
    group.parameters = group.parameters.filter((parameter) =>
      group.members.includes(parameter.node),
    );
    if (group.exposedPorts)
      group.exposedPorts = group.exposedPorts.filter((port) =>
        group.members.includes(port.endpoint.node),
      );
  }

  const find = (fragment: string) =>
    document.nodes.find((node) => node.id.includes(fragment))?.id;
  const visible = [
    scene.id,
    find("projectile/primary/display/range"),
    find("projectile/primary/display/maxHeight"),
    find("projectile/primary/control/set:angle"),
    find("projectile/secondary/display/range"),
    find("projectile/secondary/display/maxHeight"),
    find("projectile/secondary/control/set:angle"),
  ].filter((id): id is string => Boolean(id));
  document.layout.kind = "stack";
  document.layout.children = visible.map((node) => ({
    ...emptyLayout(`layout/${node}`),
    node,
  }));

  for (const node of document.nodes) {
    const ball = node.id.includes("projectile/secondary") ? "Ball 2" : "Ball 1";
    if (node.id.endsWith("display/range")) {
      node.configuration.label = `${ball} distance`;
      node.label = `${ball} distance`;
    }
    if (node.id.endsWith("display/maxHeight")) {
      node.configuration.label = `${ball} height`;
      node.label = `${ball} height`;
    }
    if (node.id.endsWith("control/set:angle")) {
      node.configuration.label = `${ball} angle`;
      node.label = `${ball} angle`;
    }
  }
  document.lesson = {
    title: "Projectile motion",
    instruction:
      "Change either launch angle. Compare how far and how high the balls travel.",
    explanation:
      "Both balls use the same speed and gravity. They launch and land at the same height; air resistance is ignored.",
  };
}
