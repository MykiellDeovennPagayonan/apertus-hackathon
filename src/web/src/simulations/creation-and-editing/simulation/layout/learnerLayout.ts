import { publicDefinition } from "../../../registry/index";
import { arrangeDocument } from "../../authoring-engine/presentation/arrangement";
import { removeNodes } from "../../authoring-engine/recipes";
import {
  type AuthoredDocument,
  emptyLayout,
  type Layout,
} from "../../authoring-engine/document";
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

  if (
    document.presentation?.mode === "board" &&
    document.presentation.responsive &&
    !removedCanvases.length
  )
    return document;

  const leaves = (layout: Layout): Layout[] => {
    if (
      layout.node ||
      layout.visibleWhen ||
      layout.disabledWhen ||
      layout.theme ||
      ["tabs", "disclosure", "repeater"].includes(layout.kind)
    )
      return [layout];
    return layout.children.flatMap(leaves);
  };
  const content = document.layout.children
    .flatMap(leaves)
    .filter((layout) => !!layout.node || layout.children.length > 0);
  document.layout = { ...emptyLayout("layout/learner"), children: content };
  for (const layout of content) if (layout.node) layout.label = "";
  return arrangeDocument(document, {
    template: "automatic",
    main: [],
    controls: [],
    results: [],
    narrowOrder: [],
    preserveLocked: true,
  });
}
