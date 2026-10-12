import { publicDefinition } from "../../simulations/components/catalog";
import { isPlaybackCommand } from "../../simulations/components/controls/interactionPolicy";
import {
  boardItemMinimum,
  convertToBoard,
  extent,
} from "../../simulations/runtime/authoring/board";
import { removeNodes } from "../../simulations/runtime/authoring/recipes";
import {
  type AuthoredDocument,
  emptyLayout,
  type Layout,
} from "../../simulations/runtime/authoring/types";
/** Lay out the selected investigation without making another semantic selection. */
export function learnerPresentation(source: AuthoredDocument) {
  let document = structuredClone(source);

  // Compatible object canvases share axes; model IDs and independent controls remain distinct.
  const canvases = document.nodes.filter(
    (node) =>
      publicDefinition(node).category === "canvases" &&
      publicDefinition(node).inputs.objects?.cardinality === "many",
  );
  const removedCanvases: string[] = [];
  for (const canvas of canvases) {
    const primary = canvases.find(
      (peer) => peer.definition === canvas.definition,
    );
    if (!primary || primary === canvas) continue;
    const oldScope = canvas.scope;
    for (const node of document.nodes)
      if (node.scope === oldScope) node.scope = primary.scope;
    for (const wire of document.connections)
      if (wire.to.node === canvas.id && wire.to.port === "objects")
        wire.to.node = primary.id;
    removedCanvases.push(canvas.id);
  }
  document = removeNodes(document, removedCanvases);
  for (const canvas of canvases.filter(
    (canvas) => !removedCanvases.includes(canvas.id),
  )) {
    const objects = document.connections.filter(
      (wire) => wire.to.node === canvas.id && wire.to.port === "objects",
    );
    if (objects.length < 2) continue;
    objects.forEach((wire, index) => {
      const object = document.nodes.find((node) => node.id === wire.from.node)!;
      const schema = publicDefinition(object).configuration;
      object.label = `${publicDefinition(object).title} ${index + 1}`;
      if (schema.type === "object") {
        if (schema.properties.label) object.configuration.label = object.label;
        if (schema.properties.color)
          object.configuration.color = ["#4367b2", "#b76532", "#285e56"][
            index % 3
          ];
        if (schema.properties.dashed) object.configuration.dashed = index === 1;
      }
    });
  }

  const leaves = (layout: Layout): Layout[] => {
    if (
      layout.node ||
      layout.visibleWhen ||
      layout.disabledWhen ||
      layout.theme ||
      ["tabs", "repeater"].includes(layout.kind)
    )
      return [layout];
    return layout.children.flatMap(leaves);
  };
  const content = document.layout.children
    .flatMap(leaves)
    .filter((layout) => !!layout.node || layout.children.length > 0);
  document.layout = { ...emptyLayout("layout/learner"), children: content };
  for (const layout of content) if (layout.node) layout.label = "";
  document.presentation = convertToBoard(document);
  const presentation = document.presentation;
  presentation.responsive = true;
  presentation.responsiveGap = 24;
  presentation.responsiveRows = [];
  let top = 0;
  for (const scene of content.filter((layout) => {
    const node = document.nodes.find((node) => node.id === layout.node);
    return (
      node &&
      ["appearance", "canvases"].includes(publicDefinition(node).category)
    );
  })) {
    const sceneNode = document.nodes.find((node) => node.id === scene.node)!;
    const sceneItem = presentation.items.find(
      (item) => item.layoutId === scene.id,
    )!;
    const modelIds = new Set(
      document.connections
        .filter(
          (wire) => wire.to.node === sceneNode.id && wire.kind === "attachment",
        )
        .map((wire) => wire.from.node),
    );
    const companions = content
      .filter((layout) => {
        const node = document.nodes.find((node) => node.id === layout.node);
        return (
          node &&
          ["controls", "displays"].includes(publicDefinition(node).category) &&
          document.connections.some(
            (wire) =>
              (modelIds.has(wire.to.node) && wire.from.node === node.id) ||
              (modelIds.has(wire.from.node) && wire.to.node === node.id),
          )
        );
      })
      .map(
        (layout) =>
          presentation.items.find((item) => item.layoutId === layout.id)!,
      );
    const moving = [...modelIds].some(
      (id) =>
        publicDefinition(document.nodes.find((node) => node.id === id)!)
          .lifecycle.clock,
    );
    sceneItem.rect = { x: 0, y: top, width: 640, height: moving ? 430 : 480 };
    if (sceneItem.layoutId !== undefined)
      sceneItem.responsiveMinHeight = moving ? 300 : 320;
    let side = top;
    if (moving)
      companions.sort((a, b) => {
        const priority = (item: typeof a) => {
          const node = document.nodes.find(
            (node) =>
              node.id ===
              content.find((layout) => layout.id === item.layoutId)?.node,
          )!;
          const command = document.connections.find(
            (wire) => wire.from.node === node.id && wire.kind === "command",
          )?.to.port;
          return command && !isPlaybackCommand(command) ? 0 : 1;
        };
        return priority(a) - priority(b);
      });
    for (const item of companions) {
      const layout = content.find((layout) => layout.id === item.layoutId)!;
      const node = document.nodes.find((node) => node.id === layout.node)!;
      const command = document.connections.find(
        (wire) => wire.from.node === node.id && wire.kind === "command",
      )?.to.port;
      const height = Math.max(
        boardItemMinimum(document, item.layoutId).height,
        command && isPlaybackCommand(command)
          ? 64
          : node.definition.startsWith("displays/")
            ? 100
            : 144,
      );
      item.rect = {
        x: 664,
        y: side,
        width: 320,
        height,
      };
      if (item.layoutId !== undefined) item.responsiveMinHeight = height;
      side += height + 16;
    }
    presentation.responsiveRows.push([sceneItem.id]);
    for (const item of companions) presentation.responsiveRows.push([item.id]);
    top =
      Math.max(
        sceneItem.rect.y + sceneItem.rect.height,
        ...companions.map((item) => item.rect.y + item.rect.height),
      ) + 32;
  }
  const placed = new Set(presentation.responsiveRows.flat());
  for (const item of presentation.items.filter(
    (item) => !placed.has(item.id),
  )) {
    const height = Math.max(
      100,
      boardItemMinimum(document, item.layoutId).height,
    );
    item.rect = { x: 0, y: top, width: 640, height };
    if (item.layoutId !== undefined) item.responsiveMinHeight = height;
    presentation.responsiveRows.push([item.id]);
    top += height + 16;
  }
  presentation.startView = extent(presentation.items.map((item) => item.rect));
  return document;
}
