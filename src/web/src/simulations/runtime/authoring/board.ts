import type { AuthoredDocument, Layout } from "./types";
export type Rect = { x: number; y: number; width: number; height: number };
export type Camera = { centerX: number; centerY: number; zoom: number };
export type BoardItem = {
  id: string;
  layoutId: string;
  rect: Rect;
  zIndex: number;
  locked: boolean;
};
export type BoardPresentation = {
  version: 1;
  mode: "board";
  items: BoardItem[];
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
function layoutSize(d: AuthoredDocument, l: Layout) {
  const definition = d.nodes.find((n) => n.id === l.node)?.definition ?? "";
  return {
    width: definition.startsWith("controls/") ? 320 : 560,
    height: definition.startsWith("canvases/")
      ? 560
      : definition.startsWith("controls/")
        ? 200
        : 440,
  };
}
export function convertToBoard(d: AuthoredDocument): BoardPresentation {
  const items = boardLayouts(d).map((l, i) => ({
    id: `board/${l.id}`,
    layoutId: l.id,
    rect: {
      x: (i % 2) * 584,
      y: Math.floor(i / 2) * 584,
      ...layoutSize(d, l),
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
export function supportsScene(d: AuthoredDocument, layoutId: string): boolean {
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
  layoutId: string,
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
  const layouts = boardLayouts(d),
    valid = new Set(layouts.map((l) => l.id));
  p.items = p.items.filter((i) => valid.has(i.layoutId));
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
export function validateBoard(d: AuthoredDocument, runnable = false) {
  const p = d.presentation;
  if (!p) return;
  if (p.mode === "flow") return;
  const fail = (message: string): never => {
    throw new Error(`Board: ${message}`);
  };
  if (
    p.mode !== "board" ||
    p.version !== 1 ||
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
  rect(p.startView);
  if (p.learnerArea) rect(p.learnerArea);
  const ids = new Set<string>(),
    hosts = new Set<string>(),
    layouts = new Set(boardLayouts(d).map((l) => l.id));
  for (const i of p.items) {
    if (
      !i.id ||
      ids.has(i.id) ||
      hosts.has(i.layoutId) ||
      !layouts.has(i.layoutId) ||
      !Number.isFinite(i.zIndex) ||
      typeof i.locked !== "boolean"
    )
      fail("invalid or duplicate content host");
    ids.add(i.id);
    hosts.add(i.layoutId);
    rect(i.rect);
    if (
      i.rect.width < 160 ||
      i.rect.height < 160 ||
      i.rect.width > 10000 ||
      i.rect.height > 10000
    )
      fail("content size must be between 160 and 10000 board units");
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
