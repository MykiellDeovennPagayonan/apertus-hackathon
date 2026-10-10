import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ConstructionUpdate } from "../../../lib/planner/construction";
import { requireRecord } from "../../runtime/records";
import { ConnectionNode } from "../ConnectionNode";
import { ConnectionViewport } from "../ConnectionViewport";
import { type ExperimentDocument, validateDocument } from "../document";
import {
  connectDocument,
  disconnectDocument,
  documentConnectionError,
} from "../editor/connectionCommands";
import {
  type ComponentClipboard,
  deleteComponents,
  expandSelection,
  groupComponents,
  pasteComponents,
  ungroupComponents,
} from "../editor/selection";
import { compositionGraph, type Endpoint } from "../graph/deriveGraph";
import { type GraphWire, portPoint } from "../graph/types";
import { isTextEditing } from "../history/entries";
import { useGraphMotion } from "./useGraphMotion";
import "../connections.css";
import { InputEditor } from "./InputEditor";

type Edit = (
  change: (d: ExperimentDocument) => void,
  group?: string | null,
  action?: string,
) => boolean;
let componentClipboard: ComponentClipboard | null = null;
let pasteCount = 0;

export function CompositionGraph({
  doc,
  constructing = false,
  construction,
  selected,
  onSelect,
  onAdd,
  edit,
  active,
  reveal,
  onZoom,
  onSaveComposite,
  onSelectionChange,
}: {
  onSaveComposite?: (ids: string[]) => void;
  onSelectionChange?: (ids: string[]) => void;
  doc: ExperimentDocument;
  constructing?: boolean;
  construction?: ConstructionUpdate | null;
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (category: string, target?: string) => void;
  edit: Edit;
  onZoom: (zoom: number) => void;
  active: boolean;
  reveal?: {
    id: string;
    sequence: number;
  };
}) {
  const [editingInput, setEditingInput] = useState<Endpoint | null>(null);
  const [moving, setMoving] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const movingRef = useRef(moving);
  const [selection, setSelection] = useState<string[]>([]);
  useEffect(() => {
    onSelectionChange?.(expandSelection(doc, selection));
  }, [selection, doc, onSelectionChange]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    right: number;
    bottom: number;
  } | null>(null);
  const marqueeDrag = useRef<{
    origin: { x: number; y: number };
    previous: string[];
  } | null>(null);
  const [source, setSource] = useState<Endpoint | null>(null);
  const [ghost, setGhost] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [wireSelection, setWireSelection] = useState<GraphWire | null>(null);
  const [fit, setFit] = useState(0);
  const [jump, setJump] = useState<{
    id: string;
    sequence: number;
  }>();
  useEffect(() => {
    setJump(reveal);
  }, [reveal]);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    positions: Record<string, { x: number; y: number }>;
    ids: string[];
    moved: boolean;
  } | null>(null);
  const nodeClickSuppressed = useRef(false);
  const portDrag = useRef<{
    source: Endpoint;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const portClickSuppressed = useRef(false);
  const surface = useRef<HTMLDivElement>(null);
  const graph = compositionGraph(doc);
  const blocks = useGraphMotion(
    graph.blocks.map((b) => ({ ...b, ...(moving[b.id] ?? {}) })),
    constructing,
  );
  const [follow, setFollow] = useState(true);
  const wasConstructing = useRef(false);
  useEffect(() => {
    if (wasConstructing.current && !constructing && follow)
      setFit((value) => value + 1);
    wasConstructing.current = constructing;
  }, [constructing, follow]);
  const phase = construction?.phase;
  const sequence = construction?.sequence;
  useEffect(() => {
    if (constructing && follow && phase === "checking" && sequence)
      setFit((value) => value + 1);
  }, [constructing, follow, phase, sequence]);
  useEffect(() => {
    if (constructing) {
      setFollow(true);
      setSelection([]);
      setSource(null);
      setEditingInput(null);
      setContextMenu(null);
    }
  }, [constructing]);
  const wires = graph.wires;
  const node = (id: string) => blocks.find((b) => b.id === id);
  const graphSelection = (ids: string[]) =>
    doc.authored ? ids : expandSelection(doc, ids);
  const selectedIds = graphSelection(selection).filter((id) =>
    blocks.some((b) => b.id === id),
  );
  const height = (id: string) =>
    Array.from(
      surface.current?.querySelectorAll<HTMLElement>("[data-node-id]") ?? [],
    ).find((n) => n.dataset.nodeId === id)?.offsetHeight ?? 250;
  const worldPoint = (x: number, y: number) => {
    const rect = surface.current
      ?.querySelector(".builder-canvas")
      ?.getBoundingClientRect();
    return {
      x: (x - (rect?.left ?? 0)) / doc.editor.zoom,
      y: (y - (rect?.top ?? 0)) / doc.editor.zoom,
    };
  };
  const select = (id: string, additive = false) => {
    const members = graphSelection([id]);
    setSelection(
      additive
        ? selectedIds.includes(id)
          ? selectedIds.filter((v) => !members.includes(v))
          : [...new Set([...selectedIds, ...members])]
        : members,
    );
    setContextMenu(null);
    setSource(null);
    setWireSelection(null);
  };
  const run = (label: string, change: (d: ExperimentDocument) => void) =>
    !constructing &&
    edit(
      (d) => {
        change(d);
        validateDocument(d);
      },
      null,
      label,
    );
  const copy = () => {
    if (!selectedIds.length) return;
    componentClipboard = { document: structuredClone(doc), ids: selectedIds };
    pasteCount = 0;
    setFeedback(
      `Copied ${selectedIds.length} component${selectedIds.length === 1 ? "" : "s"}`,
    );
    setContextMenu(null);
  };
  const paste = () => {
    if (!componentClipboard) return;
    const clipboard = componentClipboard;
    let ids: string[] = [];
    if (
      run("Paste components", (d) => {
        ids = pasteComponents(d, clipboard, 40 * (pasteCount + 1));
      })
    ) {
      pasteCount++;
      setSelection(ids);
      setWireSelection(null);
      if (ids[0]) setJump({ id: ids[0], sequence: (jump?.sequence ?? 0) + 1 });
      setFeedback(`Pasted ${ids.length} components`);
    }
    setContextMenu(null);
  };
  const remove = () => {
    if (!selectedIds.length) return;
    if (
      run(
        `Delete ${selectedIds.length} component${selectedIds.length === 1 ? "" : "s"}`,
        (d) => deleteComponents(d, selectedIds),
      )
    ) {
      setSelection([]);
      setFeedback("");
    }
    setContextMenu(null);
  };
  const removeConnection = (wire = wireSelection) => {
    if (!wire) return;
    if (run("Delete connection", (d) => disconnectDocument(d, wire))) {
      setWireSelection(null);
      setFeedback("");
      setContextMenu(null);
      surface.current
        ?.querySelector<HTMLElement>(".builder-canvas-scroll")
        ?.focus({ preventScroll: true });
    }
  };
  const selectConnection = (wire: GraphWire) => {
    setWireSelection(wire);
    setSelection([]);
    setSource(null);
    setGhost(null);
    setFeedback("");
    setContextMenu(null);
  };
  const group = () => {
    if (selectedIds.length < 2) return;
    run("Create group", (d) => groupComponents(d, selectedIds));
    setContextMenu(null);
  };
  const ungroup = () => {
    run("Ungroup components", (d) => ungroupComponents(d, selectedIds));
    setContextMenu(null);
  };
  const startMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (constructing || event.button !== 0) return;
    setWireSelection(null);
    nodeClickSuppressed.current = false;
    const ids = selectedIds.includes(id)
      ? selectedIds
      : graphSelection(event.shiftKey ? [...selectedIds, id] : [id]);
    drag.current = {
      id,
      x: event.clientX,
      y: event.clientY,
      positions: Object.fromEntries(
        ids.map((v) => {
          const b = requireRecord(node(v));
          return [v, { x: b.x, y: b.y }];
        }),
      ),
      ids,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (
      !start ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 4
    )
      return;
    start.moved = true;
    setSelection(start.ids);
    const dx = (event.clientX - start.x) / doc.editor.zoom;
    const dy = (event.clientY - start.y) / doc.editor.zoom;
    const next = Object.fromEntries(
      Object.entries(start.positions).map(([id, p]) => [
        id,
        { x: p.x + dx, y: p.y + dy },
      ]),
    );
    movingRef.current = next;
    setMoving(next);
  };
  const endMove = () => {
    if (drag.current?.moved) {
      const count = drag.current.ids.length;
      const positions = movingRef.current;
      run(count === 1 ? "Move component" : `Move ${count} components`, (d) =>
        Object.assign(d.editor.positions, positions),
      );
      nodeClickSuppressed.current = true;
    }
    drag.current = null;
    movingRef.current = {};
    setMoving({});
  };
  const cancelMove = () => {
    drag.current = null;
    movingRef.current = {};
    setMoving({});
    nodeClickSuppressed.current = true;
  };
  const commands = useRef({
    copy,
    paste,
    remove,
    group,
    ungroup,
    active: active && !constructing,
    selectedIds,
    wireSelection,
    removeConnection,
  });
  commands.current = {
    copy,
    paste,
    remove,
    group,
    ungroup,
    active: active && !constructing,
    selectedIds,
    wireSelection,
    removeConnection,
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !commands.current.active ||
        isTextEditing(event.target) ||
        (event.target instanceof Element && event.target.closest("dialog"))
      )
        return;
      const modifier = event.ctrlKey || event.metaKey;
      const value = event.key.toLowerCase();
      if (modifier && ["c", "v", "g", "a"].includes(value)) {
        event.preventDefault();
        if (value === "c") commands.current.copy();
        if (value === "v") commands.current.paste();
        if (value === "g") {
          if (event.shiftKey) commands.current.ungroup();
          else commands.current.group();
        }
        if (value === "a") {
          setWireSelection(null);
          setSelection(
            compositionGraph(current.current.doc).blocks.map((b) => b.id),
          );
        }
      } else if (
        ["Delete", "Backspace"].includes(event.key) &&
        (commands.current.wireSelection || commands.current.selectedIds.length)
      ) {
        event.preventDefault();
        if (commands.current.wireSelection) commands.current.removeConnection();
        else commands.current.remove();
      } else if (event.key === "Escape") {
        setSelection([]);
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const sourceNode = source ? node(source.node) : undefined;
  const sourceLabel = sourceNode?.outputs.find(
    (p) => p.id === source?.port,
  )?.label;
  const connect = (from: Endpoint, to: Endpoint) => {
    const error = documentConnectionError(doc, from, to);
    if (error) {
      setFeedback(error);
      return;
    }
    run("Connect components", (d) => connectDocument(d, from, to));
    setSource(null);
    setGhost(null);
    setFeedback("");
    setWireSelection(null);
  };
  const current = useRef({ connect, doc });
  current.current = { connect, doc };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const start = portDrag.current;
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return;
      start.moved = true;
      const world = surface.current
        ?.querySelector(".builder-canvas")
        ?.getBoundingClientRect();
      if (world)
        setGhost({
          x: (e.clientX - world.left) / current.current.doc.editor.zoom,
          y: (e.clientY - world.top) / current.current.doc.editor.zoom,
        });
    };
    const end = (e: PointerEvent) => {
      const start = portDrag.current;
      portDrag.current = null;
      setGhost(null);
      if (!start?.moved) return;
      portClickSuppressed.current = true;
      const port = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-port-side='input']");
      const block = port?.closest<HTMLElement>("[data-node-id]");
      if (port?.dataset.portId && block?.dataset.nodeId)
        current.current.connect(start.source, {
          node: block.dataset.nodeId,
          port: port.dataset.portId,
        });
    };
    const cancel = () => {
      portDrag.current = null;
      setGhost(null);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
        setSource(null);
        setWireSelection(null);
        setFeedback("");
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);
  useEffect(() => {
    if (!active) {
      setSource(null);
      setGhost(null);
      portDrag.current = null;
    }
  }, [active]);
  useEffect(() => {
    if (source && !blocks.some((b) => b.id === source.node)) setSource(null);
    if (
      wireSelection &&
      !wires.some((w) => JSON.stringify(w) === JSON.stringify(wireSelection))
    )
      setWireSelection(null);
  }, [blocks, wires, source, wireSelection]);
  const path = (
    a: {
      x: number;
      y: number;
    },
    b: {
      x: number;
      y: number;
    },
  ) => {
    const bend = Math.max(80, Math.abs(b.x - a.x) * 0.45);
    return `M${a.x},${a.y} C${a.x + bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`;
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Delegates pointer gestures; selection also has keyboard and toolbar controls.
    <div
      ref={surface}
      className={`composition-graph ${constructing ? "is-constructing" : ""}`}
      data-construction-phase={construction?.phase}
      hidden={!active}
      onContextMenu={(event) => {
        if (constructing) return;
        if ((event.target as Element).closest("input, textarea")) return;
        event.preventDefault();
        const target = (event.target as Element).closest<HTMLElement>(
          "[data-node-id]",
        );
        if (
          target?.dataset.nodeId &&
          !selectedIds.includes(target.dataset.nodeId)
        )
          select(target.dataset.nodeId);
        const groupTarget = (event.target as Element).closest<HTMLElement>(
          "[data-group-id]",
        );
        const group = (doc.authored?.groups ?? doc.editor.groups)?.find(
          (g) => g.id === groupTarget?.dataset.groupId,
        );
        if (group && !group.members.some((id) => selectedIds.includes(id)))
          select(group.members[0]);
        setContextMenu({
          x: Math.min(event.clientX, window.innerWidth - 210),
          y: Math.min(event.clientY, window.innerHeight - 300),
        });
      }}
      onPointerDownCapture={(event) => {
        if (constructing) return;
        if (
          !event.shiftKey ||
          event.button !== 0 ||
          !(event.target as Element).closest(".builder-canvas-scroll") ||
          (event.target as Element).closest(
            ".builder-block, .connection-group, .connection-wire-hit",
          )
        )
          return;
        event.preventDefault();
        setWireSelection(null);
        const origin = worldPoint(event.clientX, event.clientY);
        marqueeDrag.current = { origin, previous: selectedIds };
        setMarquee({ ...origin, right: origin.x, bottom: origin.y });
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = marqueeDrag.current;
        if (!start) return;
        const p = worldPoint(event.clientX, event.clientY);
        const rect = {
          x: Math.min(p.x, start.origin.x),
          y: Math.min(p.y, start.origin.y),
          right: Math.max(p.x, start.origin.x),
          bottom: Math.max(p.y, start.origin.y),
        };
        setMarquee(rect);
        setSelection(
          expandSelection(doc, [
            ...new Set([
              ...start.previous,
              ...blocks
                .filter(
                  (b) =>
                    b.x < rect.right &&
                    b.x + 278 > rect.x &&
                    b.y < rect.bottom &&
                    b.y + height(b.id) > rect.y,
                )
                .map((b) => b.id),
            ]),
          ]),
        );
      }}
      onPointerUp={() => {
        marqueeDrag.current = null;
        setMarquee(null);
      }}
      onPointerCancel={() => {
        if (marqueeDrag.current) setSelection(marqueeDrag.current.previous);
        marqueeDrag.current = null;
        setMarquee(null);
      }}
    >
      <section className="connection-workspace" aria-label="Block workspace">
        {selectedIds.length > 0 && (
          <fieldset
            inert={constructing}
            className="connection-selection-actions"
            aria-label="Selection actions"
          >
            <span aria-live="polite">{selectedIds.length} selected</span>
            {onSaveComposite && (
              <button
                type="button"
                onClick={() =>
                  onSaveComposite(expandSelection(doc, selectedIds))
                }
              >
                Save as composite
              </button>
            )}
            <button type="button" onClick={copy}>
              Copy
            </button>
            <button
              type="button"
              disabled={!componentClipboard}
              onClick={paste}
            >
              Paste
            </button>
            <button type="button" className="selection-delete" onClick={remove}>
              Delete
            </button>
            <button
              type="button"
              className="selection-clear"
              aria-label="Clear selection"
              title="Clear selection (Escape)"
              onClick={() => setSelection([])}
            >
              ×
            </button>
            {selectedIds.length >= 2 && (
              <button type="button" onClick={group}>
                Create group
              </button>
            )}
          </fieldset>
        )}

        <header className="connection-workspace-header">
          <div className="connection-workspace-title">
            <strong>Connections</strong>
            <span>
              {blocks.length
                ? doc.authored
                  ? `${doc.authored.nodes.filter((n) => n.definition.startsWith("canvases/")).length} canvases · ${doc.authored.nodes.length} components`
                  : `${requireRecord(requireRecord(doc.scene).workspace).canvases.length} canvases · ${requireRecord(doc.scene).objects.length} objects`
                : "Start with an empty canvas"}
            </span>
          </div>
          <div className="connection-workspace-actions">
            {constructing && (
              <label className="construction-follow">
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(event) => setFollow(event.target.checked)}
                />{" "}
                Follow build
              </label>
            )}
            <select
              aria-label="Find a component"
              value=""
              onChange={(e) =>
                setJump({
                  id: e.target.value,
                  sequence: (jump?.sequence ?? 0) + 1,
                })
              }
            >
              <option value="">Jump to component…</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={constructing}
              onClick={() => {
                const arranged = compositionGraph(doc, null, false);
                run("Arrange components", (d) => {
                  for (const b of arranged.blocks)
                    d.editor.positions[b.id] = { x: b.x, y: b.y };
                });
                setFit((v) => v + 1);
              }}
            >
              Arrange
            </button>
          </div>
        </header>
        <ConnectionViewport
          worldWidth={Math.max(1000, ...blocks.map((b) => b.x + 278 + 1000))}
          worldHeight={Math.max(
            1000,
            ...blocks.map((b) => b.y + height(b.id) + 1000),
          )}
          active={active}
          zoom={doc.editor.zoom}
          onZoom={onZoom}
          selectedId={selected}
          fitRequest={fit}
          reveal={
            constructing && follow && construction?.affected.nodes.length
              ? {
                  id: construction.affected.nodes[
                    construction.affected.nodes.length - 1
                  ],
                  sequence: construction.sequence,
                }
              : (jump ?? reveal)
          }
          onNavigate={() => {
            if (constructing) setFollow(false);
          }}
          onBackground={() => {
            setSource(null);
            setWireSelection(null);
            setFeedback("");
            setSelection([]);
            setContextMenu(null);
          }}
          overlays={
            <>
              {contextMenu && (
                <div
                  className="connection-context-menu"
                  role="menu"
                  aria-label="Component actions"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedIds.length}
                    onClick={copy}
                  >
                    Copy · Ctrl/⌘ C
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!componentClipboard}
                    onClick={paste}
                  >
                    Paste · Ctrl/⌘ V
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={selectedIds.length < 2}
                    onClick={group}
                  >
                    Create group · Ctrl/⌘ G
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={
                      !(doc.authored?.groups ?? doc.editor.groups ?? []).some(
                        (g) => g.members.some((id) => selectedIds.includes(id)),
                      )
                    }
                    onClick={ungroup}
                  >
                    Ungroup · Ctrl/⌘ Shift G
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedIds.length}
                    onClick={remove}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setContextMenu(null)}
                  >
                    Close
                  </button>
                </div>
              )}
              <aside
                className="connection-legend"
                aria-label="Connection types"
              >
                <span>
                  <i className="legend-placement">■</i> Display
                </span>
                <span>
                  <i className="legend-action">◆</i> Changes & trips
                </span>
                <span>
                  <i className="legend-data">●</i> Observations
                </span>
              </aside>
              {!blocks.length && (
                <div className="connection-empty">
                  <strong>Build from small pieces</strong>
                  <p>
                    Add a canvas first, then objects, controls and results. Drag
                    between ports to connect them.
                  </p>
                  <button type="button" onClick={() => onAdd("canvases")}>
                    + Add canvas
                  </button>
                </div>
              )}
              {(source || feedback || wireSelection) && (
                <section
                  className="composition-connection-status"
                  aria-label="Connection editor"
                >
                  {feedback && (
                    <p
                      role={
                        /^(Copied|Pasted) /.test(feedback) ? "status" : "alert"
                      }
                    >
                      {feedback}
                    </p>
                  )}
                  {source && (
                    <>
                      <strong>
                        Connect {sourceNode?.label}: {sourceLabel}
                      </strong>
                      <p>Drag to a highlighted input, or click it.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSource(null);
                          setFeedback("");
                        }}
                      >
                        Cancel connection
                      </button>
                    </>
                  )}
                  {wireSelection && (
                    <>
                      <strong>Selected connection</strong>
                      <p>
                        {node(wireSelection.from)?.label} →{" "}
                        {node(wireSelection.to)?.label}
                      </p>
                      <p>
                        Press Delete or Backspace to remove this connection.
                      </p>
                      <button type="button" onClick={() => removeConnection()}>
                        Delete connection
                      </button>
                      <button
                        type="button"
                        onClick={() => setWireSelection(null)}
                      >
                        Close
                      </button>
                    </>
                  )}
                </section>
              )}
            </>
          }
        >
          {(
            doc.authored?.groups.filter((g) => !g.collapsed) ??
            doc.editor.groups ??
            []
          ).map((group) => {
            const members = blocks.filter((b) => group.members.includes(b.id));
            if (members.length < 2) return null;
            const left = Math.min(...members.map((b) => b.x)) - 20;
            const top = Math.min(...members.map((b) => b.y)) - 42;
            const right = Math.max(...members.map((b) => b.x + 278)) + 20;
            const bottom =
              Math.max(...members.map((b) => b.y + height(b.id))) + 20;
            return (
              <div
                key={group.id}
                data-group-id={group.id}
                className={`connection-group ${members.some((b) => selectedIds.includes(b.id)) ? "is-selected" : ""}`}
                style={{ left, top, width: right - left, height: bottom - top }}
              >
                <button
                  type="button"
                  disabled={constructing}
                  onClick={() => {
                    if (nodeClickSuppressed.current) {
                      nodeClickSuppressed.current = false;
                      return;
                    }
                    select(members[0].id);
                  }}
                  onPointerDown={(e) => startMove(e, members[0].id)}
                  onPointerMove={move}
                  onPointerUp={endMove}
                  onPointerCancel={cancelMove}
                >
                  {group.label}
                </button>
                {doc.authored && (
                  <button
                    type="button"
                    onClick={() => onSelect(group.id)}
                    aria-label={`Edit ${group.label}`}
                  >
                    Edit group
                  </button>
                )}
              </div>
            );
          })}
          {marquee && (
            <div
              className="connection-marquee"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.right - marquee.x,
                height: marquee.bottom - marquee.y,
              }}
            />
          )}
          <svg
            className="builder-wires connection-wires"
            width="100%"
            height="100%"
            aria-label="Component connections"
          >
            {wires.map((w) => {
              const a = node(w.from),
                b = node(w.to);
              if (!a || !b) return null;
              const d = path(
                portPoint(a, w.fromPort, "output"),
                portPoint(b, w.toPort, "input"),
              );
              const isSelected =
                wireSelection?.from === w.from &&
                wireSelection.fromPort === w.fromPort &&
                wireSelection.to === w.to &&
                wireSelection.toPort === w.toPort;
              return (
                <g
                  key={`${w.from}/${w.fromPort}/${w.to}/${w.toPort}`}
                  className={`connection-wire wire-${w.type} ${isSelected ? "is-selected" : ""}`}
                >
                  <path className="connection-wire-line" d={d} />
                  {/* biome-ignore lint/a11y/useSemanticElements: SVG wires need keyboard-accessible path hit targets. */}
                  <path
                    className="connection-wire-hit"
                    style={
                      constructing
                        ? { pointerEvents: "none", outline: "none" }
                        : { outline: "none" }
                    }
                    d={d}
                    role="button"
                    tabIndex={0}
                    vectorEffect="non-scaling-stroke"
                    aria-pressed={isSelected}
                    aria-label={`${a.label} → ${b.label}: ${w.label}`}
                    onFocus={() => selectConnection(w)}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.currentTarget.focus({ preventScroll: true });
                      selectConnection(w);
                    }}
                    onKeyDown={(e) => {
                      if (
                        isSelected &&
                        (e.key === "Delete" || e.key === "Backspace")
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        removeConnection(w);
                      } else if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectConnection(w);
                      }
                    }}
                  />
                </g>
              );
            })}
            {ghost && sourceNode && source && (
              <path
                className="connection-wire-line connection-wire-preview"
                d={path(portPoint(sourceNode, source.port, "output"), ghost)}
              />
            )}
          </svg>
          {blocks.map((b) => (
            <ConnectionNode
              key={b.id}
              node={b}
              readOnly={constructing}
              changed={construction?.affected.nodes.includes(b.id)}
              selected={selectedIds.includes(b.id)}
              compatible={
                !!source &&
                b.inputs.some(
                  (p) =>
                    !documentConnectionError(doc, source, {
                      node: b.id,
                      port: p.id,
                    }),
                )
              }
              activePort={source?.node === b.id ? source.port : null}
              onOpen={() => {
                select(b.id);
                onSelect(b.id);
              }}
              onSelect={(event) => {
                if (nodeClickSuppressed.current) {
                  nodeClickSuppressed.current = false;
                  return;
                }
                setSource(null);
                select(b.id, event.shiftKey || event.ctrlKey || event.metaKey);
              }}
              onAdd={(kind) =>
                onAdd(kind === "control" ? "controls" : "results", b.id)
              }
              onMoveStart={(e) => startMove(e, b.id)}
              onMove={move}
              onMoveEnd={endMove}
              onMoveCancel={cancelMove}
              onKeyMove={(e) => {
                const directions: Record<string, [number, number]> = {
                  ArrowLeft: [-20, 0],
                  ArrowRight: [20, 0],
                  ArrowUp: [0, -20],
                  ArrowDown: [0, 20],
                };
                const d = directions[e.key];
                if (d) {
                  e.preventDefault();
                  const ids = selectedIds.includes(b.id)
                    ? selectedIds
                    : graphSelection([b.id]);
                  setSelection(ids);
                  run(`Move ${ids.length} components`, (next) => {
                    for (const id of ids) {
                      const block = requireRecord(node(id));
                      next.editor.positions[id] = {
                        x: block.x + d[0],
                        y: block.y + d[1],
                      };
                    }
                  });
                }
              }}
              onPortStart={(e, p, side) => {
                portClickSuppressed.current = false;
                if (side !== "output" || e.button !== 0) return;
                const start = { node: b.id, port: p.id };
                portDrag.current = {
                  source: start,
                  x: e.clientX,
                  y: e.clientY,
                  moved: false,
                };
                setSource(start);
                setWireSelection(null);
                setFeedback("");
              }}
              onPort={(p, side) => {
                if (portClickSuppressed.current) {
                  portClickSuppressed.current = false;
                  return;
                }
                if (side === "output") {
                  setSource({ node: b.id, port: p.id });
                  setFeedback("");
                  setWireSelection(null);
                } else if (source) connect(source, { node: b.id, port: p.id });
                else if (doc.authored)
                  setEditingInput({ node: b.id, port: p.id });
                else onSelect(b.id);
              }}
              onDrop={(p, value) => {
                const [id, port] = (value ?? "").split("::");
                if (id && port)
                  connect({ node: id, port }, { node: b.id, port: p.id });
              }}
            />
          ))}
        </ConnectionViewport>
        {editingInput && (
          <InputEditor
            doc={doc}
            target={editingInput}
            edit={edit}
            onClose={() => setEditingInput(null)}
          />
        )}
      </section>
    </div>
  );
}
