import type { BoardItem, BoardPresentation, Rect } from "./presentation/board";

export type DrawingStyle = {
  stroke: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed";
  fill: string;
  radius: number;
  opacity: number;
};
export type DrawingItem = {
  id: string;
  layoutId?: never;
  kind: "text" | "box";
  rect: Rect;
  zIndex: number;
  locked: boolean;
  aspectRatio?: never;
  style: DrawingStyle;
  text: string;
  fontFamily: "system" | "serif" | "mono";
  fontSize: number;
  align: "left" | "center" | "right";
  sizing: "auto" | "wrap";
  color: string;
};
export const isDrawingItem = (item: BoardItem): item is DrawingItem =>
  item.kind === "text" || item.kind === "box";
export function createDrawing(
  kind: DrawingItem["kind"],
  rect: Rect,
  zIndex: number,
): DrawingItem {
  return {
    id: `drawing/${crypto.randomUUID()}`,
    kind,
    rect,
    zIndex,
    locked: false,
    style: {
      stroke: kind === "box" ? "#30362e" : "transparent",
      strokeWidth: 1,
      strokeStyle: "solid",
      fill: "transparent",
      radius: 0,
      opacity: 1,
    },
    text: "",
    fontFamily: "system",
    fontSize: 24,
    align: "left",
    sizing: kind === "text" ? "auto" : "wrap",
    color: "#30362e",
  };
}
export function validateDrawing(item: DrawingItem) {
  const fail = () => {
    throw new Error("Board: invalid drawing element");
  };
  const color = (value: unknown) =>
    typeof value === "string" &&
    /^(transparent|#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8}))$/i.test(
      value,
    );
  const number = (value: unknown, min: number, max: number) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max;
  if (
    item.layoutId !== undefined ||
    item.aspectRatio !== undefined ||
    !item.style ||
    !color(item.style.stroke) ||
    !color(item.style.fill) ||
    !color(item.color) ||
    !number(item.style.strokeWidth, 0, 20) ||
    !number(item.style.radius, 0, 200) ||
    !number(item.style.opacity, 0, 1) ||
    !["solid", "dashed"].includes(item.style.strokeStyle) ||
    typeof item.text !== "string" ||
    item.text.length > 10000 ||
    !["system", "serif", "mono"].includes(item.fontFamily) ||
    !number(item.fontSize, 8, 160) ||
    !["left", "center", "right"].includes(item.align) ||
    !["auto", "wrap"].includes(item.sizing)
  )
    fail();
}
export function resizeDrawing(
  rect: Rect,
  dx: number,
  dy: number,
  edge: string,
  square = false,
): Rect {
  let left = rect.x,
    top = rect.y,
    right = rect.x + rect.width,
    bottom = rect.y + rect.height;
  if (edge.includes("w")) left = Math.min(right - 16, left + dx);
  if (edge.includes("e")) right = Math.max(left + 16, right + dx);
  if (edge.includes("n")) top = Math.min(bottom - 16, top + dy);
  if (edge.includes("s")) bottom = Math.max(top + 16, bottom + dy);
  if (square) {
    const side = Math.max(right - left, bottom - top);
    if (edge.includes("w")) left = right - side;
    else right = left + side;
    if (edge.includes("n")) top = bottom - side;
    else bottom = top + side;
  }
  return {
    x: Math.max(-999000, Math.min(999000, left)),
    y: Math.max(-999000, Math.min(999000, top)),
    width: Math.min(10000, right - left),
    height: Math.min(10000, bottom - top),
  };
}
export function removeBoardDrawings(p: BoardPresentation, ids: string[]) {
  p.items = p.items.filter((item) => !ids.includes(item.id));
  const valid = new Set(p.items.map((item) => item.id));
  p.groups = p.groups
    .map((group) => ({
      ...group,
      members: group.members.filter((id) => valid.has(id)),
    }))
    .filter((group) => group.members.length > 1);
  p.immersive.overlays.forEach((overlay) => {
    overlay.contentItemIds = overlay.contentItemIds.filter((id) =>
      valid.has(id),
    );
  });
}
