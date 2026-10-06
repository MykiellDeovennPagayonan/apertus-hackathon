"use client";
import {
  type CSSProperties,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type BoardPresentation,
  type Camera,
  type Rect,
  reorderBoardItems,
  screenToWorld,
} from "../../../runtime/authoring/board";
import {
  createDrawing,
  type DrawingItem,
  isDrawingItem,
  resizeDrawing,
} from "../../../runtime/authoring/drawings";
import { DrawingIcon } from "./DrawingIcon";
import { DrawingInspector } from "./DrawingInspector";
import "./drawings.css";

export type DrawingTool = "select" | "hand" | "box" | "text";
export type DrawingCommit = (
  p: BoardPresentation,
  group?: string,
  action?: string,
) => void;
export const drawingFont = (family: DrawingItem["fontFamily"]) =>
  family === "serif"
    ? "Georgia, serif"
    : family === "mono"
      ? "ui-monospace, monospace"
      : "system-ui, sans-serif";
function textRect(item: DrawingItem, text: string): Rect {
  const measure = document.createElement("div");
  Object.assign(measure.style, {
    position: "absolute",
    visibility: "hidden",
    left: "-20000px",
    top: "0",
    fontFamily: drawingFont(item.fontFamily),
    fontSize: `${item.fontSize}px`,
    lineHeight: "1.35",
    whiteSpace: item.sizing === "auto" ? "pre" : "pre-wrap",
    overflowWrap: item.sizing === "auto" ? "normal" : "anywhere",
    padding: "4px",
    border: `${item.style.stroke === "transparent" ? 0 : item.style.strokeWidth}px solid transparent`,
    boxSizing: "border-box",
    width: item.sizing === "auto" ? "max-content" : `${item.rect.width}px`,
    maxWidth: "10000px",
  });
  measure.textContent = `${text}\u200b`;
  document.body.append(measure);
  const rect = {
    ...item.rect,
    width:
      item.sizing === "auto"
        ? Math.max(24, Math.ceil(measure.offsetWidth))
        : item.rect.width,
    height: Math.max(16, Math.ceil(measure.offsetHeight)),
  };
  measure.remove();
  return {
    ...rect,
    width: Math.min(10000, rect.width),
    height: Math.min(10000, rect.height),
  };
}
export function DrawingEditor({
  presentation: p,
  camera,
  size,
  viewport,
  authoring,
  selection,
  preview,
  onPreviewChange: setPreview,
  onSelect,
  onCommit,
  onAction,
  onPanTool,
  tool,
  onToolChange,
  immersive,
  learnerArea,
}: {
  presentation: BoardPresentation;
  camera: Camera;
  size: { width: number; height: number };
  viewport: RefObject<HTMLDivElement | null>;
  authoring?: boolean;
  immersive?: boolean;
  learnerArea?: Rect;
  selection: string[];
  preview: Record<string, Rect>;
  onPreviewChange: (rects: Record<string, Rect>) => void;
  onSelect: (ids: string[]) => void;
  onCommit: DrawingCommit;
  onAction: (
    action: "copy" | "paste" | "duplicate" | "delete",
    ids: string[],
  ) => void;
  onPanTool: (enabled: boolean) => void;
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
}) {
  const [ghost, setGhost] = useState<DrawingItem | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    text: string;
    fresh: boolean;
  } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const gesture = useRef<{
    pointer: number;
    start: { x: number; y: number };
    mode: "create" | "move" | "resize";
    edge?: string;
    item?: DrawingItem;
    rects: Record<string, Rect>;
  } | null>(null);
  const [defaults, setDefaults] = useState<
    Record<"text" | "box", Partial<DrawingItem>>
  >({ text: {}, box: {} });
  const space = useRef(false);
  const keySession = useRef("");
  const chosen = p.items.filter((i) => selection.includes(i.id));
  const drawings = p.items.filter(isDrawingItem);
  const selectedDrawing =
    chosen.length === 1 && isDrawingItem(chosen[0]) ? chosen[0] : undefined;
  const chooseTool = (next: DrawingTool) => {
    if (next === "text" || next === "box") onSelect([]);
    onToolChange(next);
    onPanTool(next === "hand");
  };
  const position = (rect: Rect): CSSProperties => ({
    left: size.width / 2 + (rect.x - camera.centerX) * camera.zoom,
    top: size.height / 2 + (rect.y - camera.centerY) * camera.zoom,
    width: rect.width,
    height: rect.height,
    transform: `scale(${camera.zoom})`,
    transformOrigin: "0 0",
  });
  const point = (event: { clientX: number; clientY: number }) => {
    const bounds = viewport.current?.getBoundingClientRect();
    return screenToWorld(
      {
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      },
      camera,
      size,
    );
  };
  const patch = (
    fn: (next: BoardPresentation) => void,
    action: string,
    group?: string,
  ) => {
    const next = structuredClone(p);
    next.version = 2;
    fn(next);
    onCommit(next, group, action);
  };
  const editText = (item: DrawingItem, fresh = false) => {
    onSelect([item.id]);
    setEditing({ id: item.id, text: item.text, fresh });
  };
  const editingId = editing?.id;
  useEffect(() => {
    if (editingId) textarea.current?.focus();
  }, [editingId]);
  const finishText = () => {
    if (!editing) return;
    const item = drawings.find((i) => i.id === editing.id);
    if (item) {
      if (!editing.text.trim()) onAction("delete", [item.id]);
      else if (item.text !== editing.text)
        patch(
          (next) => {
            const current = next.items.find((i) => i.id === item.id);
            if (current && isDrawingItem(current)) {
              current.text = editing.text;
              current.rect = textRect(current, editing.text);
            }
          },
          "Edit text",
          editing.fresh ? `create/${item.id}` : undefined,
        );
    }
    setEditing(null);
    chooseTool("select");
  };
  const nudge = (dx: number, dy: number, group: string) =>
    patch(
      (next) => {
        next.items.forEach((item) => {
          if (selection.includes(item.id) && !item.locked)
            item.rect = {
              ...item.rect,
              x: Math.max(-999000, Math.min(999000, item.rect.x + dx)),
              y: Math.max(-999000, Math.min(999000, item.rect.y + dy)),
            };
        });
      },
      "Move selection",
      group,
    );
  const callbacks = useRef({
    tool,
    selection,
    editing,
    chosen,
    chooseTool,
    onAction,
    onSelect,
    finishText,
    editText,
    nudge,
  });
  callbacks.current = {
    tool,
    selection,
    editing,
    chosen,
    chooseTool,
    onAction,
    onSelect,
    finishText,
    editText,
    nudge,
  };
  useEffect(() => {
    if (!authoring || immersive) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const current = callbacks.current;
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable='true']"))
        return;
      if (event.key === " " && !event.repeat && !target.closest("button")) {
        event.preventDefault();
        space.current = true;
        onPanTool(true);
        return;
      }
      if (event.key === "Escape") {
        setGhost(null);
        setPreview({});
        gesture.current = null;
        current.chooseTool("select");
        current.onSelect([]);
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        if (
          ["c", "v", "d"].includes(event.key.toLowerCase()) &&
          (current.selection.length || event.key.toLowerCase() === "v")
        ) {
          event.preventDefault();
          current.onAction(
            event.key.toLowerCase() === "c"
              ? "copy"
              : event.key.toLowerCase() === "v"
                ? "paste"
                : "duplicate",
            current.selection,
          );
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (current.selection.length) {
          event.preventDefault();
          current.onAction("delete", current.selection);
          current.onSelect([]);
        }
        return;
      }
      if (
        event.key === "Enter" &&
        current.chosen.length === 1 &&
        isDrawingItem(current.chosen[0]) &&
        current.chosen[0].kind === "text" &&
        !current.chosen[0].locked
      ) {
        event.preventDefault();
        current.editText(current.chosen[0]);
        return;
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          event.key,
        ) &&
        current.chosen.some(isDrawingItem)
      ) {
        event.preventDefault();
        if (!keySession.current)
          keySession.current = `nudge/${crypto.randomUUID()}`;
        const amount = event.shiftKey ? 10 : 1;
        current.nudge(
          event.key === "ArrowLeft"
            ? -amount
            : event.key === "ArrowRight"
              ? amount
              : 0,
          event.key === "ArrowUp"
            ? -amount
            : event.key === "ArrowDown"
              ? amount
              : 0,
          keySession.current,
        );
        return;
      }
      const tools: Record<string, DrawingTool> = {
        v: "select",
        h: "hand",
        r: "box",
        t: "text",
      };
      if (tools[event.key.toLowerCase()]) {
        event.preventDefault();
        current.chooseTool(tools[event.key.toLowerCase()]);
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) keySession.current = "";
      if (event.key === " " && space.current) {
        space.current = false;
        onPanTool(callbacks.current.tool === "hand");
      }
    };
    const blur = () => {
      space.current = false;
      onPanTool(callbacks.current.tool === "hand");
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
  }, [authoring, immersive, onPanTool, setPreview]);
  useEffect(() => {
    if (!authoring) {
      callbacks.current.finishText();
      callbacks.current.chooseTool("select");
    }
  }, [authoring]);
  const start = (
    event: PointerEvent<HTMLElement>,
    item?: DrawingItem,
    edge?: string,
  ) => {
    if (event.button !== 0 || space.current || tool === "hand" || item?.locked)
      return;
    if (editing) return;
    if (event.altKey && item && !edge) {
      event.preventDefault();
      event.stopPropagation();
      const at = point(event);
      const candidates = [...p.items]
        .filter(
          (candidate) =>
            at.x >= candidate.rect.x &&
            at.x <= candidate.rect.x + candidate.rect.width &&
            at.y >= candidate.rect.y &&
            at.y <= candidate.rect.y + candidate.rect.height,
        )
        .sort((a, b) => b.zIndex - a.zIndex);
      const index = candidates.findIndex((candidate) =>
        selection.includes(candidate.id),
      );
      if (candidates.length)
        onSelect([candidates[(index + 1) % candidates.length].id]);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const at = point(event);
    if (!item && (tool === "text" || tool === "box")) {
      const drawing = createDrawing(
        tool,
        { x: at.x, y: at.y, width: 24, height: 32 },
        Math.max(-1, ...p.items.map((i) => i.zIndex)) + 1,
      );
      const starting = defaults[tool];
      if (starting.style) drawing.style = { ...starting.style };
      if (tool === "text")
        Object.assign(drawing, {
          fontFamily: starting.fontFamily ?? drawing.fontFamily,
          fontSize: starting.fontSize ?? drawing.fontSize,
          color: starting.color ?? drawing.color,
          align: starting.align ?? drawing.align,
        });
      if (tool === "text") {
        drawing.sizing = "auto";
        drawing.rect = textRect(drawing, "");
        patch(
          (next) => next.items.push(drawing),
          "Add text",
          `create/${drawing.id}`,
        );
        chooseTool("select");
        editText(drawing, true);
        return;
      }
      setGhost(drawing);
      gesture.current = {
        pointer: event.pointerId,
        start: at,
        mode: "create",
        item: drawing,
        rects: {},
      };
    } else if (item) {
      const group = p.groups.find((g) => g.members.includes(item.id));
      const ids = edge
        ? [item.id]
        : event.shiftKey
          ? [...new Set([...selection, ...(group?.members ?? [item.id])])]
          : selection.includes(item.id)
            ? selection
            : (group?.members ?? [item.id]);
      onSelect(ids);
      gesture.current = {
        pointer: event.pointerId,
        start: at,
        mode: edge ? "resize" : "move",
        edge,
        item,
        rects: Object.fromEntries(
          p.items
            .filter((i) => ids.includes(i.id) && !i.locked)
            .map((i) => [i.id, i.rect]),
        ),
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    const at = point(event),
      dx = at.x - g.start.x,
      dy = at.y - g.start.y;
    if (g.mode === "create" && g.item) {
      const width =
        event.shiftKey && g.item.kind === "box"
          ? Math.max(Math.abs(dx), Math.abs(dy))
          : Math.abs(dx);
      const height =
        event.shiftKey && g.item.kind === "box" ? width : Math.abs(dy);
      setGhost({
        ...g.item,
        rect: {
          x: dx < 0 ? g.start.x - width : g.start.x,
          y: dy < 0 ? g.start.y - height : g.start.y,
          width: Math.max(16, width),
          height: Math.max(16, height),
        },
      });
    } else
      setPreview(
        Object.fromEntries(
          Object.entries(g.rects).map(([id, rect]) => {
            const nextRect =
              g.mode === "move"
                ? {
                    ...rect,
                    x: Math.max(-999000, Math.min(999000, rect.x + dx)),
                    y: Math.max(-999000, Math.min(999000, rect.y + dy)),
                  }
                : resizeDrawing(
                    rect,
                    dx,
                    dy,
                    g.edge ?? "se",
                    event.shiftKey && g.item?.kind === "box",
                  );
            return [
              id,
              g.mode === "resize" && g.item?.kind === "text"
                ? textRect(
                    { ...g.item, rect: nextRect, sizing: "wrap" },
                    g.item.text,
                  )
                : nextRect,
            ];
          }),
        ),
      );
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    if (g.mode === "create" && ghost) {
      const item = structuredClone(ghost);
      const at = point(event);
      const click =
        Math.hypot(at.x - g.start.x, at.y - g.start.y) < 4 / camera.zoom;
      if (item.kind === "box" && click)
        item.rect = { ...item.rect, width: 160, height: 100 };
      patch(
        (next) => {
          next.items.push(item);
        },
        `Add ${item.kind}`,
        `create/${item.id}`,
      );
      onSelect([item.id]);
      setGhost(null);
      chooseTool("select");
      if (item.kind === "text")
        setEditing({ id: item.id, text: "", fresh: true });
    } else if (Object.keys(preview).length)
      patch(
        (next) => {
          next.items.forEach((item) => {
            if (preview[item.id]) {
              item.rect = preview[item.id];
              if (
                isDrawingItem(item) &&
                item.kind === "text" &&
                g.mode === "resize"
              ) {
                item.sizing = "wrap";
                item.rect = textRect(item, item.text);
              }
            }
          });
        },
        g.mode === "resize" ? "Resize drawing" : "Move selection",
      );
    setPreview({});
    gesture.current = null;
  };
  const cancel = () => {
    gesture.current = null;
    setGhost(null);
    setPreview({});
  };
  const updateItem = (change: Partial<DrawingItem>, group?: string) => {
    if (!selectedDrawing) return;
    const updated = { ...selectedDrawing, ...change };
    if (updated.kind === "text") updated.rect = textRect(updated, updated.text);
    patch(
      (next) => {
        next.items = next.items.map((item) =>
          item.id === updated.id ? updated : item,
        );
      },
      "Style drawing",
      group,
    );
    setDefaults((current) => ({
      ...current,
      [updated.kind]: {
        style: updated.style,
        fontFamily: updated.fontFamily,
        fontSize: updated.fontSize,
        color: updated.color,
        align: updated.align,
      },
    }));
  };
  const renderItem = (item: DrawingItem, temporary = false) => {
    const active = editing?.id === item.id;
    const resizing =
      gesture.current?.mode === "resize" &&
      gesture.current.item?.id === item.id;
    const current = {
      ...item,
      text: active ? editing.text : item.text,
      sizing: resizing ? ("wrap" as const) : item.sizing,
    };
    const rect =
      preview[item.id] ??
      (active ? textRect(current, current.text) : item.rect);
    const textStyle: CSSProperties = {
      fontFamily: drawingFont(item.fontFamily),
      fontSize: item.fontSize,
      lineHeight: 1.35,
      textAlign: item.align,
      color: item.color,
      whiteSpace: current.sizing === "auto" ? "pre" : "pre-wrap",
      overflowWrap: current.sizing === "auto" ? "normal" : "anywhere",
    };
    return (
      <div
        key={item.id}
        className="board-drawing"
        data-drawing-id={temporary ? undefined : item.id}
        data-drawing-kind={item.kind}
        style={{
          ...position(rect),
          zIndex: temporary ? 9000 : item.zIndex + 1,
          opacity: item.style.opacity,
          pointerEvents: authoring ? undefined : "none",
          clipPath:
            !authoring && learnerArea
              ? `inset(${Math.max(0, learnerArea.y - rect.y)}px ${Math.max(0, rect.x + rect.width - learnerArea.x - learnerArea.width)}px ${Math.max(0, rect.y + rect.height - learnerArea.y - learnerArea.height)}px ${Math.max(0, learnerArea.x - rect.x)}px)`
              : undefined,
        }}
      >
        {item.kind === "box" ? (
          <svg
            className="drawing-box"
            width="100%"
            height="100%"
            aria-label="Box"
            tabIndex={authoring ? 0 : undefined}
            onFocus={(event) => {
              if (authoring && event.target === event.currentTarget)
                onSelect([item.id]);
            }}
            onPointerDown={(event) => {
              if (item.locked) {
                event.stopPropagation();
                onSelect([item.id]);
              } else start(event as unknown as PointerEvent<HTMLElement>, item);
            }}
            onPointerMove={
              move as unknown as React.PointerEventHandler<SVGSVGElement>
            }
            onPointerUp={
              finish as unknown as React.PointerEventHandler<SVGSVGElement>
            }
            onPointerCancel={cancel}
          >
            <rect
              x={item.style.strokeWidth / 2}
              y={item.style.strokeWidth / 2}
              width={Math.max(1, rect.width - item.style.strokeWidth)}
              height={Math.max(1, rect.height - item.style.strokeWidth)}
              rx={item.style.radius}
              fill={item.style.fill}
              stroke={item.style.stroke}
              strokeWidth={item.style.strokeWidth}
              strokeDasharray={
                item.style.strokeStyle === "dashed"
                  ? `${item.style.strokeWidth * 5} ${item.style.strokeWidth * 4}`
                  : undefined
              }
              style={{
                pointerEvents: authoring
                  ? item.style.fill === "transparent" &&
                    item.style.stroke !== "transparent"
                    ? "stroke"
                    : "all"
                  : "none",
              }}
            />
          </svg>
        ) : (
          <fieldset
            aria-label="Text drawing"
            tabIndex={authoring ? 0 : undefined}
            onFocus={(event) => {
              if (authoring && event.target === event.currentTarget)
                onSelect([item.id]);
            }}
            className="drawing-text-surface"
            style={{
              background: item.style.fill,
              border:
                item.style.stroke === "transparent"
                  ? "none"
                  : `${item.style.strokeWidth}px ${item.style.strokeStyle} ${item.style.stroke}`,
              borderRadius: item.style.radius,
              pointerEvents: authoring ? "auto" : "none",
            }}
            onPointerDown={(event) => {
              if (active) event.stopPropagation();
              else if (item.locked) {
                event.stopPropagation();
                onSelect([item.id]);
              } else start(event, item);
            }}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={cancel}
            onDoubleClick={() => {
              if (authoring && !item.locked) editText(item);
            }}
          >
            {active ? (
              <textarea
                ref={textarea}
                className="drawing-text-editor"
                aria-label="Edit drawing text"
                style={textStyle}
                value={editing.text}
                maxLength={10000}
                onChange={(event) =>
                  setEditing({ ...editing, text: event.target.value })
                }
                onBlur={finishText}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (
                    event.key === "Escape" &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    finishText();
                  }
                }}
              />
            ) : (
              <div className="drawing-text-content" style={textStyle}>
                {item.text}
              </div>
            )}
          </fieldset>
        )}
      </div>
    );
  };
  if (immersive) return null;
  return (
    <>
      {drawings.map((item) => renderItem(item))}
      {ghost && renderItem(ghost, true)}
      {authoring && (
        <>
          <div
            className="drawing-toolbar"
            role="toolbar"
            aria-label="Drawing tools"
          >
            {(
              [
                ["select", "Select", "↖", "V"],
                ["hand", "Hand", "✋", "H"],
                ["box", "Box", "□", "R"],
                ["text", "Text", "T", "T"],
              ] as const
            ).map(([value, label, _icon, shortcut]) => (
              <button
                key={value}
                type="button"
                aria-label={`${label} tool`}
                title={`${label} (${shortcut})`}
                aria-pressed={tool === value}
                onClick={() => {
                  finishText();
                  chooseTool(value);
                }}
              >
                <DrawingIcon name={value} />
              </button>
            ))}
          </div>
          {(tool === "box" || tool === "text") && (
            <div
              className="drawing-create-surface"
              data-drawing-tool={tool}
              onPointerDown={(event) => start(event)}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={cancel}
            />
          )}
          {tool === "select" &&
            !editing &&
            chosen.filter(isDrawingItem).map((item) => (
              <div
                key={item.id}
                className="drawing-selection"
                style={position(preview[item.id] ?? item.rect)}
              >
                <button
                  type="button"
                  aria-label="Move drawing"
                  className="drawing-selection-body"
                  onPointerDown={(event) => {
                    if (item.locked) return;
                    const at = point(event);
                    const top = [...drawings]
                      .filter(
                        (candidate) =>
                          at.x >= candidate.rect.x &&
                          at.x <= candidate.rect.x + candidate.rect.width &&
                          at.y >= candidate.rect.y &&
                          at.y <= candidate.rect.y + candidate.rect.height,
                      )
                      .sort((a, b) => b.zIndex - a.zIndex)[0];
                    start(event, event.altKey ? item : (top ?? item));
                  }}
                  onPointerMove={move}
                  onPointerUp={finish}
                  onPointerCancel={cancel}
                  onDoubleClick={() => {
                    if (item.kind === "text" && !item.locked) editText(item);
                  }}
                />
                {!item.locked &&
                  (item.kind === "text"
                    ? ["e", "w"]
                    : ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
                  ).map((edge) => (
                    <button
                      key={edge}
                      type="button"
                      className={`drawing-handle handle-${edge}`}
                      aria-label={`Resize ${item.kind} ${edge}`}
                      style={{
                        transform: `translate(-50%, -50%) scale(${1 / camera.zoom})`,
                      }}
                      onPointerDown={(event) => start(event, item, edge)}
                      onPointerMove={move}
                      onPointerUp={finish}
                      onPointerCancel={cancel}
                    />
                  ))}
              </div>
            ))}
          {selectedDrawing && (
            <DrawingInspector
              item={selectedDrawing}
              onChange={updateItem}
              onAction={(action) => {
                if (action === "delete") {
                  onAction(action, [selectedDrawing.id]);
                  onSelect([]);
                } else onAction(action, [selectedDrawing.id]);
              }}
              onLayer={(action) =>
                patch(
                  (next) => reorderBoardItems(next, selection, action),
                  "Change layer",
                )
              }
              onLock={() =>
                patch((next) => {
                  const item = next.items.find(
                    (i) => i.id === selectedDrawing.id,
                  );
                  if (item) item.locked = !item.locked;
                }, "Lock drawing")
              }
            />
          )}
        </>
      )}
    </>
  );
}
