import { publicDefinition } from "../../components/catalog";
import {
  boardLayouts,
  type ComponentBoardItem,
  convertToBoard,
  extent,
} from "./board";
import type { AuthoredDocument } from "./types";
import { validateAuthoredDocument } from "./validate";

export type ArrangementRequest = {
  template: "scene-with-sidebar" | "comparison" | "vertical";
  main: string[];
  controls: string[];
  results: string[];
  narrowOrder: string[];
  preserveLocked: true;
};
/** Pure presentation metadata; model configuration and runtime state are never changed. */
export function arrangeDocument(
  document: AuthoredDocument,
  request: ArrangementRequest,
) {
  const next = structuredClone(document);
  // Ordinary grouping is an authoring choice. Generated layouts keep decisions independent.
  const flatten = (
    layout: AuthoredDocument["layout"],
  ): AuthoredDocument["layout"][] => {
    if (
      next.presentation?.mode === "board" &&
      next.presentation.items.some(
        (item) => item.layoutId === layout.id && item.locked,
      )
    )
      return [layout];
    if (
      !layout.node &&
      layout.children.length &&
      ["stack", "row", "grid", "panel", "split"].includes(layout.kind) &&
      !layout.visibleWhen &&
      !layout.disabledWhen &&
      !layout.theme &&
      !layout.font &&
      !layout.fontSize
    )
      return layout.children.flatMap(flatten);
    return [layout];
  };
  next.layout.children = next.layout.children.flatMap(flatten);
  next.presentation ??= convertToBoard(next);
  if (next.presentation.mode !== "board")
    next.presentation = convertToBoard(next);
  const board = next.presentation;
  // Reconcile removed wrappers before calculating role and scope placement.
  const presentLayouts = new Set(boardLayouts(next).map((l) => l.id));
  board.items = board.items.filter(
    (i) => !i.layoutId || presentLayouts.has(i.layoutId),
  );
  for (const layout of boardLayouts(next))
    if (!board.items.some((i) => i.layoutId === layout.id))
      board.items.push({
        id: `board/${layout.id}`,
        layoutId: layout.id,
        rect: { x: 0, y: 0, width: 320, height: 160 },
        zIndex: board.items.length,
        locked: false,
      });
  const layouts = boardLayouts(next);
  for (const id of [
    ...request.main,
    ...request.controls,
    ...request.results,
    ...request.narrowOrder,
  ])
    if (!layouts.some((l) => l.node === id || l.id === id))
      throw new Error(`${id}: unknown presentation target`);
  const nodeFor = (item: ComponentBoardItem) =>
    next.nodes.find(
      (n) => n.id === layouts.find((l) => l.id === item.layoutId)?.node,
    );
  const matches = (item: ComponentBoardItem, ids: string[]) =>
    ids.some((id) => id === item.layoutId || id === nodeFor(item)?.id);
  const category = (item: ComponentBoardItem) => {
    const node = nodeFor(item);
    return matches(item, request.main)
      ? "appearance"
      : matches(item, request.controls)
        ? "controls"
        : matches(item, request.results)
          ? "displays"
          : node
            ? publicDefinition(node.definition).category
            : "layout";
  };
  const scopes = [
    ...new Set(
      board.items
        .filter((i): i is ComponentBoardItem => !!i.layoutId)
        .map((i) => nodeFor(i)?.scope)
        .filter(Boolean),
    ),
  ];
  const rows: string[][] = [];
  const locked = board.items.filter((i) => i.locked).map((i) => i.rect);
  const baseY = locked.length
    ? Math.max(...locked.map((r) => r.y + r.height)) + 24
    : 0;
  let nextScopeY = baseY;
  for (const [index, scope] of scopes.entries()) {
    const items = board.items.filter(
      (i): i is ComponentBoardItem =>
        !!i.layoutId && nodeFor(i)?.scope === scope,
    );
    const scenes = items.filter((i) =>
      ["appearance", "canvases"].includes(category(i)),
    );
    const controls = items.filter((i) => category(i) === "controls");
    const results = items.filter(
      (i) => !scenes.includes(i) && !controls.includes(i),
    );
    const order = request.narrowOrder;
    const ranked = [...scenes, ...controls, ...results].sort((a, b) => {
      const rank = (i: ComponentBoardItem) => {
        const p = order.findIndex(
          (id) => id === i.layoutId || id === nodeFor(i)?.id,
        );
        return p < 0 ? 100 : p;
      };
      return rank(a) - rank(b);
    });
    rows.push(...ranked.map((i) => [i.id]));
    const comparison = request.template === "comparison";
    const x = comparison ? index * 576 : 0;
    const scopeY = comparison ? baseY : nextScopeY;
    let sceneY = scopeY;
    for (const item of scenes) {
      if (item.locked) continue;
      item.rect = {
        x,
        y: sceneY,
        width: comparison ? 552 : 620,
        height: nodeFor(item)?.definition.includes("arithmetic")
          ? 442
          : comparison &&
              nodeFor(item)?.definition === "appearance/area-perimeter"
            ? 160
            : 360,
      };
      item.responsiveMinHeight = nodeFor(item)?.definition.includes(
        "arithmetic",
      )
        ? 400
        : 280;
      sceneY += item.rect.height + 20;
    }
    let y = request.template === "vertical" || comparison ? sceneY : scopeY;
    const sidebarX =
      request.template === "vertical" || comparison ? x : x + 644;
    const width = comparison
      ? 266
      : request.template === "vertical"
        ? 620
        : 320;
    for (const [itemIndex, item] of (comparison
      ? [...controls, ...results]
      : [...results, ...controls]
    ).entries()) {
      if (item.locked) continue;
      const node = nodeFor(item);
      const height =
        node?.definition === "controls/ArithmeticActivity"
          ? 262
          : node?.definition === "displays/Inspector"
            ? 240
            : category(item) === "controls"
              ? comparison
                ? 144
                : 160
              : comparison
                ? 96
                : 164;
      item.rect = {
        x: sidebarX + (comparison ? (itemIndex % 2) * 286 : 0),
        y,
        width,
        height,
      };
      if (!comparison || itemIndex % 2 === 1) y += height + 16;
    }
    nextScopeY = Math.max(sceneY, y) + 24;
  }
  board.responsive = true;
  board.responsiveRows = rows;
  for (const item of board.items)
    if (!rows.flat().includes(item.id)) rows.push([item.id]);
  board.startView = extent(board.items.map((i) => i.rect));
  arrangeGraph(next);
  validateAuthoredDocument(next);
  return next;
}
export function arrangeGraph(document: AuthoredDocument) {
  const columns = new Map<string, number>();
  for (const node of [...document.nodes, ...document.resources]) {
    const def = publicDefinition(node.definition);
    const column =
      def.category === "controls"
        ? 0
        : def.category === "models"
          ? 1
          : def.category === "appearance" || def.category === "canvases"
            ? 2
            : 3;
    const key = `${node.scope}/${column}`;
    const row = columns.get(key) ?? 0;
    if (!document.editor.positions[node.id])
      document.editor.positions[node.id] = {
        x: column * 340,
        y:
          row * 220 +
          document.scopes.findIndex((s) => s.id === node.scope) * 680,
      };
    columns.set(key, row + 1);
  }
}
