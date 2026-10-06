import { isDrawingItem, validateDrawing } from "./drawings";
import type { AuthoredDocument, Layout } from "./types";
export type Rect = { x: number; y: number; width: number; height: number };
export type Camera = { centerX: number; centerY: number; zoom: number };
export type ComponentBoardItem = {
  kind?: "component";
  id: string;
  layoutId: string;
  rect: Rect;
  /** When set, author resizing preserves this presentation width/height ratio. */
  aspectRatio?: number;
  /** Minimum scene height when a learner board reflows on a narrow screen. */
  responsiveMinHeight?: number;
  zIndex: number;
  locked: boolean;
};
export type BoardItem = ComponentBoardItem | import("./drawings").DrawingItem;
export type BoardPresentation = {
  version: 1 | 2;
  /** Reflow independent lesson components on narrow learner screens. */
  responsive?: boolean;
  /** Explicit item ordering and paired rows for narrow learner viewports. */
  responsiveRows?: string[][];
  mode: "board";
  items: BoardItem[];
  /** Layout groups whose children have independent board placement. */
  separatedLayouts?: string[];
  groups: { id: string; label: string; members: string[] }[];
  learnerArea?: Rect;
  startView: Rect;
  navigation: { mode: "bounded" | "fixed"; minZoom: number; maxZoom: number };
  immersive: {
    startup: "board" | "scene";
    sceneItemId?: string;
    allowReturnToBoard: boolean;
    overlays: {
      id: string;
      sceneItemId: string;
      contentItemIds: string[];
      anchor: "left" | "right" | "bottom";
      collapsedByDefault: boolean;
    }[];
  };
};
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export function resizeBoardRect(
  rect: Rect,
  dx: number,
  dy: number,
  aspectRatio?: number,
  snap = 1,
  minimum = { width: 160, height: 160 },
): Rect {
  const round = (value: number) =>
    snap > 0 ? Math.round(value / snap) * snap : value;
  let width = clamp(round(rect.width + dx), minimum.width, 10000);
  let height = clamp(round(rect.height + dy), minimum.height, 10000);
  if (aspectRatio) {
    if (Math.abs(dx) >= Math.abs(dy * aspectRatio))
      height = width / aspectRatio;
    else width = height * aspectRatio;
    if (width < minimum.width) {
      width = minimum.width;
      height = width / aspectRatio;
    }
    if (height < minimum.height) {
      height = minimum.height;
      width = height * aspectRatio;
    }
    if (width > 10000) {
      width = 10000;
      height = width / aspectRatio;
    }
    if (height > 10000) {
      height = 10000;
      width = height * aspectRatio;
    }
  }
  return { ...rect, width, height };
}

