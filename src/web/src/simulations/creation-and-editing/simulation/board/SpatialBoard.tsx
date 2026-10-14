"use client";
import {
  Component,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BuilderIcon } from "../../../builder/BuilderIcon";
import { ComponentDialog } from "../../../builder/ComponentDialog";
import {
  type BoardItem,
  type BoardPresentation,
  boardItemMinimum,
  boardLayouts,
  type Camera,
  canSeparateLayout,
  clamp,
  constrain,
  convertToBoard,
  extent,
  fit,
  centeredOpeningCamera,
  outsideLearnerView,
  type Rect,
  reorderBoardItems,
  resizeBoardRect,
  screenToWorld,
  supportsOverlay,
  supportsScene,
  zoomAt,
} from "../../authoring-engine/presentation/board";
import { isDrawingItem } from "../../authoring-engine/drawings";
import {
  expandResponsiveContent,
  reflowLearnerArea,
  responsiveBoardRows,
} from "../../authoring-engine/presentation/responsiveLayout";
import type {
  AuthoredDocument,
  Layout,
} from "../../authoring-engine/document";
import { SceneIcon, SceneIconButton, SceneToolbar } from "../../../legacy/components/views/SceneToolbar";
import { DrawingEditor, type DrawingTool } from "./DrawingEditor";
import "./board.css";
const BOARD_CHROME =
  ".drawing-toolbar, .drawing-inspector, .board-toolbar, .board-selection, .board-area-banner, .board-view-warning, .board-settings, .board-camera-tools, .board-workspace-tools";

