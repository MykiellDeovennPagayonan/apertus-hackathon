import { type BoardPresentation, boardLayouts, extent } from "./board";
import type { AuthoredDocument } from "../document";

/** Keep scene/control pairs together on desktop, and readable on phones. */
export function responsiveBoardRows(
  document: AuthoredDocument,
  source: BoardPresentation,
  width: number,
) {
  const rows = source.responsiveRows ?? source.items.map((item) => [item.id]);
  const layouts = boardLayouts(document);
  return rows.flatMap((row) =>
    width < 700 &&
    row.some((id) => {
      const item = source.items.find((item) => item.id === id);
      const layout = layouts.find(
        (layout) => item && "layoutId" in item && layout.id === item.layoutId,
      );
      const node = document.nodes.find((node) => node.id === layout?.node);
      return (
        node?.definition.startsWith("appearance/") ||
        node?.definition.startsWith("canvases/")
      );
    })
      ? row.map((id) => [id])
      : [row],
  );
}

/** Reflow growing forms in the learner view without changing authored positions. */
export function expandResponsiveContent(
  source: BoardPresentation,
  heights: Record<string, number>,
): BoardPresentation {
  const next = structuredClone(source);
  const positioned: typeof source.items = [];
  for (const item of [...source.items].sort((a, b) => a.rect.y - b.rect.y)) {
    const rect = { ...item.rect };
    if (!item.locked) {
      const row = source.items.filter(
        (peer) => !peer.locked && peer.rect.y === item.rect.y,
      );
      const natural = heights[item.id];
      if (Number.isFinite(natural))
        rect.height = Math.max(rect.height, natural);
      for (const previous of positioned) {
        const original = source.items.find((p) => p.id === previous.id);
        if (!original) continue;
        // Aligned cards share clearance from every column above their row.
        const overlapsX = row.some(
          (peer) =>
            original.rect.x < peer.rect.x + peer.rect.width &&
            original.rect.x + original.rect.width > peer.rect.x,
        );
        const gap = item.rect.y - original.rect.y - original.rect.height;
        if (overlapsX && gap >= 0)
          rect.y = Math.max(
            rect.y,
            previous.rect.y + previous.rect.height + gap,
          );
      }
    }
    positioned.push({ ...item, rect });
  }
  next.items = source.items.map(
    (item) => positioned.find((p) => p.id === item.id) ?? item,
  );
  if (source.learnerArea) {
    const before = extent(source.items.map((item) => item.rect));
    const after = extent(next.items.map((item) => item.rect));
    next.learnerArea = {
      ...source.learnerArea,
      width: source.learnerArea.width + Math.max(0, after.width - before.width),
      height:
        source.learnerArea.height + Math.max(0, after.height - before.height),
    };
  }
  return next;
}

/** Preserve authored outside margins when valid learner items reflow into rows. */
export function reflowLearnerArea(
  source: BoardPresentation,
  items: BoardPresentation["items"],
): BoardPresentation["learnerArea"] {
  const area = source.learnerArea;
  if (
    !area ||
    !source.items.length ||
    source.items.some(
      ({ rect: r }) =>
        r.x < area.x ||
        r.y < area.y ||
        r.x + r.width > area.x + area.width ||
        r.y + r.height > area.y + area.height,
    )
  )
    return area;
  const before = extent(source.items.map((item) => item.rect)),
    after = extent(items.map((item) => item.rect));
  const left = before.x - area.x,
    top = before.y - area.y,
    right = area.x + area.width - before.x - before.width,
    bottom = area.y + area.height - before.y - before.height;
  return {
    x: after.x - left,
    y: after.y - top,
    width: after.width + left + right,
    height: after.height + top + bottom,
  };
}