/** Small content such as a text card should size to its message, not a canvas. */
export function boardItemMinimum(
  d: AuthoredDocument,
  layoutId: string | undefined,
): { width: number; height: number } {
  const layout = boardLayouts(d).find((candidate) => candidate.id === layoutId);
  const definition = d.nodes.find(
    (node) => node.id === layout?.node,
  )?.definition;
  if (definition === "controls/Button") return { width: 160, height: 48 };
  if (definition === "displays/Readout") return { width: 128, height: 96 };
  if (definition === "controls/Slider") return { width: 160, height: 128 };
  return definition === "displays/Text" || definition === "displays/Box"
    ? { width: 72, height: 48 }
    : { width: 160, height: 160 };
}
export function extent(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, width: 800, height: 600 };
  const x = Math.min(...rects.map((r) => r.x)) - 24,
    y = Math.min(...rects.map((r) => r.y)) - 24;
  return {
    x,
    y,
    width: Math.max(...rects.map((r) => r.x + r.width)) - x + 24,
    height: Math.max(...rects.map((r) => r.y + r.height)) - y + 24,
  };
}
export function fit(r: Rect, width: number, height: number): Camera {
  return {
    centerX: r.x + r.width / 2,
    centerY: r.y + r.height / 2,
    zoom: clamp(Math.min(width / r.width, height / r.height), 0.1, 4),
  };
}
export function constrain(
  c: Camera,
  r: Rect,
  width: number,
  height: number,
): Camera {
  const axis = (v: number, start: number, size: number, visible: number) =>
    visible >= size
      ? start + size / 2
      : clamp(v, start + visible / 2, start + size - visible / 2);
  return {
    ...c,
    centerX: axis(c.centerX, r.x, r.width, width / c.zoom),
    centerY: axis(c.centerY, r.y, r.height, height / c.zoom),
  };
}
export function zoomAt(c: Camera, zoom: number, x: number, y: number): Camera {
  return {
    zoom,
    centerX: c.centerX + x / c.zoom - x / zoom,
    centerY: c.centerY + y / c.zoom - y / zoom,
  };
}
export function boardLayouts(d: AuthoredDocument): Layout[] {
  const collect = (l: Layout): Layout[] => {
    if (l.node && !l.children.length) {
      const node = d.nodes.find((n) => n.id === l.node);
      if (
        node &&
        (/^(models|resources|behaviors)\//.test(node.definition) ||
          d.connections.some(
            (c) =>
              c.kind === "attachment" &&
              c.from.node === node.id &&
              c.to.port === "objects",
          ))
      )
        return [];
    }
    if (
      d.presentation?.mode === "board" &&
      d.presentation.separatedLayouts?.includes(l.id)
    )
      return l.children.flatMap(collect);
    const semantic =
      l.node ||
      l.label ||
      l.visibleWhen ||
      l.disabledWhen ||
      l.theme ||
      l.font ||
      l.fontSize ||
      ["tabs", "disclosure", "repeater", "panel"].includes(l.kind);
    return semantic || !l.children.length ? [l] : l.children.flatMap(collect);
  };
  return d.layout.children.length || d.layout.node ? collect(d.layout) : [];
}
/** Dynamic containers retain their semantics; plain presentation groups can be separated. */
export function canSeparateLayout(d: AuthoredDocument, l: Layout): boolean {
  const definition = d.nodes.find((node) => node.id === l.node)?.definition;
  const plainContainer =
    !l.node ||
    ["layout/Panel", "layout/Row", "layout/Column", "layout/Grid"].includes(
      definition ?? "",
    );
  return (
    l.children.length > 0 &&
    plainContainer &&
    ["panel", "row", "column", "grid"].includes(l.kind) &&
    !l.visibleWhen &&
    !l.disabledWhen &&
    !l.theme &&
    !l.font &&
    !l.fontSize
  );
}
export function separateBoardLayout(
  d: AuthoredDocument,
  layoutId: string,
): void {
  const p = d.presentation;
  if (p?.mode !== "board") return;
  const layout = boardLayouts(d).find((l) => l.id === layoutId);
  const item = p.items.find((i) => i.layoutId === layoutId);
  if (!layout || !item || !canSeparateLayout(d, layout) || item.locked) return;
  p.separatedLayouts = [...(p.separatedLayouts ?? []), layoutId];
  const children = boardLayouts(d).filter((l) => {
    const contains = (parent: Layout): boolean =>
      parent.children.some((child) => child.id === l.id || contains(child));
    return contains(layout);
  });
  const sizes = children.map((child) => layoutSize(d, child));
  const columnWidth = Math.max(320, ...sizes.map((size) => size.width)) + 24;
  const rowHeight = Math.max(160, ...sizes.map((size) => size.height)) + 24;
  const items = children.map((child, index) => ({
    id: `board/${child.id}`,
    layoutId: child.id,
    rect: {
      x: item.rect.x + (index % 2) * columnWidth,
      y: item.rect.y + Math.floor(index / 2) * rowHeight,
      ...layoutSize(d, child),
    },
    zIndex: item.zIndex + index,
    locked: false,
  }));
  p.items = p.items.filter((i) => i.id !== item.id).concat(items);
  reconcileResponsiveRows(p);
  p.groups = p.groups.map((g) => ({
    ...g,
    members: g.members.flatMap((id) =>
      id === item.id ? items.map((i) => i.id) : [id],
    ),
  }));
  p.immersive.overlays.forEach((o) => {
    o.contentItemIds = o.contentItemIds.flatMap((id) =>
      id === item.id ? items.map((i) => i.id) : [id],
    );
  });
  p.startView = extent(p.items.map((i) => i.rect));
}
function layoutSize(
  d: AuthoredDocument,
  l: Layout,
): { width: number; height: number } {
  const definition = d.nodes.find((n) => n.id === l.node)?.definition ?? "";
  if (
    l.children.length &&
    !l.node &&
    ["panel", "row", "column", "grid", "split", "stack"].includes(l.kind)
  ) {
    const children = l.children.map((child) => layoutSize(d, child));
    const horizontal = ["row", "split", "grid"].includes(l.kind);
    const gap = l.gap ?? 16;
    return {
      width: Math.min(
        2000,
        horizontal
          ? children.reduce((sum, size) => sum + size.width, 0) +
              gap * (children.length - 1)
          : Math.max(...children.map((size) => size.width)),
      ),
      height: Math.min(
        3000,
        (horizontal
          ? Math.max(...children.map((size) => size.height))
          : children.reduce((sum, size) => sum + size.height, 0) +
            gap * (children.length - 1)) + (l.label ? 48 : 24),
      ),
    };
  }
  return {
    width:
      definition === "displays/Text"
        ? 320
        : definition.startsWith("controls/")
          ? 320
          : definition.startsWith("canvases/")
            ? 640
            : 560,
    height:
      definition === "displays/Text"
        ? 120
        : definition.startsWith("canvases/")
          ? 480
          : definition === "controls/Slider" ||
              definition === "controls/NumberInput"
            ? 240
            : definition.startsWith("controls/")
              ? 160
              : definition.startsWith("displays/")
                ? 160
                : l.kind === "disclosure"
                  ? 160
                  : 440,
  };
}
export function convertToBoard(d: AuthoredDocument): BoardPresentation {
  const layouts = boardLayouts(d);
  const sizes = layouts.map((layout) => layoutSize(d, layout));
  const columnWidth = Math.max(320, ...sizes.map((size) => size.width)) + 24;
  const rowHeight = Math.max(200, ...sizes.map((size) => size.height)) + 24;
  const items = layouts.map((l, i) => ({
    id: `board/${l.id}`,
    layoutId: l.id,
    rect: {
      x: (i % 2) * columnWidth,
      y: Math.floor(i / 2) * rowHeight,
      ...sizes[i],
    },
    zIndex: i,
    locked: false,
  }));
  return {
    version: 1,
    mode: "board",
    items,
    groups: [],
    startView: extent(items.map((i) => i.rect)),
    navigation: { mode: "bounded", minZoom: 0.25, maxZoom: 2 },
    immersive: { startup: "board", allowReturnToBoard: true, overlays: [] },
  };
}
export function supportsScene(
  d: AuthoredDocument,
  layoutId: string | undefined,
): boolean {
  const l = boardLayouts(d).find((l) => l.id === layoutId);
  const n = d.nodes.find((n) => n.id === l?.node);
  return !!n && ["canvases/town", "canvases/World"].includes(n.definition);
}

