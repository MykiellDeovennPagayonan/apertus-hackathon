import { type ReactNode, useEffect, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** Camera owns navigation only. Node positions and bindings remain document data. */
export function ConnectionViewport({
  zoom,
  initialPan,
  onZoom,
  onNavigate,
  children,
  active = true,
  fitRequest = 0,
  reveal,
  overlays,
  onBackground,
  selectedId,
  worldWidth = 3400,
  worldHeight = 4400,
}: {
  zoom: number;
  initialPan?: { x: number; y: number };
  onZoom: (zoom: number, pan?: { x: number; y: number }) => void;
  onNavigate?: () => void;
  children: ReactNode;
  active?: boolean;
  fitRequest?: number;
  reveal?: { id: string; sequence: number };
  overlays?: ReactNode;
  onBackground?: () => void;
  selectedId?: string;
  worldWidth?: number;
  worldHeight?: number;
}) {
  const viewport = useRef<HTMLElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState(initialPan ?? { x: 24, y: 24 });
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const gestureMoved = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    distance: number;
    x: number;
    y: number;
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);
  const endPointer = (pointer: number) => {
    pointers.current.delete(pointer);
    pinch.current = null;
    const remaining = Array.from(pointers.current.entries())[0];
    drag.current = remaining
      ? {
          pointer: remaining[0],
          x: remaining[1].x,
          y: remaining[1].y,
          left: pan.x,
          top: pan.y,
        }
      : null;
    setPanning(Boolean(remaining));
  };
  // Navigation is unbounded; the drawing surface grows to cover the visible world.
  const bounded = (x: number, y: number, _scale = zoom) => ({ x, y });
  const zoomAt = (next: number, x: number, y: number) => {
    onNavigate?.();
    const scale = clamp(next, 0.2, 2);
    setPan(
      bounded(
        x - ((x - pan.x) * scale) / zoom,
        y - ((y - pan.y) * scale) / zoom,
        scale,
      ),
    );
    onZoom(scale);
  };
  const fit = () => {
    const nodes = Array.from(
      world.current?.querySelectorAll<HTMLElement>(".builder-block") ?? [],
    );
    if (!nodes.length || !viewport.current) return;
    const left = Math.min(...nodes.map((n) => n.offsetLeft));
    const top = Math.min(...nodes.map((n) => n.offsetTop));
    const right = Math.max(...nodes.map((n) => n.offsetLeft + n.offsetWidth));
    const bottom = Math.max(...nodes.map((n) => n.offsetTop + n.offsetHeight));
    const host = viewport.current.closest(".composition-builder");
    const composerHeight = host
      ? Number.parseFloat(
          getComputedStyle(host).getPropertyValue("--builder-composer-height"),
        ) || 0
      : 0;
    const composer = host?.querySelector<HTMLElement>(".builder-composer");
    const viewportBounds = viewport.current.getBoundingClientRect();
    const composerTop = composer?.getBoundingClientRect().top;
    const availableHeight =
      composerTop !== undefined &&
      composerTop > viewportBounds.top &&
      composerTop < viewportBounds.bottom
        ? composerTop - viewportBounds.top
        : viewport.current.clientHeight - composerHeight;
    const visibleHeight = Math.max(
      120,
      availableHeight - (composerHeight ? 40 : 0),
    );
    const scale = clamp(
      Math.min(
        (viewport.current.clientWidth - 48) / (right - left),
        (visibleHeight - 48) / (bottom - top),
      ),
      0.2,
      1,
    );
    setPan(
      bounded(
        (viewport.current.clientWidth - (right - left) * scale) / 2 -
          left * scale,
        (visibleHeight - (bottom - top) * scale) / 2 - top * scale,
        scale,
      ),
    );
    onZoom(scale);
  };
  const navigation = useRef({
    pan,
    zoom,
    zoomAt,
    bounded,
    fit,
    onZoom,
    onNavigate,
  });
  navigation.current = { pan, zoom, zoomAt, bounded, fit, onZoom, onNavigate };
  const initiallyFitted = useRef(Boolean(initialPan));
  const publishView = useRef(onZoom);
  publishView.current = onZoom;
  useEffect(() => {
    if (active) publishView.current(zoom, pan);
  }, [active, zoom, pan]);
  useEffect(() => {
    if (!active || initiallyFitted.current) return;
    const frame = requestAnimationFrame(() => {
      navigation.current.fit();
      initiallyFitted.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  useEffect(() => {
    if (!fitRequest) return;
    // Allow the completed composer to resize and publish its reserved height
    // before measuring the available canvas area.
    let measurementFrame = 0;
    const frame = requestAnimationFrame(() => {
      measurementFrame = requestAnimationFrame(() => navigation.current.fit());
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measurementFrame);
    };
  }, [fitRequest]);
  useEffect(() => {
    if (!reveal || !viewport.current) return;
    const current = navigation.current;
    const target = Array.from(
      world.current?.querySelectorAll<HTMLElement>(".builder-block") ?? [],
    ).find((node) => node.dataset.nodeId === reveal.id);
    if (!target) return;
    const scale = current.zoom;
    setPan(
      current.bounded(
        viewport.current.clientWidth / 2 -
          (target.offsetLeft + target.offsetWidth / 2) * scale,
        viewport.current.clientHeight / 2 -
          (target.offsetTop + target.offsetHeight / 2) * scale,
        scale,
      ),
    );
  }, [reveal]);
  useEffect(() => {
    if (
      !active ||
      !selectedId ||
      !viewport.current ||
      viewport.current.clientWidth > 800
    )
      return;
    const current = navigation.current;
    const target = Array.from(
      world.current?.querySelectorAll<HTMLElement>(".builder-block") ?? [],
    ).find((node) => node.dataset.nodeId === selectedId);
    if (!target) return;
    const scale = Math.max(0.8, current.zoom);
    current.onZoom(scale);
    setPan(
      current.bounded(
        viewport.current.clientWidth / 2 -
          (target.offsetLeft + target.offsetWidth / 2) * scale,
        viewport.current.clientHeight * 0.2 -
          (target.offsetTop + target.offsetHeight / 2) * scale,
        scale,
      ),
    );
  }, [active, selectedId]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    // Native non-passive listener prevents browser zoom and page scroll inside this viewport.
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      navigation.current.onNavigate?.();
      const current = navigation.current;
      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect();
        current.zoomAt(
          current.zoom * Math.exp(-event.deltaY * 0.01),
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
      } else {
        const unit =
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? element.clientHeight
              : 1;
        setPan(
          current.bounded(
            current.pan.x - event.deltaX * unit,
            current.pan.y - event.deltaY * unit,
          ),
        );
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    let previousWidth = element.clientWidth;
    let previousHeight = element.clientHeight;
    const observer = new ResizeObserver(() => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width && height && previousWidth && previousHeight)
        setPan((current) =>
          navigation.current.bounded(
            current.x + (width - previousWidth) / 2,
            current.y + (height - previousHeight) / 2,
          ),
        );
      previousWidth = width;
      previousHeight = height;
    });
    observer.observe(element);
    return () => {
      element.removeEventListener("wheel", wheel);
      observer.disconnect();
    };
  }, []);
  return (
    <div className="connection-navigation">
      <div
        className="connection-camera-tools"
        role="toolbar"
        aria-label="Connection navigation"
      >
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= 0.2}
          onClick={() =>
            zoomAt(
              zoom / 1.2,
              (viewport.current?.clientWidth ?? 0) / 2,
              (viewport.current?.clientHeight ?? 0) / 2,
            )
          }
        >
          −
        </button>
        <output aria-label="Workspace zoom">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= 2}
          onClick={() =>
            zoomAt(
              zoom * 1.2,
              (viewport.current?.clientWidth ?? 0) / 2,
              (viewport.current?.clientHeight ?? 0) / 2,
            )
          }
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            fit();
          }}
        >
          Fit to content
        </button>
        <details className="connection-help">
          <summary aria-label="Canvas help">?</summary>
          <div id="connection-navigation-help">
            <strong>Move around the canvas</strong>
            <p>Drag empty space to pan. Pinch or Ctrl + scroll to zoom.</p>
            <p>Keyboard: arrow keys pan, + / − zoom, Home fits all cards.</p>
            <p>
              Click to select; double-click or use Edit to open settings.
              Shift-click cards or Shift-drag empty space to select several.
              Choose an output port, then a compatible input.
            </p>
          </div>
        </details>
      </div>
      {/* The canvas is keyboard navigable; arrows and zoom keys have explicit handlers. */}
      <section
        ref={viewport}
        className={`builder-canvas-scroll ${panning ? "is-panning" : ""}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard access is essential for pan and zoom without dragging.
        tabIndex={0}
        aria-label="Connections canvas"
        aria-describedby="connection-navigation-help"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [80, 0],
            ArrowRight: [-80, 0],
            ArrowUp: [0, 80],
            ArrowDown: [0, -80],
          };
          if (directions[event.key]) {
            event.preventDefault();
            const [x, y] = directions[event.key];
            setPan(bounded(pan.x + x, pan.y + y));
          } else if (["+", "=", "-"].includes(event.key)) {
            event.preventDefault();
            zoomAt(
              zoom * (event.key === "-" ? 1 / 1.2 : 1.2),
              event.currentTarget.clientWidth / 2,
              event.currentTarget.clientHeight / 2,
            );
          } else if (event.key === "Home") {
            event.preventDefault();
            fit();
          }
        }}
        onPointerDown={(event) => {
          onNavigate?.();
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            (event.target as Element).closest(
              ".builder-block, .connection-group, .connection-wire-hit",
            )
          )
            return;
          if (!pointers.current.size) gestureMoved.current = false;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pointers.current.size === 2) {
            gestureMoved.current = true;
            const [a, b] = Array.from(pointers.current.values());
            const rect = event.currentTarget.getBoundingClientRect();
            pinch.current = {
              distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
              x: (a.x + b.x) / 2 - rect.left,
              y: (a.y + b.y) / 2 - rect.top,
              zoom,
              pan,
            };
          }
          drag.current = {
            pointer: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: pan.x,
            top: pan.y,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
          setPanning(true);
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          const gesture = pinch.current;
          if (gesture && pointers.current.size === 2) {
            const [a, b] = Array.from(pointers.current.values());
            const rect = event.currentTarget.getBoundingClientRect();
            const scale = clamp(
              (gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                gesture.distance,
              0.2,
              2,
            );
            setPan(
              bounded(
                (a.x + b.x) / 2 -
                  rect.left -
                  ((gesture.x - gesture.pan.x) * scale) / gesture.zoom,
                (a.y + b.y) / 2 -
                  rect.top -
                  ((gesture.y - gesture.pan.y) * scale) / gesture.zoom,
                scale,
              ),
            );
            onZoom(scale);
            return;
          }
          const start = drag.current;
          if (
            start &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4
          )
            gestureMoved.current = true;
          if (start?.pointer === event.pointerId)
            setPan(
              bounded(
                start.left + event.clientX - start.x,
                start.top + event.clientY - start.y,
              ),
            );
        }}
        onPointerUp={(event) => {
          if (pointers.current.has(event.pointerId) && !gestureMoved.current)
            onBackground?.();
          endPointer(event.pointerId);
        }}
        onPointerCancel={(event) => endPointer(event.pointerId)}
      >
        <div
          ref={world}
          className="builder-canvas"
          style={{
            width: Math.max(
              worldWidth,
              ((viewport.current?.clientWidth ?? 0) - pan.x) / zoom + 1000,
            ),
            height: Math.max(
              worldHeight,
              ((viewport.current?.clientHeight ?? 0) - pan.y) / zoom + 1000,
            ),
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </section>
      {overlays}
    </div>
  );
}