export function SpatialBoard({
  document,
  authoring,
  workspace,
  autoLayout: requestedAutoLayout,
  onEdit,
  actions,
  onChange,
  onAction,
  render,
}: {
  document: AuthoredDocument;
  authoring?: boolean;
  workspace?: boolean;
  autoLayout?: boolean;
  onEdit?: (id: string) => void;
  actions?: ReactNode;
  onChange?: (
    p: AuthoredDocument["presentation"],
    group?: string,
    action?: string,
  ) => void;
  onAction?: (
    action: "copy" | "paste" | "duplicate" | "delete" | "separate",
    layoutIds: string[],
    itemIds?: string[],
  ) => void;
  render: (layout: Layout) => ReactNode;
}) {
  const persisted =
    document.presentation?.mode === "board" ? document.presentation : null;
  const [conversion, setConversion] = useState<BoardPresentation | null>(null);
  const sourcePresentation = persisted ?? conversion;
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [openingInsets, setOpeningInsets] = useState({ top: 96, bottom: 96 });
  const autoLayout =
    requestedAutoLayout ||
    (!authoring &&
      !!persisted?.responsive &&
      (size.width < 700 || size.height < 700));
  const [naturalHeights, setNaturalHeights] = useState<Record<string, number>>(
    {},
  );
  // Flow recipes enter the same spatial host at a readable scale. Their content
  // determines the initial cards; authored board rectangles remain authoritative.
  const p =
    autoLayout && sourcePresentation
      ? (() => {
          const next = structuredClone(sourcePresentation);
          // Authored responsive boards retain every item and each component's intended size.
          // Narrow screens reflow, rather than shrinking the entire investigation into view.
          if (!requestedAutoLayout) {
            if (size.width >= 700)
              return expandResponsiveContent(
                sourcePresentation,
                naturalHeights,
              );
            const width = Math.max(
              240,
              size.width >= 700
                ? Math.min(720, size.width - 32)
                : size.width - 32,
            );
            const rowGap =
              next.responsiveGap ??
              (size.width >= 700 ? 96 : size.width <= 340 ? 16 : 80);
            let top = 0;
            let openingHeight = 0;
            const rows = responsiveBoardRows(document, next, size.width);
            for (const [rowIndex, row] of rows.entries()) {
              const items = row
                .map((id) => next.items.find((item) => item.id === id))
                .filter((item): item is BoardItem => !!item);
              const columnWidth =
                (width - 16 * (items.length - 1)) / items.length;
              const height = Math.max(
                ...items.map((item) => {
                  const layout = boardLayouts(document).find(
                    (layout) => layout.id === item.layoutId,
                  );
                  const definition =
                    document.nodes.find((node) => node.id === layout?.node)
                      ?.definition ?? "";
                  const scene =
                    definition.startsWith("appearance/") ||
                    definition.startsWith("canvases/");
                  return scene
                    ? Math.max(
                        ("responsiveMinHeight" in item
                          ? item.responsiveMinHeight
                          : undefined) ?? 260,
                        naturalHeights[item.id] ?? 0,
                        Math.min(
                          430,
                          (item.rect.height * columnWidth) / item.rect.width,
                        ),
                      )
                    : Math.max(
                        ("responsiveMinHeight" in item
                          ? item.responsiveMinHeight
                          : undefined) ?? item.rect.height,
                        naturalHeights[item.id] ?? 0,
                      );
                }),
              );
              items.forEach((item, index) => {
                item.rect = {
                  x: index * (columnWidth + 16),
                  y: top,
                  width: columnWidth,
                  height,
                };
              });
              if (rowIndex === 0) openingHeight = height;
              top += height + rowGap;
            }
            next.startView = {
              x: -16,
              y: -16,
              width: width + 32,
              height: openingHeight + 32,
            };
            next.learnerArea = reflowLearnerArea(
              sourcePresentation,
              next.items,
            );
            return next;
          }

          const compact = size.width < 900;
          const sceneWidth = compact ? Math.max(240, size.width - 32) : 640;
          const controlWidth = compact ? sceneWidth : 360;
          let y = 0,
            rowHeight = 0,
            sideHeight = 0;
          const candidates = boardLayouts(document);
          const containsFamily = (layout: Layout, family: string): boolean =>
            document.nodes.some(
              (node) =>
                node.id === layout.node &&
                node.definition.startsWith(`${family}/`),
            ) || layout.children.some((child) => containsFamily(child, family));
          next.items.forEach((item, index) => {
            const layout = candidates.find(
              (layout) => layout.id === item.layoutId,
            );
            const controls =
              !!layout &&
              containsFamily(layout, "controls") &&
              !containsFamily(layout, "canvases") &&
              !containsFamily(layout, "appearance");
            const readout = document.nodes.some(
              (node) =>
                node.id === layout?.node &&
                node.definition === "displays/Readout",
            );
            const besideScene = controls || readout;
            const details = layout?.kind === "disclosure";
            const previous = next.items[index - 1];
            if (compact || !besideScene || !previous) {
              y += rowHeight + (index ? 24 : 0);
              rowHeight = 0;
              sideHeight = 0;
            }
            item.rect = {
              x: !compact && besideScene && previous ? sceneWidth + 24 : 0,
              y: y + (!compact && besideScene && previous ? sideHeight : 0),
              width: besideScene
                ? compact
                  ? sceneWidth
                  : controlWidth
                : sceneWidth,
              height:
                naturalHeights[item.id] ??
                (details ? 90 : readout ? 120 : controls ? 540 : 520),
            };
            rowHeight = Math.max(rowHeight, item.rect.y - y + item.rect.height);
            if (!compact && besideScene && previous)
              sideHeight += item.rect.height + 24;
          });
          // Keep the first scene and its independent controls/results in the opening view.
          let openingCount = 1;
          while (openingCount < next.items.length) {
            const layout = candidates.find(
              (candidate) => candidate.id === next.items[openingCount].layoutId,
            );
            const companion =
              !!layout &&
              (containsFamily(layout, "controls") ||
                document.nodes.some(
                  (node) =>
                    node.id === layout.node &&
                    node.definition === "displays/Readout",
                ));
            if (!companion) break;
            openingCount++;
          }
          const firstRow = next.items.slice(0, openingCount);
          next.startView = extent(firstRow.map((item) => item.rect));
          next.navigation.minZoom = 0.2;
          return next;
        })()
      : !authoring && sourcePresentation?.responsive
        ? expandResponsiveContent(sourcePresentation, naturalHeights)
        : sourcePresentation;
  const [camera, setCamera] = useState<Camera | null>(null);
  useEffect(() => {
    if (autoLayout && size.width > 0) setCamera(null);
  }, [autoLayout, size.width]);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const marqueeGesture = useRef<{
    pointer: number;
    x: number;
    y: number;
    camera: Camera;
    bounds: DOMRect;
    initial: string[];
    additive: boolean;
  } | null>(null);
  const [rightPanning, setRightPanning] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, Rect>>({});
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("select");
  const [pan, setPan] = useState(false),
    [snap, setSnap] = useState(true);
  const pointerFocus = useRef(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  useEffect(() => {
    const activate = (event: Event) => {
      if (event instanceof window.PointerEvent && event.button !== 0) return;
      if (event.type === "focusin" && pointerFocus.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Editing a selected component or using board actions keeps its tools open.
      if (target.closest(`${BOARD_CHROME}, .component-dialog`)) return;
      const item = target.closest<HTMLElement>(".board-item");
      const id =
        item && viewport.current?.contains(item)
          ? item.dataset.boardId
          : undefined;
      setActiveItem(id ?? null);
      if (!authoring || pan || drawingTool !== "select") return;
      if (id) {
        // Handles already select through their move/resize handlers.
        if (target.closest(".board-item-tools, .board-resize")) return;
        const ids = p?.groups.find((group) => group.members.includes(id))
          ?.members ?? [id];
        const additive = event instanceof window.PointerEvent && event.shiftKey;
        setSelection((current) =>
          additive
            ? [...new Set([...current, ...ids])]
            : current.includes(id)
              ? current
              : ids,
        );
      } else if (!(event instanceof window.PointerEvent && event.shiftKey)) {
        setSelection([]);
      }
    };
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        (event.target instanceof Element &&
          event.target.closest(
            ".component-dialog, .board-toolbar details[open], .board-selection details[open]",
          ))
      )
        return;
      setActiveItem(null);
      setSelection([]);
    };
    window.addEventListener("pointerdown", activate, true);
    window.addEventListener("focusin", activate);
    window.addEventListener("keydown", dismiss, true);
    return () => {
      window.removeEventListener("pointerdown", activate, true);
      window.removeEventListener("focusin", activate);
      window.removeEventListener("keydown", dismiss, true);
    };
  }, [authoring, pan, drawingTool, p]);
  const [editArea, setEditArea] = useState(false);
  const [settings, setSettings] = useState(false),
    [search, setSearch] = useState("");
  const settingsButton = useRef<HTMLButtonElement>(null);
  const closeSettings = () => {
    setSettings(false);
    requestAnimationFrame(() => settingsButton.current?.focus());
  };
  const [compactContent, setCompactContent] = useState("");
  const [expandControls, setExpandControls] = useState(false);
  const [immersive, setImmersive] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [announcement, announce] = useState("");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    distance: number;
    camera: Camera;
    x: number;
    y: number;
  } | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const authorCamera = useRef<Camera | null>(null);
  useEffect(() => {
    if (!authoring) {
      authorCamera.current = cameraRef.current;
      setCamera(null);
    } else if (authorCamera.current) setCamera(authorCamera.current);
  }, [authoring]);
  const returnFocus = useRef<HTMLElement | null>(null);
  const gesture = useRef<{
    pointer: number;
    x: number;
    y: number;
    camera: Camera;
    mode: "pan" | "move" | "resize" | "area-move" | "area-resize";
    button: number;
    rects: Record<string, Rect>;
  } | null>(null);
  useEffect(() => {
    const cancelDrag = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        (!gesture.current && !marqueeGesture.current)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (gesture.current?.mode === "pan") setCamera(gesture.current.camera);
      marqueeGesture.current = null;
      setMarquee(null);
      setRightPanning(false);
      gesture.current = null;
      pinch.current = null;
      pointers.current.clear();
      setPreview({});
    };
    window.addEventListener("keydown", cancelDrag, true);
    return () => window.removeEventListener("keydown", cancelDrag, true);
  }, []);
  const hasBoard = !!p;
  const lastItems = useRef(p?.items.map((i) => i.id) ?? []);
  useEffect(() => {
    if (!p || !authoring) return;
    const added = p.items.find((i) => !lastItems.current.includes(i.id));
    lastItems.current = p.items.map((i) => i.id);
    if (added && !isDrawingItem(added))
      setCamera({
        centerX: added.rect.x + added.rect.width / 2,
        centerY: added.rect.y + added.rect.height / 2,
        zoom: 1,
      });
  }, [p, authoring]);
  useEffect(() => {
    if (
      (!autoLayout && (authoring || !sourcePresentation?.responsive)) ||
      !sourcePresentation ||
      !viewport.current
    )
      return;
    const observer = new ResizeObserver((entries) => {
      setNaturalHeights((current) => {
        const next = { ...current };
        let changed = false;
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const host = element.closest<HTMLElement>(".board-item");
          const id = host?.dataset.boardId;
          if (!id) continue;
          const content =
            element.closest(".board-content") ?? element.parentElement;
          const height = Math.ceil(
            element.offsetHeight +
              (content
                ? parseFloat(getComputedStyle(content).paddingTop) +
                  parseFloat(getComputedStyle(content).paddingBottom)
                : 0) +
              (element.hasAttribute("data-responsive-height") ? 0 : 2),
          );
          if (Math.abs((next[id] ?? 0) - height) > 1) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    viewport.current
      .querySelectorAll(".board-content > .recipe-layout")
      .forEach((element) => {
        const measuredContent = element.querySelector(
          '[data-responsive-height="content"]',
        );
        if (measuredContent) {
          observer.observe(measuredContent);
          return;
        }
        if (
          !requestedAutoLayout &&
          element.closest('[data-board-scene="true"]')
        ) {
          const content = element.querySelector(
            '[data-responsive-height="content"]',
          );
          if (content) observer.observe(content);
          return;
        }
        observer.observe(element);
      });
    return () => observer.disconnect();
  }, [autoLayout, sourcePresentation, authoring, requestedAutoLayout]);
  useEffect(() => {
    if (!hasBoard || !viewport.current) return;
    if (!document.nodes.some((node) => node.definition === "displays/Text"))
      return;
    const observer = new ResizeObserver((entries) => {
      setNaturalHeights((current) => {
        const next = { ...current };
        let changed = false;
        for (const entry of entries) {
          const text = entry.target as HTMLElement;
          const host = text.closest<HTMLElement>(".board-item");
          const card = text.closest<HTMLElement>(".recipe-text-card");
          const id = host?.dataset.boardId;
          if (!id || !card) continue;
          const style = getComputedStyle(card);
          const height = Math.ceil(
            text.offsetHeight +
              parseFloat(style.paddingTop) +
              parseFloat(style.paddingBottom) +
              parseFloat(style.borderTopWidth) +
              parseFloat(style.borderBottomWidth),
          );
          if (next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    viewport.current
      .querySelectorAll(
        '[data-board-component="displays/Text"] .recipe-text-content',
      )
      .forEach((element) => {
        observer.observe(element);
      });
    return () => observer.disconnect();
  }, [hasBoard, document.nodes]);
  useLayoutEffect(() => {
    if (!hasBoard || !viewport.current) return;
    const element = viewport.current;
    // Frame imported boards before paint, without waiting for ResizeObserver.
    const host = workspace ? element.closest(".experiment-workspace") : null;
    const header = host?.querySelector(".recipe-lesson > header");
    const composer = host?.querySelector(".workspace-composer");
    const measure = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
      const bounds = element.getBoundingClientRect();
      const top = Math.max(24, (header?.getBoundingClientRect().bottom ?? bounds.top) - bounds.top + 24);
      const bottom = Math.max(24, bounds.bottom - (composer?.getBoundingClientRect().top ?? bounds.bottom) + 24);
      setOpeningInsets(current => current.top === top && current.bottom === bottom ? current : { top, bottom });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (header) observer.observe(header);
    if (composer) observer.observe(composer);
    const wheel = (event: WheelEvent) => {
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !(event.target as HTMLElement).closest(".board-item")
      )
        event.preventDefault();
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", wheel);
    };
  }, [hasBoard, workspace]);
  useEffect(() => {
    if (!authoring && persisted?.immersive.startup === "scene")
      setImmersive(persisted.immersive.sceneItemId ?? null);
    else setImmersive(null);
  }, [
    authoring,
    persisted?.immersive.startup,
    persisted?.immersive.sceneItemId,
  ]);
  if (!p)
    return (
      <>
        {authoring && (
          <div className="board-convert">
            <p>
              Arrange this lesson on a spatial board. Existing groups and
              connections stay together.
            </p>
            <button
              type="button"
              onClick={() => setConversion(convertToBoard(document))}
            >
              Preview board conversion
            </button>
          </div>
        )}
        {render(document.layout)}
      </>
    );
  const contentArea =
    preview.__area ?? p.learnerArea ?? extent(p.items.map((i) => i.rect));
  const area = autoLayout
    ? { ...contentArea, height: contentArea.height + 96 }
    : contentArea;
  // The canvas stays full-size; floating UI only affects the opening camera position.
  const topClearance = workspace ? (size.width < 700 ? 128 : 0) : 24;
  const bottomClearance = workspace ? 0 : 24;
  const navigationArea =
    workspace && p.navigation.mode !== "fixed"
      ? {
          ...area,
          y: area.y - topClearance,
          height: area.height + topClearance + bottomClearance,
        }
      : area;
  const freeCanvas = !!workspace;
  // Accepted content may grow; it must not shrink or recenter the learner's view.
  // The opening frame comes from authored bounds, while navigation uses live bounds.
  const openingArea =
    !authoring && sourcePresentation
      ? (sourcePresentation.learnerArea ??
        extent(sourcePresentation.items.map((item) => item.rect)))
      : area;
  const initial =
    freeCanvas && !autoLayout
      ? fit(openingArea, size.width, size.height)
      : fit(
          p.startView,
          Math.max(1, size.width - 48),
          Math.max(1, size.height - topClearance - bottomClearance),
        );
  if (freeCanvas && !autoLayout && p.navigation.mode !== "fixed")
    initial.zoom = clamp(
      initial.zoom / 1.2,
      p.navigation.minZoom,
      p.navigation.maxZoom,
    );
  if (
    autoLayout ||
    (!freeCanvas && workspace && !authoring && p.navigation.mode !== "fixed")
  ) {
    initial.zoom =
      (autoLayout && !requestedAutoLayout) || p.responsive
        ? 1
        : Math.min(1, Math.max(0.75, initial.zoom));
    initial.centerX =
      p.startView.x +
      Math.min(p.startView.width, size.width / initial.zoom) / 2;
    const contentTop = Math.min(...p.items.map((item) => item.rect.y));
    const startingTop = Math.min(
      p.startView.y,
      contentTop - topClearance / initial.zoom,
    );
    initial.centerY = startingTop + size.height / (2 * initial.zoom);
  }
  if (authoring) initial.zoom = Math.min(1, initial.zoom);
  // Reflowed learner content stays at readable scale even in the full workspace.
  // Center the opening content between floating headings and the composer.
  if (freeCanvas && !authoring && (autoLayout || p.responsive)) {
    Object.assign(initial, centeredOpeningCamera(
      autoLayout ? { ...p.startView, height: extent(p.items.map(item => item.rect)).height } : p.startView,
      size, openingInsets,
      autoLayout ? 1 : Math.min(1, size.width / p.startView.width),
    ));
  }
  const base = camera ?? initial;
  const fixed = !authoring && p.navigation.mode === "fixed";
  const navigable = fixed
    ? initial
    : {
        ...base,
        zoom: clamp(base.zoom, p.navigation.minZoom, p.navigation.maxZoom),
      };
  const c = authoring
    ? base
    : freeCanvas
      ? navigable
      : constrain(navigable, navigationArea, size.width, size.height);
  const layouts = boardLayouts(document);
  const allLayouts = new Map<string, Layout>();
  const collectLayouts = (layout: Layout) => {
    allLayouts.set(layout.id, layout);
    layout.children.forEach(collectLayouts);
  };
  collectLayouts(document.layout);
  const separatedLabels = (p.separatedLayouts ?? []).flatMap((id) => {
    const layout = allLayouts.get(id);
    if (!layout?.label) return [];
    const contains = (parent: Layout, id: string): boolean =>
      parent.children.some((child) => child.id === id || contains(child, id));
    const rects = p.items
      .filter((item) => contains(layout, item.layoutId ?? ""))
      .map((item) => preview[item.id] ?? item.rect);
    return rects.length
      ? [{ id, label: layout.label, rect: extent(rects) }]
      : [];
  });
  const title = (id: string) => {
    const i = p.items.find((i) => i.id === id);
    if (i && isDrawingItem(i))
      return i.kind === "box" ? "Box" : i.text.slice(0, 40) || "Text";
    const l = layouts.find((l) => l.id === i?.layoutId);
    return (
      l?.label ||
      document.nodes.find((n) => n.id === l?.node)?.label ||
      `Content ${p.items.findIndex((i) => i.id === id) + 1}`
    );
  };
  const commit = (next: BoardPresentation, message: string) => {
    if (conversion) setConversion(next);
    else onChange?.(next);
    announce(message);
  };
  const update = (
    fn: (next: BoardPresentation) => void,
    message = "Presentation updated",
  ) => {
    const next = structuredClone(p);
    fn(next);
    commit(next, message);
  };
  const expandLearnerView = () =>
    update((next) => {
      next.learnerArea = extent(next.items.map((item) => item.rect));
    }, "Learner view expanded to fit all content");
  const outsideContent = p.items.some((item) =>
    outsideLearnerView(p, preview[item.id] ?? item.rect),
  );
  const selected = p.items.filter((i) => selection.includes(i.id));
  const cancel = () => {
    marqueeGesture.current = null;
    setMarquee(null);
    setRightPanning(false);
    gesture.current = null;
    pinch.current = null;
    pointers.current.clear();
    setPreview({});
  };
  const begin = (
    event: PointerEvent<HTMLElement>,
    mode: "pan" | "move" | "resize" | "area-move" | "area-resize",
    id?: string,
  ) => {
    if (
      (event.button !== 0 && !(mode === "pan" && event.button === 2)) ||
      (mode === "pan" && fixed)
    )
      return;
    if (event.button === 2) setRightPanning(true);
    event.preventDefault();
    event.stopPropagation();
    if (mode === "pan") {
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const bounds = viewport.current?.getBoundingClientRect();
        if (!bounds) return;
        pinch.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          camera: c,
          x: (a.x + b.x) / 2 - bounds.left - size.width / 2,
          y: (a.y + b.y) / 2 - bounds.top - size.height / 2,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
    }
    let ids = selection;
    if (id && id !== "__area" && mode !== "resize") {
      const group = p.groups.find((g) => g.members.includes(id));
      ids = event.shiftKey
        ? [...new Set([...selection, ...(group?.members ?? [id])])]
        : selection.includes(id)
          ? selection
          : (group?.members ?? [id]);
      setSelection(ids);
    }
    if (mode === "resize" && id) {
      ids = [id];
      setSelection([id]);
    }
    const rects =
      id === "__area"
        ? { __area: area }
        : Object.fromEntries(
            p.items
              .filter((i) => ids.includes(i.id) && !i.locked)
              .map((i) => [i.id, i.rect]),
          );
    gesture.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      camera: c,
      mode,
      button: event.button,
      rects,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const beginMarquee = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left,
      y = event.clientY - bounds.top;
    marqueeGesture.current = {
      pointer: event.pointerId,
      x,
      y,
      bounds,
      camera: c,
      initial: selection,
      additive: event.shiftKey,
    };
    setMarquee({ x, y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const marqueeRect = (
    event: PointerEvent,
    g: NonNullable<typeof marqueeGesture.current>,
  ): Rect => {
    const x = event.clientX - g.bounds.left,
      y = event.clientY - g.bounds.top;
    return {
      x: Math.min(x, g.x),
      y: Math.min(y, g.y),
      width: Math.abs(x - g.x),
      height: Math.abs(y - g.y),
    };
  };
  const completeMarquee = (event: PointerEvent) => {
    const g = marqueeGesture.current;
    if (!g || g.pointer !== event.pointerId) return false;
    const rect = marqueeRect(event, g);
    const origin = screenToWorld({ x: rect.x, y: rect.y }, g.camera, size);
    const width = rect.width / g.camera.zoom,
      height = rect.height / g.camera.zoom;
    const hits =
      Math.hypot(rect.width, rect.height) < 4
        ? []
        : p.items
            .filter(
              (item) =>
                item.rect.x < origin.x + width &&
                item.rect.x + item.rect.width > origin.x &&
                item.rect.y < origin.y + height &&
                item.rect.y + item.rect.height > origin.y,
            )
            .map((item) => item.id);
    const ids = new Set(g.additive ? [...g.initial, ...hits] : hits);
    for (const group of p.groups)
      if (group.members.some((id) => ids.has(id)))
        for (const id of group.members) ids.add(id);
    setSelection([...ids]);
    cancel();
    return true;
  };
  const move = (event: PointerEvent) => {
    if (marqueeGesture.current?.pointer === event.pointerId) {
      setMarquee(marqueeRect(event, marqueeGesture.current));
      return;
    }
    if (pinch.current && pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const bounds = viewport.current?.getBoundingClientRect(),
        start = pinch.current;
      if (!bounds) return;
      const z = clamp(
        (start.camera.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
          Math.max(1, start.distance),
        authoring ? 0.1 : p.navigation.minZoom,
        authoring ? 4 : p.navigation.maxZoom,
      );
      const next = zoomAt(start.camera, z, start.x, start.y);
      next.centerX -=
        ((a.x + b.x) / 2 - bounds.left - size.width / 2 - start.x) / z;
      next.centerY -=
        ((a.y + b.y) / 2 - bounds.top - size.height / 2 - start.y) / z;
      setCamera(next);
      return;
    }
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    const dx = (event.clientX - g.x) / g.camera.zoom,
      dy = (event.clientY - g.y) / g.camera.zoom;
    if (g.mode === "pan")
      setCamera({
        ...g.camera,
        centerX: g.camera.centerX - dx,
        centerY: g.camera.centerY - dy,
      });
    else {
      const round = (v: number) => (snap ? Math.round(v / 8) * 8 : v);
      setPreview(
        Object.fromEntries(
          Object.entries(g.rects).map(([id, r]) => {
            if (g.mode === "move" || g.mode === "area-move")
              return [
                id,
                {
                  ...r,
                  x: clamp(r.x + round(dx), -999000, 999000),
                  y: clamp(r.y + round(dy), -999000, 999000),
                },
              ];
            const item = p.items.find((candidate) => candidate.id === id);
            const ratio = item?.aspectRatio;
            const minimum = item
              ? boardItemMinimum(document, item.layoutId)
              : undefined;
            return [
              id,
              resizeBoardRect(r, dx, dy, ratio, snap ? 8 : 0, minimum),
            ];
          }),
        ),
      );
    }
  };
  const finish = (event: PointerEvent) => {
    if (completeMarquee(event)) return;
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    if (
      authoring &&
      !pan &&
      g?.mode === "pan" &&
      g.button === 0 &&
      !pinch.current &&
      Math.hypot(event.clientX - g.x, event.clientY - g.y) < 4
    )
      setSelection([]);
    if (gesture.current?.mode !== "pan" && Object.keys(preview).length)
      update((n) => {
        n.items.forEach((i) => {
          if (preview[i.id]) i.rect = preview[i.id];
        });
      }, "Placement updated. Undo restores the previous placement.");
    cancel();
  };
  const zoom = (factor: number, x = 0, y = 0) => {
    if (!fixed)
      setCamera(
        zoomAt(
          c,
          clamp(
            c.zoom * factor,
            authoring ? 0.1 : p.navigation.minZoom,
            authoring ? 4 : p.navigation.maxZoom,
          ),
          x,
          y,
        ),
      );
  };
  // Reflowed lessons zoom from their opening corner, keeping the first action reachable.
  const zoomFromToolbar = (factor: number) =>
    zoom(
      factor,
      autoLayout && !authoring ? 16 - size.width / 2 : 0,
      autoLayout && !authoring ? 96 - size.height / 2 : 0,
    );
  const fitContent = () => {
    const next = fit(
      authoring ? extent(p.items.map((i) => i.rect)) : area,
      size.width,
      size.height,
    );
    if (authoring) next.zoom = Math.min(1, next.zoom);
    setCamera(next);
  };
  const exit = () => {
    setImmersive(null);
    requestAnimationFrame(() => returnFocus.current?.focus());
  };
  const overlays = p.immersive.overlays.filter(
    (o) => o.sceneItemId === immersive,
  );
  const compactItems = p.items.filter((i) =>
    overlays.some((o) => o.contentItemIds.includes(i.id)),
  );
  const activeCompact =
    compactItems.find((i) => i.id === compactContent)?.id ??
    compactItems[0]?.id;
  const overlayFor = (id: string) =>
    overlays.find((o) => o.contentItemIds.includes(id));
  return (
    <section
      className={`spatial-board ${workspace && !conversion ? "is-workspace" : ""} ${requestedAutoLayout ? "is-auto-layout" : ""} ${!requestedAutoLayout && persisted?.responsive ? "is-responsive-layout" : ""} ${immersive ? "is-scene" : ""} ${size.width < 700 ? "is-compact" : ""}`}
      aria-label="Experiment board"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || gesture.current) return;
        const target = event.target as HTMLElement;
        const disclosure = target.closest<HTMLDetailsElement>(
          ".board-toolbar details[open], .board-selection details[open]",
        );
        if (disclosure) {
          disclosure.open = false;
          disclosure.querySelector<HTMLElement>("summary")?.focus();
          event.stopPropagation();
        } else if (settings) {
          closeSettings();
          event.stopPropagation();
        } else if (!immersive && authoring) setSelection([]);
      }}
    >
      {conversion && (
        <div className="board-convert">
          <strong>Board conversion preview</strong>
          <p>
            Layout groups and bindings are preserved. You can undo conversion or
            return to the original flow order.
          </p>
          <button
            type="button"
            className="board-primary"
            onClick={() => {
              onChange?.(conversion);
              setConversion(null);
            }}
          >
            Use this board
          </button>
          <button type="button" onClick={() => setConversion(null)}>
            Cancel conversion
          </button>
        </div>
      )}
      <div
        className={`board-toolbar ${workspace && !conversion && !immersive ? "is-floating" : ""}`}
      >
        {immersive ? (
          <>
            {(authoring || p.immersive.allowReturnToBoard) && (
              <button type="button" onClick={exit}>
                Return to board
              </button>
            )}
            <strong>{title(immersive)}</strong>
            {size.width < 700 && compactItems.length > 0 && (
              <>
                <select
                  aria-label="Immersive content"
                  value={activeCompact}
                  onChange={(e) => setCompactContent(e.target.value)}
                >
                  {compactItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {title(i.id)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-expanded={expandControls}
                  onClick={() => setExpandControls(!expandControls)}
                >
                  {expandControls ? "Compact controls" : "Expand controls"}
                </button>
              </>
            )}
            {overlays.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-expanded={!(collapsed[o.id] ?? o.collapsedByDefault)}
                onClick={() =>
                  setCollapsed((v) => ({
                    ...v,
                    [o.id]: !(v[o.id] ?? o.collapsedByDefault),
                  }))
                }
              >
                {(collapsed[o.id] ?? o.collapsedByDefault) ? "Show" : "Hide"}{" "}
                controls
              </button>
            ))}
            {actions && (
              <details className="board-navigator">
                <summary>Experiment actions</summary>
                <div>{actions}</div>
              </details>
            )}
          </>
        ) : (
          <>
            <SceneToolbar
              label="Board navigation"
              actions={[]}
              className="board-camera-tools"
            >
              <SceneIconButton
                icon="pan"
                label="Pan"
                disabled={fixed}
                pressed={pan}
                onClick={() => {
                  setDrawingTool(pan ? "select" : "hand");
                  setPan(!pan);
                }}
              />
              <SceneIconButton
                icon="zoom-out"
                label="Zoom out"
                disabled={fixed}
                onClick={() => zoomFromToolbar(1 / 1.2)}
              />
              <output aria-label="Board zoom">
                {Math.round(c.zoom * 100)}%
              </output>
              <SceneIconButton
                icon="zoom-in"
                label="Zoom in"
                disabled={fixed}
                onClick={() => zoomFromToolbar(1.2)}
              />
              <SceneIconButton
                icon="fit"
                label="Fit content"
                disabled={fixed}
                onClick={fitContent}
              />
              <details className="board-navigation-help">
                <summary aria-label="Board navigation help">?</summary>
                <div>
                  <button type="button" onClick={() => setCamera(null)}>
                    Starting view
                  </button>
                  <p>
                    {authoring
                      ? "In Select mode, drag empty space to select multiple items. Hold right-click or Space and drag to pan."
                      : "Drag empty space to pan."}{" "}
                    Use Alt + wheel or pinch to zoom. Interact with content
                    directly.
                  </p>
                  {authoring && (
                    <p>
                      Drag a component heading to move it. Shift + click
                      headings to select several. Use arrow keys on a heading to
                      position it.
                    </p>
                  )}
                  {actions}
                </div>
              </details>
            </SceneToolbar>
            <div className="board-workspace-tools">
              <details className="board-navigator">
                <summary>Find content</summary>
                <div>
                  <input
                    aria-label="Find board content"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search content"
                  />
                  {p.items
                    .filter((i) =>
                      title(i.id).toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((i) => (
                      <button
                        type="button"
                        key={i.id}
                        onClick={(event) => {
                          const disclosure =
                            event.currentTarget.closest("details");
                          if (disclosure) disclosure.open = false;
                          if (!fixed)
                            setCamera({
                              ...fit(i.rect, size.width - 48, size.height - 48),
                              zoom: Math.min(1, c.zoom),
                            });
                          setSelection([i.id]);
                          viewport.current
                            ?.querySelector<HTMLElement>(
                              `[data-board-index="${p.items.indexOf(i)}"]`,
                            )
                            ?.focus();
                        }}
                      >
                        {title(i.id)}
                      </button>
                    ))}
                </div>
              </details>
              {authoring && (
                <button
                  ref={settingsButton}
                  type="button"
                  aria-expanded={settings}
                  onClick={() => {
                    if (settings) closeSettings();
                    else {
                      announce("");
                      setSettings(true);
                    }
                  }}
                >
                  Board settings
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {authoring && outsideContent && !immersive && (
        <div className="board-view-warning">
          <output>
            Some content falls outside the learner view. Preview will show it
            clipped.
          </output>
          <button type="button" onClick={expandLearnerView}>
            Expand to fit
          </button>
          <button
            type="button"
            onClick={() => {
              setEditArea(true);
              setSelection([]);
              setCamera(fit(area, size.width - 48, size.height - 48));
            }}
          >
            Show boundary
          </button>
        </div>
      )}
      {authoring && editArea && (
        <div className="board-area-banner">
          <strong>Edit learner view</strong>
          <span>
            Drag the boundary handles or use numeric fields in Board settings.
            Escape cancels a drag.
          </span>
          <button type="button" onClick={() => setEditArea(false)}>
            Done editing boundary
          </button>
        </div>
      )}
      {authoring && settings && (
        <ComponentDialog
          open
          title="Board settings"
          subtitle="Shape the experience learners see and explore."
          className="board-settings-dialog"
          onClose={closeSettings}
          footerLabel="Done"
          footerPrimary
          footerNote="Presentation changes apply immediately."
        >
          <output className="board-settings-feedback">{announcement}</output>
          <section className="board-settings-section">
            <div className="board-settings-section-heading">
              <BuilderIcon name="layout" />
              <div>
                <h3>Learner view</h3>
                <p>Choose how much of the board learners can explore.</p>
              </div>
            </div>
            <fieldset className="board-learner-view">
              <legend className="board-sr-only">Explorable area</legend>
              <label>
                <input
                  type="radio"
                  name="learner-view"
                  aria-label="Fit all content"
                  checked={!p.learnerArea}
                  onChange={() => {
                    setEditArea(false);
                    update((next) => {
                      delete next.learnerArea;
                    }, "Learner view now fits all content automatically");
                  }}
                />
                <span>
                  <strong>Fit all content</strong>
                  <small>
                    Automatically follows components as you add, move, or resize
                    them.
                  </small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="learner-view"
                  aria-label="Custom boundary"
                  checked={!!p.learnerArea}
                  onChange={() => {
                    expandLearnerView();
                    setEditArea(true);
                  }}
                />
                <span>
                  <strong>Custom boundary</strong>
                  <small>
                    Define a specific area and keep learners focused inside it.
                  </small>
                </span>
              </label>
              {p.learnerArea && (
                <div className="board-boundary-settings">
                  <div className="board-settings-actions">
                    <button type="button" onClick={expandLearnerView}>
                      Expand to fit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditArea(true);
                        setSelection([]);
                        setSettings(false);
                        setCamera(fit(area, size.width - 48, size.height - 48));
                        requestAnimationFrame(() => viewport.current?.focus());
                      }}
                    >
                      Edit boundary on board
                    </button>
                  </div>
                  <details className="board-settings-details">
                    <summary>Exact boundary dimensions</summary>
                    <p>
                      Board coordinates in pixels. Apply to update the boundary.
                    </p>
                    <Geometry
                      label="Boundary dimensions"
                      applyLabel="Apply boundary"
                      maxSize={1000000}
                      rect={p.learnerArea}
                      onApply={(rect) =>
                        update((next) => {
                          next.learnerArea = rect;
                        })
                      }
                    />
                  </details>
                </div>
              )}
            </fieldset>
            {p.navigation.mode === "fixed" && (
              <p>
                Fixed views keep controls at their original readable size.
                Preview at your smallest target screen size and capture a
                smaller starting frame if needed.
              </p>
            )}
            <label>
              Learner navigation
              <select
                aria-label="Learner navigation"
                value={p.navigation.mode}
                onChange={(e) =>
                  update((n) => {
                    n.navigation.mode = e.target.value as "fixed" | "bounded";
                  })
                }
              >
                <option value="bounded">Pan and zoom within area</option>
                <option value="fixed">Fixed starting view</option>
              </select>
            </label>
            <details className="board-settings-details">
              <summary>Zoom limits</summary>
              <p>Set the smallest and largest zoom learners can use.</p>
              <form
                className="board-geometry"
                key={`${p.navigation.minZoom}/${p.navigation.maxZoom}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const minZoom = Number(data.get("minZoom")),
                    maxZoom = Number(data.get("maxZoom"));
                  if (minZoom > maxZoom) {
                    announce("Minimum zoom must not exceed maximum zoom.");
                    return;
                  }
                  update((n) => {
                    n.navigation.minZoom = minZoom;
                    n.navigation.maxZoom = maxZoom;
                  });
                }}
              >
                <label>
                  Minimum zoom
                  <input
                    type="number"
                    required
                    name="minZoom"
                    min="0.1"
                    max="4"
                    step="0.05"
                    defaultValue={p.navigation.minZoom}
                  />
                </label>
                <label>
                  Maximum zoom
                  <input
                    type="number"
                    required
                    name="maxZoom"
                    min="0.1"
                    max="4"
                    step="0.05"
                    defaultValue={p.navigation.maxZoom}
                  />
                </label>
                <button type="submit">Apply zoom limits</button>
              </form>
            </details>
          </section>
          <section className="board-settings-section">
            <div className="board-settings-section-heading">
              <BuilderIcon name="eye" />
              <div>
                <h3>Starting experience</h3>
                <p>Decide what learners see when they open the lesson.</p>
              </div>
            </div>
            <div className="board-start-view">
              <div>
                <strong>Starting view</strong>
                <p>
                  Use the current board position and zoom as the opening frame.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update((n) => {
                    n.startView = {
                      x: c.centerX - size.width / c.zoom / 2,
                      y: c.centerY - size.height / c.zoom / 2,
                      width: size.width / c.zoom,
                      height: size.height / c.zoom,
                    };
                  }, "Starting view captured")
                }
              >
                Capture starting view
              </button>
              {p.startView && (
                <small className="board-start-view-saved">
                  <BuilderIcon name="check" /> Saved frame:{" "}
                  {Math.round(p.startView.width)} ×{" "}
                  {Math.round(p.startView.height)}
                </small>
              )}
            </div>
            <label>
              Start presentation
              <select
                aria-label="Start presentation"
                value={
                  p.immersive.startup === "scene" ? p.immersive.sceneItemId : ""
                }
                onChange={(e) =>
                  update((n) => {
                    n.immersive.startup = e.target.value ? "scene" : "board";
                    if (e.target.value)
                      n.immersive.sceneItemId = e.target.value;
                    else delete n.immersive.sceneItemId;
                  })
                }
              >
                <option value="">Board</option>
                {p.items
                  .filter((i) => supportsScene(document, i.layoutId))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {title(i.id)} — immersive
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={p.immersive.allowReturnToBoard}
                onChange={(e) =>
                  update((n) => {
                    n.immersive.allowReturnToBoard = e.target.checked;
                  })
                }
              />{" "}
              Allow learner return to board
            </label>
            {p.items
              .filter((i) => supportsScene(document, i.layoutId))
              .map((scene) => (
                <details className="board-settings-details" key={scene.id}>
                  <summary>{title(scene.id)} overlays</summary>
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        p.immersive.overlays.find(
                          (o) => o.sceneItemId === scene.id,
                        )?.collapsedByDefault ?? false
                      }
                      onChange={(e) =>
                        update((n) => {
                          let o = n.immersive.overlays.find(
                            (o) => o.sceneItemId === scene.id,
                          );
                          if (!o) {
                            o = {
                              id: `overlay/${scene.id}`,
                              sceneItemId: scene.id,
                              contentItemIds: [],
                              anchor: "right",
                              collapsedByDefault: false,
                            };
                            n.immersive.overlays.push(o);
                          }
                          o.collapsedByDefault = e.target.checked;
                        })
                      }
                    />
                    Start with controls collapsed
                  </label>
                  <label>
                    Position
                    <select
                      value={
                        p.immersive.overlays.find(
                          (o) => o.sceneItemId === scene.id,
                        )?.anchor ?? "right"
                      }
                      onChange={(e) =>
                        update((n) => {
                          let o = n.immersive.overlays.find(
                            (o) => o.sceneItemId === scene.id,
                          );
                          if (!o) {
                            o = {
                              id: `overlay/${scene.id}`,
                              sceneItemId: scene.id,
                              contentItemIds: [],
                              anchor: "right",
                              collapsedByDefault: false,
                            };
                            n.immersive.overlays.push(o);
                          }
                          o.anchor = e.target.value as
                            | "left"
                            | "right"
                            | "bottom";
                        })
                      }
                    >
                      <option>left</option>
                      <option>right</option>
                      <option>bottom</option>
                    </select>
                  </label>
                  {p.items
                    .filter((i) => supportsOverlay(document, i.layoutId))
                    .map((i) => (
                      <label key={i.id}>
                        <input
                          type="checkbox"
                          checked={p.immersive.overlays.some(
                            (o) =>
                              o.sceneItemId === scene.id &&
                              o.contentItemIds.includes(i.id),
                          )}
                          onChange={(e) =>
                            update((n) => {
                              let o = n.immersive.overlays.find(
                                (o) => o.sceneItemId === scene.id,
                              );
                              if (!o) {
                                o = {
                                  id: `overlay/${scene.id}`,
                                  sceneItemId: scene.id,
                                  contentItemIds: [],
                                  anchor: "right",
                                  collapsedByDefault: false,
                                };
                                n.immersive.overlays.push(o);
                              }
                              o.contentItemIds = e.target.checked
                                ? [...o.contentItemIds, i.id]
                                : o.contentItemIds.filter((id) => id !== i.id);
                            })
                          }
                        />
                        {title(i.id)}
                      </label>
                    ))}
                </details>
              ))}
          </section>
          <section className="board-settings-section">
            <div className="board-settings-section-heading">
              <BuilderIcon name="settings" />
              <div>
                <h3>Editing &amp; layout</h3>
                <p>Arrange your board and adapt it to smaller screens.</p>
              </div>
            </div>
            <label className="board-settings-toggle">
              <input
                type="checkbox"
                checked={snap}
                onChange={(e) => setSnap(e.target.checked)}
              />
              <span>
                <strong>Snap to grid</strong>
                <small>Align components while moving and resizing them.</small>
              </span>
            </label>
            {p.responsive && (
              <label>
                Space between narrow-screen rows (px)
                <input
                  type="number"
                  aria-label="Space between narrow-screen rows"
                  min="8"
                  max="128"
                  value={p.responsiveGap ?? 80}
                  onChange={(event) => {
                    const gap = Number(event.target.value);
                    if (Number.isFinite(gap) && gap >= 8 && gap <= 128)
                      update((next) => {
                        next.responsiveGap = gap;
                      });
                  }}
                />
              </label>
            )}
            <div className="board-flow-option">
              <p>
                Prefer a stacked lesson? Flow layout uses your components’
                original order.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSettings(false);
                  setEditArea(false);
                  onChange?.({ mode: "flow" });
                }}
              >
                Return to flow layout (original order)
              </button>
            </div>
          </section>
        </ComponentDialog>
      )}
      <div
        ref={viewport}
        role="application"
        aria-label="Board workspace"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The board has keyboard pan and cancellation commands.
        tabIndex={0}
        className={`board-viewport ${pan || rightPanning ? "is-panning" : ""} ${rightPanning ? "is-right-panning" : ""} ${immersive && overlays.some((o) => !(collapsed[o.id] ?? o.collapsedByDefault)) ? "has-overlays" : ""}`}
        style={{
          backgroundSize: `${24 * c.zoom}px ${24 * c.zoom}px`,
          backgroundPosition: `${size.width / 2 - c.centerX * c.zoom}px ${size.height / 2 - c.centerY * c.zoom}px`,
        }}
        onPointerDownCapture={(e) => {
          if (workspace) {
            e.currentTarget
              .closest(".spatial-board")
              ?.querySelectorAll<HTMLDetailsElement>(
                ".board-toolbar details[open], .board-selection details[open]",
              )
              .forEach((details) => {
                details.open = false;
              });
          }
          const target = e.target as HTMLElement;
          if (target.closest(BOARD_CHROME)) return;
          // Focus without scrolling or reframing the board underneath a click.
          // Keyboard focus still brings offscreen content into view below.
          if (!pan && e.button === 0) {
            const control = target.closest<HTMLElement>(
              "button, input, select, textarea, a[href], summary, [tabindex]",
            );
            if (control && !control.matches(":disabled")) {
              pointerFocus.current = true;
              try {
                control.focus({ preventScroll: true });
              } finally {
                pointerFocus.current = false;
              }
            }
          }
          if (!immersive && e.button === 2) {
            begin(e, "pan");
            return;
          }
          if (pan && !immersive && e.button === 0) begin(e, "pan");
        }}
        onPointerDown={(e) => {
          if (
            e.target === e.currentTarget &&
            e.button === 0 &&
            !immersive &&
            authoring &&
            drawingTool === "select" &&
            !pan &&
            !editArea
          )
            beginMarquee(e);
        }}
        onContextMenu={(e) => {
          if (!immersive && !(e.target as HTMLElement).closest(BOARD_CHROME))
            e.preventDefault();
        }}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onWheel={(e) => {
          if (
            fixed ||
            immersive ||
            (e.target as HTMLElement).closest(".board-item")
          )
            return;
          if (e.ctrlKey || e.metaKey) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (e.altKey)
            zoom(
              Math.exp(-e.deltaY * 0.002),
              e.clientX - r.left - size.width / 2,
              e.clientY - r.top - size.height / 2,
            );
          else if (pan)
            setCamera({
              ...c,
              centerX: c.centerX + e.deltaX / c.zoom,
              centerY: c.centerY + e.deltaY / c.zoom,
            });
        }}
        onKeyDown={(e) => {
          if (
            e.target === e.currentTarget &&
            !fixed &&
            !immersive &&
            ["+", "=", "-", "Home"].includes(e.key)
          ) {
            e.preventDefault();
            if (e.key === "Home") fitContent();
            else zoom(e.key === "-" ? 1 / 1.2 : 1.2);
          }
          if (
            e.target === e.currentTarget &&
            !fixed &&
            !immersive &&
            pan &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            e.preventDefault();
            setCamera({
              ...c,
              centerX:
                c.centerX +
                (e.key === "ArrowLeft"
                  ? -80
                  : e.key === "ArrowRight"
                    ? 80
                    : 0) /
                  c.zoom,
              centerY:
                c.centerY +
                (e.key === "ArrowUp" ? -80 : e.key === "ArrowDown" ? 80 : 0) /
                  c.zoom,
            });
          }
          if (e.key === "Escape" && gesture.current) {
            cancel();
            e.stopPropagation();
          } else if (
            e.key === "Escape" &&
            immersive &&
            (authoring || p.immersive.allowReturnToBoard) &&
            e.target === e.currentTarget
          )
            exit();
        }}
      >
        {!p.items.length && (
          <div className="board-empty">
            <h2>Your experiment starts here</h2>
            <p>Add a canvas, control, or instruction using Add component.</p>
          </div>
        )}
        {fixed && c.zoom < 1 && (
          <output className="board-readability">
            This fixed composition needs a wider viewport to keep controls
            readable.
            {authoring
              ? " Capture a smaller starting view."
              : " Open it on a larger screen or ask the author for a compact layout."}
          </output>
        )}
        {!immersive && (
          <div
            className="board-world"
            style={{
              transform: `translate(${size.width / 2 - c.centerX * c.zoom}px, ${size.height / 2 - c.centerY * c.zoom}px) scale(${c.zoom})`,
            }}
          >
            {separatedLabels.map((group) => (
              <span
                key={group.id}
                className="board-group-label"
                style={{
                  left: group.rect.x + 24,
                  top: group.rect.y - (authoring ? 36 : 0),
                }}
              >
                {group.label}
              </span>
            ))}
            {authoring && p.learnerArea && (
              <div
                className="board-area"
                style={{
                  left: area.x,
                  top: area.y,
                  width: area.width,
                  height: area.height,
                }}
              >
                <span>Learner view</span>
                {editArea && (
                  <>
                    <button
                      type="button"
                      className="board-area-move"
                      onPointerDown={(e) => begin(e, "area-move", "__area")}
                    >
                      Move learner boundary
                    </button>
                    <button
                      type="button"
                      className="board-area-resize"
                      aria-label="Resize learner boundary"
                      onPointerDown={(e) => begin(e, "area-resize", "__area")}
                    >
                      <SceneIcon name="resize" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {p.items.map((i, index) => {
          const layout = layouts.find((l) => l.id === i.layoutId);
          if (!layout) return null;
          const definition = document.nodes.find(
            (node) => node.id === layout.node,
          )?.definition;
          const baseRect = preview[i.id] ?? i.rect;
          const r =
              definition === "displays/Text"
                ? {
                    ...baseRect,
                    height: Math.max(
                      baseRect.height,
                      naturalHeights[i.id] ?? 0,
                    ),
                  }
                : baseRect,
            overlay = overlayFor(i.id),
            promoted = immersive === i.id;
          const hidden =
            !!immersive &&
            !promoted &&
            (!overlay ||
              (collapsed[overlay.id] ?? overlay.collapsedByDefault) ||
              (size.width < 700 && i.id !== activeCompact));
          const activeOverlays = overlays.filter(
            (o) => !(collapsed[o.id] ?? o.collapsedByDefault),
          );
          const compact = size.width < 700;
          const overlayItems = p.items.filter((item) =>
            activeOverlays.some(
              (o) =>
                o.contentItemIds.includes(item.id) &&
                (compact || o.anchor === overlay?.anchor),
            ),
          );
          const count = compact ? 1 : Math.max(1, overlayItems.length);
          const overlayIndex = compact
            ? 0
            : overlayItems.findIndex((item) => item.id === i.id);
          const bottom = compact || overlay?.anchor === "bottom";
          const overlayStyle = overlay
            ? {
                top: `${(compact && expandControls ? 40 : bottom ? 64 : 4) + overlayIndex * ((bottom ? 32 : 88) / count)}%`,
                height: `${(compact && expandControls ? 56 : bottom ? 30 : 84) / count}%`,
              }
            : {
                left:
                  !compact && activeOverlays.some((o) => o.anchor === "left")
                    ? "min(344px, 38%)"
                    : 0,
                right:
                  !compact && activeOverlays.some((o) => o.anchor === "right")
                    ? "min(344px, 38%)"
                    : 0,
                bottom:
                  activeOverlays.length &&
                  (compact || activeOverlays.some((o) => o.anchor === "bottom"))
                    ? compact && expandControls
                      ? "62%"
                      : "38%"
                    : 0,
              };
          const position =
            immersive && (promoted || overlay)
              ? overlayStyle
              : {
                  left: size.width / 2 + (r.x - c.centerX) * c.zoom,
                  top: size.height / 2 + (r.y - c.centerY) * c.zoom,
                  width: r.width,
                  height: r.height,
                  transform: `scale(${c.zoom})`,
                  zIndex: i.zIndex + 1,
                  clipPath: authoring
                    ? undefined
                    : `inset(${Math.max(0, area.y - r.y)}px ${Math.max(0, r.x + r.width - area.x - area.width)}px ${Math.max(0, r.y + r.height - area.y - area.height)}px ${Math.max(0, area.x - r.x)}px)`,
                };
          return (
            <section
              key={i.id}
              onFocus={(event) => {
                if (immersive || fixed || pointerFocus.current) return;
                if (!authoring) {
                  const viewportBounds =
                    viewport.current?.getBoundingClientRect();
                  if (!viewportBounds) return;
                  // Reflowed views may choose native vertical scrolling. Let the
                  // browser reveal focused controls without a second camera pan.
                  if (
                    viewport.current &&
                    getComputedStyle(viewport.current).overflowY === "auto"
                  )
                    return;
                  const target = event.target as HTMLElement;
                  // Native top-layer dialogs have viewport coordinates, not board coordinates.
                  // Focusing their fields must never pan the lesson behind the modal.
                  if (target.closest("dialog[open]")) return;
                  const bounds = target.getBoundingClientRect();
                  const margin = 24;
                  const host = viewport.current?.closest(
                    ".experiment-workspace",
                  );
                  const header = host
                    ?.querySelector(".recipe-lesson > header")
                    ?.getBoundingClientRect();
                  const composer = host
                    ?.querySelector(".workspace-composer")
                    ?.getBoundingClientRect();
                  const navigation = host
                    ?.querySelector(".board-camera-tools")
                    ?.getBoundingClientRect();
                  const overlapsTarget = (rect: DOMRect | undefined) =>
                    rect &&
                    rect.left < bounds.right &&
                    rect.right > bounds.left;
                  const workspaceTools = host
                    ?.querySelector(".board-workspace-tools")
                    ?.getBoundingClientRect();
                  const usableTop = Math.max(
                    viewportBounds.top,
                    header && overlapsTarget(header)
                      ? header.bottom
                      : viewportBounds.top,
                    workspaceTools && overlapsTarget(workspaceTools)
                      ? workspaceTools.bottom
                      : viewportBounds.top,
                  );
                  const usableBottom = Math.min(
                    viewportBounds.bottom,
                    composer && overlapsTarget(composer)
                      ? composer.top
                      : viewportBounds.bottom,
                    navigation &&
                      overlapsTarget(navigation) &&
                      navigation.height > 0
                      ? navigation.top
                      : viewportBounds.bottom,
                  );
                  const dx =
                    bounds.width > viewportBounds.width - margin * 2 ||
                    bounds.left < viewportBounds.left + margin
                      ? bounds.left - viewportBounds.left - margin
                      : Math.max(
                          0,
                          bounds.right - viewportBounds.right + margin,
                        );
                  const dy =
                    bounds.height > usableBottom - usableTop - margin * 2 ||
                    bounds.top < usableTop + margin
                      ? bounds.top - usableTop - margin
                      : Math.max(0, bounds.bottom - usableBottom + margin);
                  if (dx || dy)
                    setCamera({
                      ...c,
                      centerX: c.centerX + dx / c.zoom,
                      centerY: c.centerY + dy / c.zoom,
                    });
                  return;
                }
                const left = size.width / 2 + (r.x - c.centerX) * c.zoom,
                  top = size.height / 2 + (r.y - c.centerY) * c.zoom;
                if (
                  left < 0 ||
                  top < 0 ||
                  left + r.width * c.zoom > size.width ||
                  top + r.height * c.zoom > size.height
                ) {
                  const framed = fit(
                    r,
                    Math.max(1, size.width - 48),
                    Math.max(1, size.height - 48),
                  );
                  setCamera({ ...framed, zoom: Math.min(c.zoom, framed.zoom) });
                }
              }}
              data-board-id={i.id}
              data-tools-visible={
                authoring ? selection.includes(i.id) : activeItem === i.id
              }
              data-board-scene={
                !!layout.node &&
                document.nodes.some(
                  (n) =>
                    n.id === layout.node &&
                    (n.definition.startsWith("canvases/") ||
                      n.definition.startsWith("appearance/")),
                )
              }
              data-board-leaf={!layout.children.length}
              data-board-component={definition}
              data-board-authoring={!!authoring}
              data-board-index={index}
              tabIndex={authoring || layout.node ? 0 : -1}
              aria-label={title(i.id)}
              hidden={hidden}
              className={`board-item ${authoring && outsideLearnerView(p, r) ? "is-outside-view" : ""} ${selection.includes(i.id) && authoring ? "is-selected" : ""} ${promoted ? "is-immersive" : ""} ${overlay ? `is-overlay anchor-${overlay.anchor}` : ""}`}
              style={position}
            >
              {authoring && !immersive && (
                <div className="board-item-tools">
                  <button
                    type="button"
                    aria-label={`Move ${title(i.id)}`}
                    aria-pressed={selection.includes(i.id)}
                    onPointerDown={(e) => begin(e, "move", i.id)}
                    onClick={(e) => {
                      if (e.detail === 0) {
                        const ids = p.groups.find((g) =>
                          g.members.includes(i.id),
                        )?.members ?? [i.id];
                        setSelection(
                          e.shiftKey
                            ? [...new Set([...selection, ...ids])]
                            : ids,
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      const delta: Record<string, [number, number]> = {
                        ArrowLeft: [-1, 0],
                        ArrowRight: [1, 0],
                        ArrowUp: [0, -1],
                        ArrowDown: [0, 1],
                      };
                      if (delta[e.key] && !i.locked) {
                        e.preventDefault();
                        const [x, y] = delta[e.key];
                        update((n) => {
                          const ids = selection.includes(i.id)
                            ? selection
                            : (p.groups.find((g) => g.members.includes(i.id))
                                ?.members ?? [i.id]);
                          for (const item of n.items.filter(
                            (item) => ids.includes(item.id) && !item.locked,
                          )) {
                            item.rect.x += x * (e.shiftKey ? 10 : 1);
                            item.rect.y += y * (e.shiftKey ? 10 : 1);
                          }
                        }, "Item moved");
                      }
                    }}
                  >
                    <SceneIcon name="move" /> <span>{title(i.id)}</span>
                    {i.locked ? " · Locked" : ""}
                  </button>
                  {layout.node && onEdit && (
                    <button
                      type="button"
                      className="board-item-edit"
                      aria-label={`Edit ${title(i.id)}`}
                      onClick={() => {
                        if (layout.node) onEdit(layout.node);
                      }}
                    >
                      <SceneIcon name="edit" />
                    </button>
                  )}
                  {supportsScene(document, i.layoutId) && (
                    <SceneIconButton
                      icon="expand"
                      label="Expand scene"
                      className="board-item-expand-header"
                      onClick={(event) => {
                        returnFocus.current = event.currentTarget;
                        setImmersive(i.id);
                      }}
                    />
                  )}
                </div>
              )}
              {!authoring &&
                !immersive &&
                supportsScene(document, i.layoutId) && (
                  <SceneIconButton
                    icon="expand"
                    label="Expand scene"
                    className="board-expand"
                    onClick={(e) => {
                      returnFocus.current = e.currentTarget;
                      setImmersive(i.id);
                    }}
                  />
                )}
              <div className="board-content">
                <ContentBoundary>{render(layout)}</ContentBoundary>
              </div>
              {authoring && !immersive && !i.locked && (
                <button
                  type="button"
                  className="board-resize"
                  aria-label={`Resize ${title(i.id)}`}
                  onPointerDown={(e) => begin(e, "resize", i.id)}
                  onClick={(e) => {
                    if (!e.detail) {
                      setSelection([i.id]);
                      setSettings(true);
                    }
                  }}
                >
                  <SceneIcon name="resize" />
                </button>
              )}
            </section>
          );
        })}
        {marquee && (
          <div
            className="board-marquee"
            aria-hidden="true"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.width,
              height: marquee.height,
            }}
          />
        )}
        <DrawingEditor
          presentation={p}
          camera={c}
          size={size}
          viewport={viewport}
          authoring={authoring}
          immersive={!!immersive}
          learnerArea={area}
          selection={selection}
          preview={preview}
          onPreviewChange={setPreview}
          onSelect={setSelection}
          onCommit={(next, group, action) => {
            if (conversion) setConversion(next);
            else onChange?.(next, group, action);
          }}
          tool={drawingTool}
          onToolChange={setDrawingTool}
          onPanTool={setPan}
          onAction={(action, ids) => {
            const items = p.items.filter((item) => ids.includes(item.id));
            onAction?.(
              action,
              items.flatMap((item) => (item.layoutId ? [item.layoutId] : [])),
              ids,
            );
          }}
        />
      </div>
      {authoring &&
        selected.length > 0 &&
        !immersive &&
        !(selected.length === 1 && isDrawingItem(selected[0])) && (
          <div className="board-selection">
            <strong>{selected.length} selected</strong>
            <button type="button" onClick={() => setSelection([])}>
              <span aria-hidden="true">×</span>
              <span className="board-sr">Clear selection</span>
            </button>
            {onAction &&
              (["copy", "duplicate", "delete"] as const).map((action) => (
                <button
                  type="button"
                  key={action}
                  onClick={() =>
                    onAction(
                      action,
                      selected.flatMap((i) => (i.layoutId ? [i.layoutId] : [])),
                      selected.map((i) => i.id),
                    )
                  }
                >
                  {action === "copy"
                    ? "Copy"
                    : action === "duplicate"
                      ? "Duplicate"
                      : "Delete"}
                </button>
              ))}
            <details className="board-selection-actions" data-compact="true">
              <summary aria-label="Selection actions">More</summary>
              <div>
                {onAction &&
                  selected.some((i) => {
                    const layout = layouts.find((l) => l.id === i.layoutId);
                    return (
                      !i.locked && layout && canSeparateLayout(document, layout)
                    );
                  }) && (
                    <button
                      type="button"
                      onClick={() => {
                        onAction(
                          "separate",
                          selected
                            .filter((i) => {
                              const layout = layouts.find(
                                (l) => l.id === i.layoutId,
                              );
                              return (
                                !i.locked &&
                                layout &&
                                canSeparateLayout(document, layout)
                              );
                            })
                            .flatMap((i) => (i.layoutId ? [i.layoutId] : [])),
                        );
                        setSelection([]);
                      }}
                    >
                      Arrange contents separately
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() =>
                    update((n) => {
                      n.items
                        .filter((i) => selection.includes(i.id))
                        .forEach((i) => {
                          i.locked = !selected.every((i) => i.locked);
                        });
                    })
                  }
                >
                  {selected.every((i) => i.locked) ? "Unlock" : "Lock"}{" "}
                  placement
                </button>
                {(
                  [
                    ["front", "Bring to front"],
                    ["back", "Send to back"],
                    ["forward", "Bring forward"],
                    ["backward", "Send backward"],
                  ] as const
                ).map(([action, label]) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() =>
                      update((n) => reorderBoardItems(n, selection, action))
                    }
                  >
                    {label}
                  </button>
                ))}
                {selected.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        update((n) => {
                          const x = Math.min(...selected.map((i) => i.rect.x));
                          n.items
                            .filter(
                              (i) => selection.includes(i.id) && !i.locked,
                            )
                            .forEach((i) => {
                              i.rect.x = x;
                            });
                        })
                      }
                    >
                      Align left
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        update((n) => {
                          const items = n.items
                            .filter(
                              (i) => selection.includes(i.id) && !i.locked,
                            )
                            .sort((a, b) => a.rect.x - b.rect.x);
                          if (items.length < 3) return;
                          const first = items[0].rect.x,
                            last = items[items.length - 1].rect.x;
                          items.forEach((item, index) => {
                            item.rect.x =
                              first +
                              ((last - first) * index) / (items.length - 1);
                          });
                        })
                      }
                    >
                      Distribute horizontally
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        update((n) => {
                          n.groups = n.groups.filter(
                            (g) =>
                              !g.members.some((id) => selection.includes(id)),
                          );
                          n.groups.push({
                            id: `board-group/${crypto.randomUUID()}`,
                            label: "Content group",
                            members: selection,
                          });
                        })
                      }
                    >
                      Group
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={
                    !p.groups.some((g) =>
                      g.members.some((id) => selection.includes(id)),
                    )
                  }
                  onClick={() =>
                    update((n) => {
                      n.groups = n.groups.filter(
                        (g) => !g.members.some((id) => selection.includes(id)),
                      );
                    })
                  }
                >
                  Ungroup
                </button>
              </div>
            </details>
            <details className="board-placement-menu">
              <summary aria-label="Position and size">Placement</summary>
              {selected.map((i) => (
                <Geometry
                  key={i.id}
                  label={title(i.id)}
                  rect={i.rect}
                  aspectRatio={i.aspectRatio}
                  allowAspectRatio
                  minimum={boardItemMinimum(document, i.layoutId)}
                  disabled={i.locked}
                  onApply={(r, aspectRatio) =>
                    update((n) => {
                      const item = n.items.find((item) => item.id === i.id);
                      if (item) {
                        item.rect = r;
                        if (aspectRatio) item.aspectRatio = aspectRatio;
                        else delete item.aspectRatio;
                      }
                    })
                  }
                />
              ))}
            </details>
          </div>
        )}
      {!immersive && (
        <p className="board-help">
          {authoring
            ? "Drag empty space to select · Shift adds to selection · Hold right-click to pan"
            : "Drag empty space to pan"}{" "}
          · Alt + wheel to zoom · Use content directly
          {authoring
            ? " · Shift + move handle to select several · Arrow keys on a move handle to position"
            : ""}
        </p>
      )}
      <output className="board-sr">{announcement}</output>
    </section>
  );
}
function Geometry({
  maxSize = 10000,
  label,
  applyLabel = "Apply placement",
  rect,
  aspectRatio,
  allowAspectRatio = false,
  minimum = { width: 160, height: 160 },
  onApply,
  disabled,
}: {
  maxSize?: number;
  label: string;
  applyLabel?: string;
  rect: Rect;
  aspectRatio?: number;
  allowAspectRatio?: boolean;
  minimum?: { width: number; height: number };
  onApply: (r: Rect, aspectRatio?: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(rect);
  const [ratio, setRatio] = useState(
    aspectRatio ? String(aspectRatio) : "free",
  );
  useEffect(() => {
    setDraft(rect);
    setRatio(aspectRatio ? String(aspectRatio) : "free");
  }, [rect, aspectRatio]);
  const parsedRatio = ratio === "free" ? undefined : Number(ratio);
  const setDimension = (key: "width" | "height", value: number) =>
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (parsedRatio)
        if (key === "width") next.height = Math.round(value / parsedRatio);
        else next.width = Math.round(value * parsedRatio);
      return next;
    });
  return (
    <form
      key={JSON.stringify(rect)}
      className="board-geometry"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft, parsedRatio);
      }}
    >
      <strong>{label}</strong>
      {(["x", "y", "width", "height"] as const).map((k) => (
        <label key={k}>
          {k}
          <input
            required
            type="number"
            name={k}
            value={draft[k]}
            min={
              k === "width"
                ? minimum.width
                : k === "height"
                  ? minimum.height
                  : -999000
            }
            max={k === "width" || k === "height" ? maxSize : 999000}
            disabled={disabled}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (k === "width" || k === "height") setDimension(k, value);
              else setDraft((current) => ({ ...current, [k]: value }));
            }}
          />
        </label>
      ))}
      {allowAspectRatio && (
        <label>
          Aspect ratio
          <select
            aria-label="Aspect ratio"
            value={ratio}
            disabled={disabled}
            onChange={(event) => {
              const value = event.target.value;
              setRatio(value);
              if (value !== "free") {
                const nextRatio = Number(value);
                setDraft((current) => ({
                  ...current,
                  height: Math.max(
                    minimum.height,
                    Math.round(current.width / nextRatio),
                  ),
                }));
              }
            }}
          >
            <option value="free">Free</option>
            {aspectRatio &&
              ![1, 4 / 3, 3 / 2, 16 / 9, 3 / 4].includes(aspectRatio) && (
                <option value={aspectRatio}>
                  Current ({aspectRatio.toFixed(2)}:1)
                </option>
              )}
            <option value="1">Square (1:1)</option>
            <option value={4 / 3}>Standard (4:3)</option>
            <option value={3 / 2}>Wide (3:2)</option>
            <option value={16 / 9}>Cinema (16:9)</option>
            <option value={3 / 4}>Portrait (3:4)</option>
          </select>
        </label>
      )}
      <button type="submit" disabled={disabled}>
        {applyLabel}
      </button>
    </form>
  );
}

class ContentBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert">
        <h3>This content could not load</h3>
        <p>Your experiment is still available. Try loading this view again.</p>
        <button type="button" onClick={() => this.setState({ failed: false })}>
          Retry content
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
