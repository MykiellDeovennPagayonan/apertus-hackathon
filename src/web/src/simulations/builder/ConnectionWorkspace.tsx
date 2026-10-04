import { useRef, useState } from "react";
import { ConnectionNode } from "./ConnectionNode";
import { ConnectionViewport } from "./ConnectionViewport";
import {
  connectionGraph,
  type GraphNode,
  type GraphPort,
  type MovingBlock,
  portPoint,
} from "./connections";
import "./connections.css";
import { templates } from "./descriptors";
import { type ExperimentDocument, requireRecord } from "./document";

export function ConnectionWorkspace({
  doc,
  selected,
  setSelected,
  presentationWires,
  setPresentationWires,
  port,
  setPort,
  connect,
  onAdd,
  edit,
  active,
  onZoom,
}: {
  doc: ExperimentDocument;
  selected: string;
  setSelected: (id: string) => void;
  presentationWires: boolean;
  setPresentationWires: (show: boolean) => void;
  port: string | null;
  setPort: (port: string | null) => void;
  connect: (target: string) => void;
  onAdd: (kind: "control" | "result") => void;
  edit: (
    change: (next: ExperimentDocument) => void,
    group?: string | null,
  ) => void;
  active: boolean;
  onZoom: (zoom: number) => void;
}) {
  const t = templates[doc.template];
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const movingRef = useRef<MovingBlock | null>(null);
  const [moving, setMoving] = useState<MovingBlock | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [reveal, setReveal] = useState<{ id: string; sequence: number }>();
  const [connectionSelection, setConnectionSelection] = useState<{
    source: string | null;
    target: string;
  }>({ source: null, target: "" });
  const destination =
    connectionSelection.source === port ? connectionSelection.target : "";
  const { blocks, wires, node } = connectionGraph(
    doc,
    presentationWires,
    moving,
  );
  const control = doc.presentation.controls.find((item) => item.id === port);
  const sourceLabel = port?.startsWith("output:")
    ? t.outputs[port.slice(7)]?.label
    : control?.label;
  const selectPort = (
    block: GraphNode,
    target: GraphPort,
    side: "input" | "output",
  ) => {
    if (target.type === "placement") {
      setSelected(block.id);
      return;
    }
    if (block.kind === "Control") {
      setPort(block.id);
    } else if (block.kind === "Result") {
      if (port?.startsWith("output:")) connect(block.id);
    } else if (block.kind === "Object") {
      if (target.id === "scene") {
        setSelected("view");
        return;
      }
      if (side === "output") setPort(target.id);
      else if (port && !port.startsWith("output:")) connect(target.id);
      else setSelected(block.id);
    } else setSelected(block.id);
  };
  const clearMove = () => {
    drag.current = null;
    movingRef.current = null;
    setMoving(null);
  };
  const arrange = () => {
    const layout = connectionGraph(doc, presentationWires, null, false);
    edit((next) => {
      for (const block of layout.blocks)
        if (next.recipe)
          next.editor.positions[block.id] = { x: block.x, y: block.y };
    });
    setFitRequest((value) => value + 1);
  };
  return (
    <section
      className="builder-workspace connection-workspace"
      aria-label="Block workspace"
    >
      <header className="connection-workspace-header">
        <div className="connection-workspace-title">
          <strong>Connections</strong>
          <span>
            {doc.recipe
              ? `${doc.presentation.controls.length} control${doc.presentation.controls.length === 1 ? "" : "s"} · ${doc.presentation.results.length} result${doc.presentation.results.length === 1 ? "" : "s"}`
              : "Add a model to get started"}
          </span>
        </div>
        <div className="connection-workspace-actions">
          <select
            aria-label="Find a component"
            value=""
            onChange={(event) => {
              setSelected(event.target.value);
              setReveal({
                id: event.target.value,
                sequence: (reveal?.sequence ?? 0) + 1,
              });
            }}
          >
            <option value="">Jump to component…</option>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={arrange}
            title="Arrange cards and fit the canvas"
          >
            Arrange
          </button>
          <details className="connection-options">
            <summary aria-label="Connection display options">•••</summary>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={presentationWires}
                  onChange={(event) => {
                    setPresentationWires(event.target.checked);
                    setFitRequest((value) => value + 1);
                  }}
                />
                Show lesson placement
              </label>
              <p>Include instruction and panel placement connections.</p>
            </div>
          </details>
        </div>
      </header>
      <ConnectionViewport
        active={active}
        selectedId={selected}
        onBackground={() => {
          setSelected("");
          setPort(null);
        }}
        zoom={doc.editor.zoom}
        fitRequest={fitRequest}
        reveal={reveal}
        onZoom={onZoom}
        overlays={
          <>
            <aside className="connection-legend" aria-label="Connection types">
              <span>
                <i className="legend-action" aria-hidden="true">
                  ◆
                </i>
                Changes
              </span>
              <span>
                <i className="legend-data" aria-hidden="true">
                  ●
                </i>
                Observations
              </span>
              {presentationWires && (
                <span>
                  <i className="legend-placement" aria-hidden="true">
                    ■
                  </i>
                  Placement
                </span>
              )}
            </aside>
            {!doc.recipe && (
              <div className="connection-empty">
                <strong>Start with a model</strong>
                <p>
                  Add your first component from the toolbar. Then connect
                  controls and results.
                </p>
              </div>
            )}
            {port && (
              <section
                className="connection-composer"
                aria-label="Create a connection"
              >
                <header>
                  <strong>Connect {sourceLabel}</strong>
                  <button
                    type="button"
                    aria-label="Cancel connection"
                    onClick={() => setPort(null)}
                  >
                    ×
                  </button>
                </header>
                <p>
                  {port.startsWith("output:")
                    ? "Choose the readout that should display this observation."
                    : "Choose what this control changes on the model."}
                </p>
                <label>
                  Compatible destination
                  <select
                    value={destination}
                    onChange={(event) =>
                      setConnectionSelection({
                        source: port,
                        target: event.target.value,
                      })
                    }
                  >
                    <option value="">Choose a destination…</option>
                    {port.startsWith("output:")
                      ? doc.presentation.results.map((result) => (
                          <option key={result.id} value={result.id}>
                            {result.label}
                          </option>
                        ))
                      : Object.entries(t.controls).map(([key, capability]) => (
                          <option key={key} value={`action:${key}`}>
                            {capability.label}
                          </option>
                        ))}
                  </select>
                </label>
                {port.startsWith("output:") &&
                  !doc.presentation.results.length && (
                    <button
                      type="button"
                      onClick={() => {
                        setPort(null);
                        onAdd("result");
                      }}
                    >
                      Add a result first
                    </button>
                  )}
                <footer>
                  <span>Or choose a highlighted port.</span>
                  <button
                    className="builder-primary"
                    type="button"
                    disabled={!destination}
                    onClick={() => connect(destination)}
                  >
                    Connect
                  </button>
                </footer>
              </section>
            )}
          </>
        }
      >
        <svg
          className="builder-wires connection-wires"
          width="100%"
          height="100%"
          aria-label="Action, data, and placement connections"
        >
          {wires.map((wire) => {
            const from = requireRecord(node(wire.from));
            const to = requireRecord(node(wire.to));
            const a = portPoint(from, wire.fromPort, "output");
            const b = portPoint(to, wire.toPort, "input");
            const bend = Math.max(80, Math.abs(b.x - a.x) * 0.45);
            const path = `M${a.x},${a.y} C${a.x + bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`;
            const related = selected === wire.from || selected === wire.to;
            const target = wire.type === "action" ? wire.from : wire.to;
            return (
              <g
                key={`${wire.from}-${wire.fromPort}-${wire.to}-${wire.toPort}`}
                className={`connection-wire wire-${wire.type} ${related ? "is-related" : selected && node(selected) ? "is-muted" : ""}`}
              >
                <path className="connection-wire-line" d={path} />
                {/* biome-ignore lint/a11y/useSemanticElements: This SVG path provides a keyboard-accessible curved wire hit target. */}
                <path
                  className="connection-wire-hit"
                  d={path}
                  role="button"
                  tabIndex={0}
                  aria-label={`${from.label} ${wire.type === "action" ? "changes" : wire.type === "data" ? "feeds" : "is placed in"} ${to.label}: ${wire.label}`}
                  onClick={() => setSelected(target)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(target);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
        {blocks.map((block) => (
          <ConnectionNode
            key={block.id}
            node={block}
            selected={selected === block.id}
            compatible={Boolean(
              port &&
                ((port.startsWith("output:") && block.kind === "Result") ||
                  (!port.startsWith("output:") && block.kind === "Object")),
            )}
            activePort={
              block.kind === "Control" && port === block.id ? "action" : port
            }
            onSelect={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              setSelected(block.id);
            }}
            onAdd={onAdd}
            onMoveStart={(event) => {
              if (event.button !== 0) return;
              suppressClick.current = false;
              drag.current = {
                id: block.id,
                x: event.clientX,
                y: event.clientY,
                left: block.x,
                top: block.y,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onMove={(event) => {
              const start = drag.current;
              if (start?.id !== block.id) return;
              const position = {
                id: block.id,
                x: start.left + (event.clientX - start.x) / doc.editor.zoom,
                y: start.top + (event.clientY - start.y) / doc.editor.zoom,
              };
              if (
                Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4
              )
                suppressClick.current = true;
              movingRef.current = position;
              setMoving(position);
            }}
            onMoveEnd={() => {
              const position = movingRef.current;
              if (
                position &&
                drag.current &&
                Math.hypot(
                  position.x - drag.current.left,
                  position.y - drag.current.top,
                ) > 2
              )
                edit((next) => {
                  next.editor.positions[block.id] = {
                    x: position.x,
                    y: position.y,
                  };
                });
              clearMove();
            }}
            onMoveCancel={clearMove}
            onPort={(target, side) => selectPort(block, target, side)}
            onDrop={(target) => selectPort(block, target, "input")}
          />
        ))}
      </ConnectionViewport>
    </section>
  );
}
