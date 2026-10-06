import { boardLayouts } from "./board";
import { createDrawing } from "./drawings";
import type { AuthoredDocument, Layout } from "./types";

/** Only independent static leaves can become drawings; nested/dynamic text keeps its semantics. */
export function migrateBoardDrawings(
  source: AuthoredDocument,
): AuthoredDocument {
  const d = structuredClone(source);
  const p = d.presentation;
  if (p?.mode !== "board") return d;
  const layouts = boardLayouts(d);
  const removed = new Set<string>();
  const removedLayouts = new Set<string>();
  p.items = p.items.map((item) => {
    const l = layouts.find((layout) => layout.id === item.layoutId);
    const n = d.nodes.find((node) => node.id === l?.node);
    if (
      !l ||
      !n ||
      !["displays/Text", "displays/Box"].includes(n.definition) ||
      l.children.length ||
      l.visibleWhen ||
      l.disabledWhen ||
      l.theme ||
      l.font ||
      l.fontSize ||
      l.label ||
      !d.layout.children.some((child) => child.id === l.id) ||
      d.connections.some(
        (c) =>
          c.from.node === n.id ||
          c.to.node === n.id ||
          Object.values(c.argumentBindings ?? {}).some(
            (b) => b.from.node === n.id,
          ),
      ) ||
      d.groups.some((g) => g.members.includes(n.id)) ||
      p.immersive.overlays.some((overlay) =>
        overlay.contentItemIds.includes(item.id),
      ) ||
      /\{\{/.test(String(n.configuration.text ?? ""))
    )
      return item;
    const config = n.configuration;
    const drawing = createDrawing(
      n.definition === "displays/Text" ? "text" : "box",
      item.rect,
      item.zIndex,
    );
    drawing.id = item.id;
    drawing.locked = item.locked;
    drawing.text = String(config.text ?? "");
    drawing.fontSize = config.variant === "heading" ? 24 : 16;
    const color = (value: unknown, fallback: string) =>
      typeof value === "string" &&
      /^(transparent|#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8}))$/i.test(
        value,
      )
        ? value
        : fallback;
    drawing.style = {
      ...drawing.style,
      stroke: config.border
        ? color(config.borderColor, "#d5cdbb")
        : "transparent",
      strokeWidth: Number(config.borderWidth ?? 1),
      radius: Number(config.borderRadius ?? 0),
      fill: color(config.backgroundColor, "transparent"),
      opacity: Number(config.opacity ?? 1),
    };
    p.version = 2;
    removed.add(n.id);
    removedLayouts.add(l.id);
    return drawing;
  });
  d.nodes = d.nodes.filter((n) => !removed.has(n.id));
  const prune = (l: Layout) => {
    l.children = l.children.filter((child) => !removedLayouts.has(child.id));
    l.children.forEach(prune);
  };
  prune(d.layout);
  for (const id of removed) delete d.editor.positions[id];
  return d;
}
