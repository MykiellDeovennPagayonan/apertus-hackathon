import { type BoardPresentation, extent } from "./board";

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
      const natural = heights[item.id];
      if (Number.isFinite(natural))
        rect.height = Math.max(rect.height, natural);
      for (const previous of positioned) {
        const original = source.items.find((p) => p.id === previous.id);
        if (!original) continue;
        const overlapsX =
          original.rect.x < item.rect.x + item.rect.width &&
          original.rect.x + original.rect.width > item.rect.x;
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
