import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import {
  type GraphNode,
  type GraphPort,
  NODE_HEADER,
  PORT_HEIGHT,
} from "./graph/types";

const symbols = {
  Composite: "▦",
  Resource: "◉",
  Object: "◈",
  Control: "↗",
  Result: "◎",
  View: "▧",
  Lesson: "≡",
  Placement: "▦",
  Behavior: "◷",
};
export function ConnectionNode({
  node,
  selected,
  compatible,
  activePort,
  onSelect,
  onOpen,
  onMoveStart,
  onMove,
  onMoveEnd,
  onMoveCancel,
  onPort,
  onDrop,
  onAdd,
  onPortStart,
  onKeyMove,
}: {
  node: GraphNode;
  selected: boolean;
  compatible: boolean;
  activePort: string | null;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen?: () => void;
  onMoveStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onMoveEnd: () => void;
  onMoveCancel: () => void;
  onPort: (port: GraphPort, side: "input" | "output") => void;
  onDrop: (port: GraphPort, source?: string) => void;
  onAdd: (kind: "control" | "result") => void;
  onPortStart?: (
    event: PointerEvent<HTMLButtonElement>,
    port: GraphPort,
    side: "input" | "output",
  ) => void;
  onKeyMove?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const rows = Math.max(node.inputs.length, node.outputs.length, 1);
  const renderPort = (
    port: GraphPort | undefined,
    side: "input" | "output",
  ) => {
    if (!port) return <span />;
    const canConnect =
      port.connectable ??
      ((node.kind === "Control" && port.type === "action") ||
        (node.kind === "Result" && side === "input") ||
        (node.kind === "Object" && port.id !== "scene"));
    const label =
      node.kind === "Control" && port.type === "action"
        ? "◆ Action"
        : `${canConnect ? (side === "input" ? "Connect to" : "Connect from") : "Inspect"} ${node.label}: ${port.label}`;
    return (
      <button
        type="button"
        className={`connection-port connection-port--${port.type} connection-port--${side} ${activePort === port.id ? "is-active" : ""}`}
        aria-label={label}
        title={`${port.type === "action" ? "Change" : port.type === "data" ? "Observe" : "Place"}: ${port.label}`}
        data-port-id={port.id}
        data-port-side={side}
        onClick={() => onPort(port, side)}
        onPointerDown={
          onPortStart
            ? (event) => {
                event.stopPropagation();
                onPortStart(event, port, side);
              }
            : undefined
        }
        draggable={!onPortStart && canConnect && side === "output"}
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "text/plain",
            port.connectable
              ? `${node.id}::${port.id}`
              : node.kind === "Control"
                ? node.id
                : port.id,
          );
          onPort(port, side);
        }}
        onDragOver={(event) => {
          if (canConnect && side === "input") event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (canConnect && side === "input")
            onDrop(port, event.dataTransfer.getData("text/plain"));
        }}
      >
        <span className="connection-port-handle" aria-hidden="true">
          {port.type === "action" ? "◆" : port.type === "data" ? "●" : "■"}
        </span>
        <span className="connection-port-label">{port.label}</span>
      </button>
    );
  };
  return (
    <article
      className={`builder-block connection-node connection-node--${node.kind.toLowerCase()} ${selected ? "is-selected" : ""} ${compatible ? "is-compatible" : ""}`}
      style={{ left: node.x, top: node.y }}
      data-node-id={node.id}
      aria-label={`${node.kind}: ${node.label}`}
    >
      <button
        type="button"
        className="connection-node-heading"
        style={{ height: NODE_HEADER }}
        onClick={onSelect}
        onDoubleClick={onOpen}
        onPointerDown={onMoveStart}
        onPointerMove={onMove}
        onPointerUp={onMoveEnd}
        onPointerCancel={onMoveCancel}
        onKeyDown={onKeyMove}
        aria-pressed={selected}
      >
        <span className="connection-node-icon" aria-hidden="true">
          {symbols[node.kind]}
        </span>
        <span className="connection-node-title">
          <small>
            {node.kind === "Object"
              ? "Model"
              : node.kind === "View"
                ? "Canvas"
                : node.kind === "Placement"
                  ? "Layout"
                  : node.kind}
          </small>
          <strong title={node.label}>{node.label}</strong>
          <span>{node.description}</span>
        </span>
      </button>
      {onOpen && (
        <button
          type="button"
          className="connection-node-edit"
          onClick={onOpen}
          aria-label={`Edit ${node.label}`}
        >
          Edit
        </button>
      )}
      <div className="connection-node-ports">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={`${node.inputs[index]?.id ?? ""}/${node.outputs[index]?.id ?? ""}`}
            className="connection-port-row"
            style={{ height: PORT_HEIGHT }}
          >
            {renderPort(node.inputs[index], "input")}
            {renderPort(node.outputs[index], "output")}
          </div>
        ))}
      </div>
      {node.kind === "Object" && (
        <div className="connection-node-additions">
          <button type="button" onClick={() => onAdd("control")}>
            + Control
          </button>
          <button type="button" onClick={() => onAdd("result")}>
            + Result
          </button>
        </div>
      )}
    </article>
  );
}
