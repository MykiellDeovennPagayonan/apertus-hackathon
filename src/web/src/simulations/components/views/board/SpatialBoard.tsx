"use client";
import {
  Component,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type BoardPresentation,
  boardLayouts,
  type Camera,
  clamp,
  constrain,
  convertToBoard,
  extent,
  fit,
  type Rect,
  supportsOverlay,
  supportsScene,
  zoomAt,
} from "../../../runtime/authoring/board";
import type {
  AuthoredDocument,
  Layout,
} from "../../../runtime/authoring/types";
import "./board.css";
export function SpatialBoard({
  document,
  authoring,
  workspace,
  onEdit,
  actions,
  onChange,
  onAction,
  render,
}: {
  document: AuthoredDocument;
  authoring?: boolean;
  workspace?: boolean;
  onEdit?: (id: string) => void;
  actions?: ReactNode;
  onChange?: (p: AuthoredDocument["presentation"]) => void;
  onAction?: (
    action: "copy" | "paste" | "duplicate" | "delete",
    layoutIds: string[],
  ) => void;
  render: (layout: Layout) => ReactNode;
}) {
  const persisted =
    document.presentation?.mode === "board" ? document.presentation : null;
  const [conversion, setConversion] = useState<BoardPresentation | null>(null);
  const p = persisted ?? conversion;
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [camera, setCamera] = useState<Camera | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, Rect>>({});
  const [pan, setPan] = useState(false),
    [snap, setSnap] = useState(true);
  const [editArea, setEditArea] = useState(false);
  const [settings, setSettings] = useState(false),
    [search, setSearch] = useState("");
  const settingsPanel = useRef<HTMLElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (settings) settingsPanel.current?.focus();
  }, [settings]);
  const closeSettings = () => {
    setSettings(false);
    settingsButton.current?.focus();
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
    rects: Record<string, Rect>;
  } | null>(null);
  useEffect(() => {
    const cancelDrag = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !gesture.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (gesture.current.mode === "pan") setCamera(gesture.current.camera);
      gesture.current = null;
      pinch.current = null;
      pointers.current.clear();
      setPreview({});
    };
    window.addEventListener("keydown", cancelDrag, true);
    return () => window.removeEventListener("keydown", cancelDrag, true);
  }, []);
  const lastItems = useRef(p?.items.map((i) => i.id) ?? []);
  useEffect(() => {
    if (!p || !authoring) return;
    const added = p.items.find((i) => !lastItems.current.includes(i.id));
    lastItems.current = p.items.map((i) => i.id);
    if (added)
      setCamera({
        centerX: added.rect.x + added.rect.width / 2,
        centerY: added.rect.y + added.rect.height / 2,
        zoom: 1,
      });
  }, [p, authoring]);
  const hasBoard = !!p;
  useEffect(() => {
    if (!hasBoard || !viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    const element = viewport.current;
    observer.observe(element);
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
  }, [hasBoard]);
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
  const area =
    preview.__area ?? p.learnerArea ?? extent(p.items.map((i) => i.rect));
  const initial = fit(p.startView, size.width, size.height);
  if (authoring) initial.zoom = Math.min(1, initial.zoom);
  const base = camera ?? initial;
  const fixed = !authoring && p.navigation.mode === "fixed";
  const c = authoring
    ? base
    : constrain(
        fixed
          ? initial
          : {
              ...base,
              zoom: clamp(
                base.zoom,
                p.navigation.minZoom,
                p.navigation.maxZoom,
              ),
            },
        area,
        size.width,
        size.height,
      );
  const layouts = boardLayouts(document);
  const title = (id: string) => {
    const i = p.items.find((i) => i.id === id);
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
  const selected = p.items.filter((i) => selection.includes(i.id));
  const cancel = () => {
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
    if (event.button !== 0 || (mode === "pan" && fixed)) return;
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
    if (id && id !== "__area") {
      const group = p.groups.find((g) => g.members.includes(id));
      ids = event.shiftKey
        ? [...new Set([...selection, ...(group?.members ?? [id])])]
        : selection.includes(id)
          ? selection
          : (group?.members ?? [id]);
      setSelection(ids);
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
      rects,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
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
          Object.entries(g.rects).map(([id, r]) => [
            id,
            g.mode === "move" || g.mode === "area-move"
              ? {
                  ...r,
                  x: clamp(r.x + round(dx), -999000, 999000),
                  y: clamp(r.y + round(dy), -999000, 999000),
                }
              : {
                  ...r,
                  width: clamp(round(r.width + dx), 240, 10000),
                  height: clamp(round(r.height + dy), 160, 10000),
                },
          ]),
        ),
      );
    }
  };
  const finish = (event: PointerEvent) => {
    const g = gesture.current;
    if (
      authoring &&
      !pan &&
      g?.mode === "pan" &&
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
      className={`spatial-board ${workspace && !conversion ? "is-workspace" : ""} ${immersive ? "is-scene" : ""} ${size.width < 700 ? "is-compact" : ""}`}
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
            <div
              className="board-camera-tools"
              role="toolbar"
              aria-label="Board navigation"
            >
              <button
                type="button"
                disabled={fixed}
                aria-pressed={pan}
                onClick={() => setPan(!pan)}
              >
                Pan
              </button>
              <button
                type="button"
                disabled={fixed}
                aria-label="Zoom out"
                onClick={() => zoom(1 / 1.2)}
              >
                −
              </button>
              <output aria-label="Board zoom">
                {Math.round(c.zoom * 100)}%
              </output>
              <button
                type="button"
                disabled={fixed}
                aria-label="Zoom in"
                onClick={() => zoom(1.2)}
              >
                +
              </button>
              <button type="button" disabled={fixed} onClick={fitContent}>
                Fit content
              </button>
              <details className="board-navigation-help">
                <summary aria-label="Board navigation help">?</summary>
                <div>
                  <button type="button" onClick={() => setCamera(null)}>
                    Starting view
                  </button>
                  <p>
                    Drag empty space to pan. Use Alt + wheel or pinch to zoom.
                    Interact with content directly.
                  </p>
                  <p>
                    Drag a component heading to move it. Shift + click headings
                    to select several. Use arrow keys on a heading to position
                    it.
                  </p>
                  {actions}
                </div>
              </details>
            </div>
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
                  onClick={() =>
                    settings ? closeSettings() : setSettings(true)
                  }
                >
                  Board settings
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {authoring && editArea && (
        <div className="board-area-banner">
          <strong>Edit learner area</strong>
          <span>
            Drag the boundary handles or use numeric fields in Board settings.
            Escape cancels a drag.
          </span>
          <button type="button" onClick={() => setEditArea(false)}>
            Done editing area
          </button>
        </div>
      )}
      {authoring && settings && (
        <section
          className="board-settings"
          ref={settingsPanel}
          aria-label="Board settings"
          tabIndex={-1}
        >
          <div className="board-settings-heading">
            <strong>Board settings</strong>
            <button
              type="button"
              aria-label="Close board settings"
              onClick={closeSettings}
            >
              ×
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={snap}
              onChange={(e) => setSnap(e.target.checked)}
            />{" "}
            Snap to grid
          </label>
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
              })
            }
          >
            Capture starting view
          </button>
          <button
            type="button"
            onClick={() =>
              update((n) => {
                n.learnerArea = extent(n.items.map((i) => i.rect));
              })
            }
          >
            Set learner area from content
          </button>
          {p.learnerArea && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditArea(true);
                  setSelection([]);
                  setSettings(false);
                }}
              >
                Edit learner area on board
              </button>
              <button
                type="button"
                onClick={() =>
                  update((n) => {
                    delete n.learnerArea;
                  })
                }
              >
                Use automatic area
              </button>
              <Geometry
                label="Learner area"
                maxSize={1000000}
                rect={p.learnerArea}
                onApply={(r) =>
                  update((n) => {
                    n.learnerArea = r;
                  })
                }
              />
            </>
          )}
          {p.learnerArea &&
            p.items.some(
              (i) =>
                i.rect.x < area.x ||
                i.rect.y < area.y ||
                i.rect.x + i.rect.width > area.x + area.width ||
                i.rect.y + i.rect.height > area.y + area.height,
            ) && (
              <p role="alert">
                Some content is outside the learner area. Enlarge the area with
                “Set learner area from content” before sharing.
              </p>
            )}
          {p.navigation.mode === "fixed" && (
            <p>
              Fixed views keep controls at their original readable size. Preview
              at your smallest target screen size and capture a smaller starting
              frame if needed.
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
          <details>
            <summary>Zoom limits</summary>
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
                  if (e.target.value) n.immersive.sceneItemId = e.target.value;
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
              <details key={scene.id}>
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
                        const o = n.immersive.overlays.find(
                          (o) => o.sceneItemId === scene.id,
                        );
                        if (o)
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
        </section>
      )}
      <div
        ref={viewport}
        role="application"
        aria-label="Board workspace"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The board has keyboard pan and cancellation commands.
        tabIndex={0}
        className={`board-viewport ${pan ? "is-panning" : ""} ${immersive && overlays.some((o) => !(collapsed[o.id] ?? o.collapsedByDefault)) ? "has-overlays" : ""}`}
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
          if (pan && !immersive) begin(e, "pan");
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget && !immersive) begin(e, "pan");
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
          else
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
            {authoring && p.learnerArea && (editArea || !workspace) && (
              <div
                className="board-area"
                style={{
                  left: area.x,
                  top: area.y,
                  width: area.width,
                  height: area.height,
                }}
              >
                <span>Learner area</span>
                {editArea && (
                  <>
                    <button
                      type="button"
                      className="board-area-move"
                      onPointerDown={(e) => begin(e, "area-move", "__area")}
                    >
                      Move learner area
                    </button>
                    <button
                      type="button"
                      className="board-area-resize"
                      aria-label="Resize learner area"
                      onPointerDown={(e) => begin(e, "area-resize", "__area")}
                    >
                      ↘
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
          const r = preview[i.id] ?? i.rect,
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
              onFocus={() => {
                if (immersive || fixed) return;
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
              data-board-leaf={!layout.children.length}
              data-board-index={index}
              tabIndex={-1}
              aria-label={title(i.id)}
              hidden={hidden}
              className={`board-item ${selection.includes(i.id) && authoring ? "is-selected" : ""} ${promoted ? "is-immersive" : ""} ${overlay ? `is-overlay anchor-${overlay.anchor}` : ""}`}
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
                    ⠿ {title(i.id)}
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
                      ✎
                    </button>
                  )}
                </div>
              )}
              {!immersive && supportsScene(document, i.layoutId) && (
                <button
                  type="button"
                  className="board-expand"
                  onClick={(e) => {
                    returnFocus.current = e.currentTarget;
                    setImmersive(i.id);
                  }}
                >
                  Expand scene
                </button>
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
                  ↘
                </button>
              )}
            </section>
          );
        })}
      </div>
      {authoring && selected.length > 0 && !immersive && (
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
                    selected.map((i) => i.layoutId),
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
                {selected.every((i) => i.locked) ? "Unlock" : "Lock"} placement
              </button>
              <button
                type="button"
                onClick={() =>
                  update((n) => {
                    const top = Math.max(...n.items.map((i) => i.zIndex));
                    n.items
                      .filter((i) => selection.includes(i.id))
                      .forEach((i, j) => {
                        i.zIndex = top + j + 1;
                      });
                  })
                }
              >
                Bring to front
              </button>
              {selected.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      update((n) => {
                        const x = Math.min(...selected.map((i) => i.rect.x));
                        n.items
                          .filter((i) => selection.includes(i.id) && !i.locked)
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
                          .filter((i) => selection.includes(i.id) && !i.locked)
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
                disabled={i.locked}
                onApply={(r) =>
                  update((n) => {
                    const item = n.items.find((item) => item.id === i.id);
                    if (item) item.rect = r;
                  })
                }
              />
            ))}
          </details>
        </div>
      )}
      {!immersive && (
        <p className="board-help">
          Drag empty space to pan · Alt + wheel to zoom · Use content directly
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
  rect,
  onApply,
  disabled,
}: {
  maxSize?: number;
  label: string;
  rect: Rect;
  onApply: (r: Rect) => void;
  disabled?: boolean;
}) {
  return (
    <form
      key={JSON.stringify(rect)}
      className="board-geometry"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const r = Object.fromEntries(
          ["x", "y", "width", "height"].map((k) => [k, Number(data.get(k))]),
        ) as Rect;
        onApply(r);
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
            defaultValue={rect[k]}
            min={k === "width" || k === "height" ? 160 : -999000}
            max={k === "width" || k === "height" ? maxSize : 999000}
            disabled={disabled}
          />
        </label>
      ))}
      <button type="submit" disabled={disabled}>
        Apply placement
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