export function worldToScreen(
  point: { x: number; y: number },
  camera: Camera,
  viewport: { width: number; height: number },
) {
  return {
    x: viewport.width / 2 + (point.x - camera.centerX) * camera.zoom,
    y: viewport.height / 2 + (point.y - camera.centerY) * camera.zoom,
  };
}
export function screenToWorld(
  point: { x: number; y: number },
  camera: Camera,
  viewport: { width: number; height: number },
) {
  return {
    x: camera.centerX + (point.x - viewport.width / 2) / camera.zoom,
    y: camera.centerY + (point.y - viewport.height / 2) / camera.zoom,
  };
}
export function supportsOverlay(
  d: AuthoredDocument,
  layoutId: string | undefined,
): boolean {
  const layout = boardLayouts(d).find((l) => l.id === layoutId);
  const supported = (l: Layout): boolean => {
    const node = d.nodes.find((n) => n.id === l.node);
    return (
      (!node || /^(controls|displays|layout)\//.test(node.definition)) &&
      l.children.every(supported)
    );
  };
  return !!layout && supported(layout);
}

export function reconcileBoard(d: AuthoredDocument) {
  const p = d.presentation;
  if (!p || p.mode !== "board") return;
  const allLayouts = new Map<string, Layout>();
  const collect = (l: Layout) => {
    allLayouts.set(l.id, l);
    l.children.forEach(collect);
  };
  collect(d.layout);
  if (p.separatedLayouts)
    p.separatedLayouts = p.separatedLayouts.filter((id) => {
      const layout = allLayouts.get(id);
      return !!layout && canSeparateLayout(d, layout);
    });
  const layouts = boardLayouts(d),
    valid = new Set(layouts.map((l) => l.id));
  p.items = p.items.filter((i) => isDrawingItem(i) || valid.has(i.layoutId));
  for (const l of layouts)
    if (!p.items.some((i) => i.layoutId === l.id)) {
      const right = Math.max(0, ...p.items.map((i) => i.rect.x + i.rect.width));
      p.items.push({
        id: `board/${l.id}`,
        layoutId: l.id,
        rect: { x: right + 24, y: 0, ...layoutSize(d, l) },
        zIndex: p.items.length,
        locked: false,
      });
    }
  const ids = new Set(p.items.map((i) => i.id));
  reconcileResponsiveRows(p);
  p.groups = p.groups
    .map((g) => ({ ...g, members: g.members.filter((id) => ids.has(id)) }))
    .filter((g) => g.members.length > 1);
  p.immersive.overlays = p.immersive.overlays
    .filter((o) => ids.has(o.sceneItemId))
    .map((o) => ({
      ...o,
      contentItemIds: o.contentItemIds.filter((id) => ids.has(id)),
    }));
  if (!ids.has(p.immersive.sceneItemId ?? "")) {
    delete p.immersive.sceneItemId;
    p.immersive.startup = "board";
  }
}
function reconcileResponsiveRows(p: BoardPresentation) {
  if (!p.responsiveRows) return;
  const ids = new Set(p.items.map((item) => item.id));
  p.responsiveRows = p.responsiveRows
    .map((row) => row.filter((id) => ids.has(id)))
    .filter((row) => row.length);
  const arranged = new Set(p.responsiveRows.flat());
  for (const item of p.items)
    if (!arranged.has(item.id)) p.responsiveRows.push([item.id]);
}
export function validateBoard(d: AuthoredDocument, runnable = false) {
  const p = d.presentation;
  if (!p) return;
  if (p.mode === "flow") return;
  const fail = (message: string): never => {
    throw new Error(`Board: ${message}`);
  };
  if (
    p.mode !== "board" ||
    ![1, 2].includes(p.version) ||
    !Array.isArray(p.items) ||
    !Array.isArray(p.groups)
  )
    fail("unsupported presentation");
  const rect = (r: Rect) => {
    if (
      !r ||
      ![r.x, r.y, r.width, r.height].every(
        (v) => Number.isFinite(v) && Math.abs(v) <= 1e6,
      ) ||
      r.width <= 0 ||
      r.height <= 0
    )
      fail("invalid rectangle");
  };
  if (p.separatedLayouts !== undefined) {
    const all = new Map<string, Layout>();
    const collect = (l: Layout) => {
      all.set(l.id, l);
      l.children.forEach(collect);
    };
    collect(d.layout);
    if (
      !Array.isArray(p.separatedLayouts) ||
      new Set(p.separatedLayouts).size !== p.separatedLayouts.length ||
      p.separatedLayouts.some((id) => {
        const layout = all.get(id);
        return !layout || !canSeparateLayout(d, layout);
      })
    )
      fail("invalid separated layout group");
  }
  if (p.responsiveRows !== undefined) {
    if (
      !Array.isArray(p.responsiveRows) ||
      p.responsiveRows.some(
        (row) =>
          !Array.isArray(row) ||
          row.length < 1 ||
          row.length > 2 ||
          row.some((id) => typeof id !== "string"),
      )
    )
      fail("invalid responsive rows");
    const arranged = p.responsiveRows.flat();
    if (
      new Set(arranged).size !== arranged.length ||
      arranged.length !== p.items.length ||
      arranged.some((id) => !p.items.some((item) => item.id === id))
    )
      fail("responsive rows must place every board item exactly once");
  }
  rect(p.startView);
  if (p.learnerArea) rect(p.learnerArea);
  const ids = new Set<string>(),
    hosts = new Set<string>(),
    layouts = new Set(boardLayouts(d).map((l) => l.id));
  for (const i of p.items) {
    const minimum = isDrawingItem(i)
      ? { width: 16, height: 16 }
      : boardItemMinimum(d, i.layoutId);
    if (
      !i.id ||
      (i.kind !== undefined &&
        !["component", "text", "box"].includes(i.kind)) ||
      ids.has(i.id) ||
      (!isDrawingItem(i) &&
        (hosts.has(i.layoutId) || !layouts.has(i.layoutId))) ||
      (isDrawingItem(i) && p.version !== 2) ||
      !Number.isFinite(i.zIndex) ||
      typeof i.locked !== "boolean"
    )
      fail("invalid or duplicate content host");
    ids.add(i.id);
    if (isDrawingItem(i)) validateDrawing(i);
    else hosts.add(i.layoutId);
    rect(i.rect);
    if (
      i.aspectRatio !== undefined &&
      (!Number.isFinite(i.aspectRatio) ||
        i.aspectRatio < 0.2 ||
        i.aspectRatio > 5)
    )
      fail("content aspect ratio must be between 1:5 and 5:1");
    if (
      "responsiveMinHeight" in i &&
      i.responsiveMinHeight !== undefined &&
      (!Number.isFinite(i.responsiveMinHeight) ||
        i.responsiveMinHeight < 44 ||
        i.responsiveMinHeight > 1000)
    )
      throw new Error(`${i.id}: invalid responsive minimum height`);
    if (
      i.rect.width < minimum.width ||
      i.rect.height < minimum.height ||
      i.rect.width > 10000 ||
      i.rect.height > 10000
    )
      fail("content size is outside its supported range");
  }
  if (hosts.size !== layouts.size) fail("every layout needs one host");
  const grouped = new Set<string>();
  for (const g of p.groups) {
    if (
      !g.id ||
      ids.has(g.id) ||
      typeof g.label !== "string" ||
      !Array.isArray(g.members)
    )
      fail("invalid group");
    ids.add(g.id);
    for (const id of g.members) {
      if (!p.items.some((i) => i.id === id) || grouped.has(id))
        fail("invalid group membership");
      grouped.add(id);
    }
  }
  if (
    runnable &&
    p.learnerArea &&
    p.items.some((i) => {
      const r = p.learnerArea as Rect;
      return (
        i.rect.x < r.x ||
        i.rect.y < r.y ||
        i.rect.x + i.rect.width > r.x + r.width ||
        i.rect.y + i.rect.height > r.y + r.height
      );
    })
  )
    fail(
      "content is outside the learner area. Use Set learner area from content before running or sharing.",
    );
  const n = p.navigation;
  if (
    !n ||
    !["bounded", "fixed"].includes(n.mode) ||
    !Number.isFinite(n.minZoom) ||
    !Number.isFinite(n.maxZoom) ||
    n.minZoom < 0.1 ||
    n.maxZoom > 4 ||
    n.maxZoom < n.minZoom
  )
    fail("invalid zoom limits");
  const im = p.immersive;
  if (
    !im ||
    !["board", "scene"].includes(im.startup) ||
    typeof im.allowReturnToBoard !== "boolean" ||
    !Array.isArray(im.overlays)
  )
    fail("invalid immersive settings");
  const scene = (id: string) =>
    p.items.some((i) => i.id === id && supportsScene(d, i.layoutId));
  if (
    (im.startup === "scene" || im.sceneItemId) &&
    !scene(im.sceneItemId ?? "")
  )
    fail("choose a supported 3D scene");
  const overlayIds = new Set<string>(),
    content = new Set<string>();
  for (const o of im.overlays) {
    if (
      !o.id ||
      overlayIds.has(o.id) ||
      !scene(o.sceneItemId) ||
      !["left", "right", "bottom"].includes(o.anchor) ||
      typeof o.collapsedByDefault !== "boolean" ||
      !Array.isArray(o.contentItemIds)
    )
      fail("invalid overlay");
    overlayIds.add(o.id);
    for (const id of o.contentItemIds) {
      const i = p.items.find((i) => i.id === id);
      if (
        !i ||
        content.has(`${o.sceneItemId}/${id}`) ||
        !supportsOverlay(d, i.layoutId)
      )
        fail("invalid overlay content");
      content.add(`${o.sceneItemId}/${id}`);
    }
  }
}

/** Reorder selected items while preserving their relative order and positive layers. */
export function reorderBoardItems(
  p: BoardPresentation,
  ids: string[],
  action: "front" | "back" | "forward" | "backward",
) {
  const selected = new Set(ids);
  let items = [...p.items].sort((a, b) => a.zIndex - b.zIndex);
  if (action === "front" || action === "back") {
    const moved = items.filter((i) => selected.has(i.id));
    const rest = items.filter((i) => !selected.has(i.id));
    items = action === "front" ? [...rest, ...moved] : [...moved, ...rest];
  } else if (action === "forward") {
    for (let j = items.length - 2; j >= 0; j--) {
      if (selected.has(items[j].id) && !selected.has(items[j + 1].id))
        [items[j], items[j + 1]] = [items[j + 1], items[j]];
    }
  } else {
    for (let j = 1; j < items.length; j++) {
      if (selected.has(items[j].id) && !selected.has(items[j - 1].id))
        [items[j], items[j - 1]] = [items[j - 1], items[j]];
    }
  }
  items.forEach((item, index) => {
    item.zIndex = index;
  });
}
