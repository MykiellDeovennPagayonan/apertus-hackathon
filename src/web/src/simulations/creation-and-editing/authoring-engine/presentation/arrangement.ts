import { publicDefinition } from "../../../registry/index";
import { isPlaybackCommand } from "../../../registry/contracts/interactionPolicy";
import {
  boardItemMinimum,
  boardLayouts,
  type ComponentBoardItem,
  convertToBoard,
  extent,
} from "./board";
import type { AuthoredDocument } from "../document";
import { validateAuthoredDocument } from "../../validator/document";

export const arrangementTemplates = [
  "automatic",
  "scene-with-sidebar",
  "scene-with-footer",
  "scene-with-results",
  "scene-with-split-controls",
  "comparison",
  "vertical",
] as const;
export type ArrangementRequest = {
  template: (typeof arrangementTemplates)[number];
  main: string[];
  controls: string[];
  results: string[];
  beside?: string[];
  below?: string[];
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
    ...(request.beside ?? []),
    ...(request.below ?? []),
    ...request.narrowOrder,
  ])
    if (!layouts.some((l) => l.node === id || l.id === id))
      throw new Error(`${id}: unknown presentation target`);
  const nodeFor = (item: ComponentBoardItem) =>
    next.nodes.find(
      (n) => n.id === layouts.find((l) => l.id === item.layoutId)?.node,
    );
  const firstNode = (layout: AuthoredDocument["layout"]): string | undefined =>
    layout.node ?? layout.children.map(firstNode).find(Boolean);
  const categoriesFor = (layout: AuthoredDocument["layout"]): string[] =>
    layout.node ? [publicDefinition(next.nodes.find(node => node.id === layout.node)!).category]
      : layout.children.flatMap(categoriesFor);
  const scopeFor = (item: ComponentBoardItem) => {
    const layout = layouts.find(layout => layout.id === item.layoutId);
    return layout ? next.nodes.find(node => node.id === firstNode(layout))?.scope : undefined;
  };
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
            ? publicDefinition(node).category
            : categoriesFor(layouts.find(layout => layout.id === item.layoutId)!).length > 0 &&
                categoriesFor(layouts.find(layout => layout.id === item.layoutId)!).every(category => category === "controls")
              ? "controls" : "layout";
  };
  for (const item of board.items.filter(
    (item): item is ComponentBoardItem => !!item.layoutId,
  )) {
    if (
      matches(item, request.beside ?? []) &&
      matches(item, request.below ?? [])
    )
      throw new Error(`${item.id}: choose beside or below, not both`);
    if (
      category(item) === "appearance" &&
      matches(item, [...(request.beside ?? []), ...(request.below ?? [])])
    )
      throw new Error(
        `${item.id}: the main scene cannot also be companion content`,
      );
  }
  // Data-connected models share presentation space while runtime scopes stay
  // isolated. Independent comparison models remain separate columns/sections.
  const clusters = new Map(next.scopes.map((scope) => [scope.id, scope.id]));
  const cluster = (scope: string): string => {
    const parent = clusters.get(scope) ?? scope;
    return parent === scope ? scope : cluster(parent);
  };
  for (const connection of next.connections) {
    if (connection.kind !== "value") continue;
    const source = next.nodes.find((node) => node.id === connection.from.node);
    const target = next.nodes.find((node) => node.id === connection.to.node);
    if (
      source &&
      target &&
      publicDefinition(source).category === "models" &&
      publicDefinition(target).category === "models"
    )
      clusters.set(cluster(source.scope), cluster(target.scope));
  }
  const scopes = [
    ...new Set(
      board.items
        .filter((i): i is ComponentBoardItem => !!i.layoutId)
        .flatMap((i) => {
          const scope = scopeFor(i);
          return scope ? [cluster(scope)] : [];
        }),
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
        !!i.layoutId && cluster(scopeFor(i) ?? "") === scope,
    );
    const scenes = items.filter((i) =>
      ["appearance", "canvases"].includes(category(i)),
    );
    const controls = items.filter((i) => category(i) === "controls");
    const results = items.filter(
      (i) => !scenes.includes(i) && !controls.includes(i),
    );
    const sceneNode = scenes.length === 1 ? nodeFor(scenes[0]) : undefined;
    if (
      [
        "automatic",
        "scene-with-footer",
        "scene-with-results",
        "scene-with-split-controls",
      ].includes(request.template) ||
      request.beside !== undefined ||
      request.below !== undefined
    ) {
      const wide =
        sceneNode &&
        publicDefinition(sceneNode).learnerLayout === "scene-first";
      const comparison = scopes.length > 1;
      const x = comparison ? index * 576 : 0;
      const y = comparison ? baseY : nextScopeY;
      const width = comparison ? 552 : 980;
      const compactResults = results.every((item) =>
        ["displays/Readout", "displays/StatusMessage"].includes(
          nodeFor(item)?.definition ?? "",
        ),
      );
      const resultsSide =
        request.template === "scene-with-results" ||
        (request.template === "automatic" &&
          scenes.length > 0 &&
          results.length > 0 &&
          results.length <= 2 &&
          compactResults &&
          !wide &&
          !comparison);
      const controlsBelow =
        request.template === "scene-with-footer" ||
        resultsSide ||
        !!wide ||
        comparison;
      const companions = [...controls, ...results];
      const explicitPlacement =
        request.beside !== undefined || request.below !== undefined;
      const sideItems = explicitPlacement
        ? companions.filter((item) =>
            request.beside !== undefined
              ? matches(item, request.beside)
              : !matches(item, request.below ?? []),
          )
        : request.template === "scene-with-split-controls"
          ? companions.slice(0, Math.ceil(companions.length / 2))
          : resultsSide
            ? results
            : controlsBelow
              ? []
              : controls;
      const belowItems = companions.filter((item) => !sideItems.includes(item));
      const sceneWidth = sideItems.length ? width - 344 : width;
      const place = (
        item: ComponentBoardItem,
        rect: ComponentBoardItem["rect"],
      ) => {
        if (!item.locked) item.rect = rect;
      };
      let sceneY = y;
      for (const item of scenes) {
        const minimum = boardItemMinimum(next, item.layoutId);
        const height = Math.max(minimum.height, wide ? 360 : 430);
        place(item, {
          x,
          y: sceneY,
          width: Math.max(minimum.width, sceneWidth),
          height,
        });
        item.responsiveMinHeight = Math.max(minimum.height, wide ? 260 : 300);
        rows.push([item.id]);
        sceneY += height + 24;
      }
      const heightFor = (item: ComponentBoardItem) => {
        const node = nodeFor(item);
        const minimum = boardItemMinimum(next, item.layoutId);
        if (layouts.find(layout => layout.id === item.layoutId)?.kind === "disclosure")
          return minimum.height;
        return Math.max(
          minimum.height,
          node?.definition === "controls/ArithmeticActivity"
            ? 220
            : category(item) === "controls"
              ? 128
              : 100,
        );
      };
      const side = (items: ComponentBoardItem[]) => {
        let bottom = y;
        for (const item of items) {
          const height = heightFor(item);
          place(item, {
            x: x + sceneWidth + 24,
            y: bottom,
            width: Math.max(320, boardItemMinimum(next, item.layoutId).width),
            height,
          });
          item.responsiveMinHeight = height;
          rows.push([item.id]);
          bottom += height + 16;
        }
        return bottom;
      };
      const sideBottom = side(sideItems);
      let bottom = Math.max(sceneY, sideBottom);
      const below = (items: ComponentBoardItem[], columns: number) => {
        for (let offset = 0; offset < items.length; offset += columns) {
          const row = items.slice(offset, offset + columns);
          const height = Math.max(...row.map(heightFor));
          const itemWidth = (width - 24 * (row.length - 1)) / row.length;
          row.forEach((item, column) => {
            const itemHeight = layouts.find(layout => layout.id === item.layoutId)?.kind === "disclosure"
              ? heightFor(item) : height;
            place(item, {
              x: x + column * (itemWidth + 24),
              y: bottom,
              width: Math.max(
                itemWidth,
                boardItemMinimum(next, item.layoutId).width,
              ),
              height: itemHeight,
            });
            item.responsiveMinHeight = itemHeight;
          });
          rows.push(row.map((item) => item.id));
          bottom += height + 24;
        }
      };
      if (explicitPlacement || request.template === "scene-with-split-controls")
        below(belowItems, comparison ? 1 : 2);
      else {
        below(
          belowItems.filter((item) => results.includes(item)),
          compactResults ? 2 : 1,
        );
        below(
          belowItems.filter((item) => controls.includes(item)),
          comparison ? 1 : 2,
        );
      }
      nextScopeY = bottom + 24;
      continue;
    }
    const sceneFirst =
      sceneNode && publicDefinition(sceneNode).learnerLayout === "scene-first";
    if (sceneFirst) {
      board.responsiveGap = 16;
      const place = (
        item: ComponentBoardItem,
        rect: ComponentBoardItem["rect"],
      ) => {
        if (!item.locked) item.rect = rect;
      };
      const earthLesson = sceneNode.definition.startsWith(
        "appearance/earth-atmosphere-",
      );
      const y = nextScopeY;
      place(scenes[0], {
        x: 0,
        y,
        width: 1080,
        height: earthLesson ? 420 : 480,
      });
      scenes[0].responsiveMinHeight = 360;
      rows.push([scenes[0].id]);
      const primary = controls.find((i) =>
        nodeFor(i)?.definition.endsWith("-action"),
      );
      for (const [n, item] of results.entries()) {
        place(item, {
          x: 0,
          y:
            y +
            (earthLesson
              ? 436
              : sceneNode.definition.startsWith("appearance/collective-")
                ? 578
                : 504) +
            n * 100,
          width:
            earthLesson ||
            sceneNode.definition.startsWith("appearance/collective-")
              ? 1080
              : 740,
          height: 80,
        });
        item.responsiveMinHeight = 80;
        rows.push([item.id]);
      }
      if (
        primary &&
        sceneNode.definition.startsWith("appearance/earth-atmosphere-")
      ) {
        place(primary, { x: 0, y: y + 532, width: 1080, height: 80 });
        primary.responsiveMinHeight = 80;
        rows.push([primary.id]);
      } else if (primary) {
        place(primary, {
          x: sceneNode.definition.startsWith("appearance/collective-")
            ? 620
            : 784,
          y: y + 504,
          width: sceneNode.definition.startsWith("appearance/collective-")
            ? 460
            : 296,
          height: 64,
        });
        primary.responsiveMinHeight = 64;
        rows.push([primary.id]);
      }
      const rest = controls.filter((i) => i !== primary);
      for (const [n, item] of rest.entries()) {
        place(item, {
          x: sceneNode.definition.startsWith("appearance/collective-")
            ? 0
            : 620,
          y:
            y +
            (sceneNode.definition.startsWith("appearance/collective-")
              ? 504
              : 596) +
            n * 84,
          width: sceneNode.definition.startsWith("appearance/collective-")
            ? 600
            : 460,
          height: Math.max(64, boardItemMinimum(next, item.layoutId).height),
        });
        item.responsiveMinHeight = Math.max(
          64,
          boardItemMinimum(next, item.layoutId).height,
        );
        rows.push([item.id]);
      }
      nextScopeY = Math.max(
        y + 684,
        y + 604 + results.length * 100,
        y + 596 + rest.length * 84,
      );
      continue;
    }
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
            : ((
                {
                  "appearance/physical-pendulum": 450,
                  "appearance/dynamic-traffic": 360,
                  "appearance/physical-circuit": 400,
                  "appearance/EclipseGeometry": 420,
                  "appearance/SignalSuperposition": 480,
                } as Record<string, number>
              )[nodeFor(item)?.definition ?? ""] ?? 480),
      };
      item.responsiveMinHeight = nodeFor(item)?.definition.includes(
        "arithmetic",
      )
        ? 400
        : 280;
      sceneY += item.rect.height + 20;
    }
    const sidebarLayout = request.template === "scene-with-sidebar";
    const controlTarget = (item: ComponentBoardItem) =>
      next.connections.find(
        (connection) =>
          connection.kind === "command" &&
          connection.from.node === nodeFor(item)?.id,
      )?.to.node;
    const controlTargets = [...new Set(controls.map(controlTarget))];
    const controlColumns = controlTargets.map((target) =>
      controls.filter((item) => controlTarget(item) === target),
    );
    const wideSidebar =
      sidebarLayout &&
      controlColumns.length === 2 &&
      controlColumns[0].length === controlColumns[1].length;
    const playbackFirst = (items: ComponentBoardItem[]) =>
      [...items].sort((a, b) => {
        const rank = (item: ComponentBoardItem) => {
          const command = next.connections.find(
            (connection) =>
              connection.kind === "command" &&
              connection.from.node === nodeFor(item)?.id,
          )?.to.port;
          return command && isPlaybackCommand(command) ? 0 : 1;
        };
        return rank(a) - rank(b);
      });
    const sidebarX =
      request.template === "vertical" || comparison ? x : x + 644;
    const width = wideSidebar
      ? 280
      : comparison
        ? 266
        : request.template === "vertical"
          ? 620
          : 360;
    const heightFor = (item: ComponentBoardItem) => {
      const node = nodeFor(item);
      const minimum = boardItemMinimum(next, item.layoutId);
      const command = next.connections.find(
        (connection) =>
          connection.kind === "command" && connection.from.node === node?.id,
      )?.to.port;
      const preferred =
        command && isPlaybackCommand(command)
          ? 96
          : node?.definition === "controls/ArithmeticActivity"
            ? 262
            : node?.definition === "displays/Inspector"
              ? minimum.height === 96
                ? 112
                : 240
              : node?.definition === "controls/Slider"
                ? 176
                : node?.definition === "controls/NumberInput"
                  ? 160
                  : category(item) === "controls"
                    ? node?.definition === "controls/Button"
                      ? 80
                      : 136
                    : 112;
      return Math.max(preferred, minimum.height);
    };
    let y = request.template === "vertical" || comparison ? sceneY : scopeY;
    let resultsBottom = sceneY;
    if (sidebarLayout) {
      for (const item of results) {
        if (item.locked) continue;
        const height = heightFor(item);
        item.rect = { x, y: resultsBottom, width: 620, height };
        resultsBottom += height + 20;
      }
    }
    const columnControls =
      wideSidebar &&
      controlColumns.length === 2 &&
      controlColumns[0].length === controlColumns[1].length
        ? controlColumns[0].flatMap((item, index) => [
            item,
            controlColumns[1][index],
          ])
        : playbackFirst(controls);
    const sidebarItems = sidebarLayout
      ? columnControls
      : comparison
        ? [...controls, ...results]
        : [...results, ...controls];
    const columns = comparison || wideSidebar ? 2 : 1;
    for (let row = 0; row < sidebarItems.length; row += columns) {
      const items = sidebarItems.slice(row, row + columns);
      const rowHeight = Math.max(...items.map(heightFor));
      for (const [column, item] of items.entries()) {
        if (item.locked) continue;
        item.rect = {
          x: sidebarX + column * (width + 20),
          y,
          width,
          height: rowHeight,
        };
      }
      y += rowHeight + 20;
    }
    nextScopeY = Math.max(resultsBottom, y) + 24;
  }
  board.responsive = true;
  board.responsiveRows = rows;
  for (const item of board.items)
    if (!rows.flat().includes(item.id)) rows.push([item.id]);
  board.startView = extent(board.items.map((i) => i.rect));
  if (
    next.nodes.some((n) => n.definition.startsWith("appearance/collective-"))
  ) {
    board.navigation.minZoom = 1;
    board.navigation.maxZoom = Math.max(1, board.navigation.maxZoom);
    board.startView = {
      ...board.startView,
      y: board.startView.y - 72,
      height: board.startView.height + 162,
    };
    board.learnerArea ??= { ...board.startView };
  }
  // Automatic learner bounds follow content. Preserve an explicitly authored boundary.
  arrangeGraph(next);
  validateAuthoredDocument(next);
  return next;
}
export function arrangeGraph(document: AuthoredDocument) {
  const columns = new Map<string, number>();
  for (const node of [...document.nodes, ...document.resources]) {
    const def = publicDefinition(node);
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
