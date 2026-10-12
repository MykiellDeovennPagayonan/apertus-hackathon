"use client";
import {
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CompositionScene } from "../../runtime/composition/types";
import "./scene-ui.css";

export function canvasAppearance(
  canvas: CompositionScene["canvas"],
): CSSProperties {
  return {
    background: canvas.backgroundColor ?? "transparent",
    borderColor: canvas.borderColor ?? "transparent",
    boxShadow: canvas.borderColor ? undefined : "none",
  };
}

export type SceneIconName =
  | "move"
  | "edit"
  | "resize"
  | "expand"
  | "fit"
  | "pan"
  | "reset"
  | "rotate-left"
  | "rotate-right"
  | "zoom-in"
  | "zoom-out";

export type SceneAction = {
  icon: SceneIconName;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  pressed?: boolean;
};

export function SceneIcon({ name }: { name: SceneIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      {name === "move" ? (
        <path
          {...common}
          d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"
        />
      ) : name === "edit" ? (
        <path {...common} d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14v6Z" />
      ) : name === "resize" ? (
        <path {...common} d="m10 19 9-9M15 19l4-4" />
      ) : name === "zoom-in" || name === "zoom-out" ? (
        <>
          <circle {...common} cx="10.5" cy="10.5" r="6.5" />
          <path {...common} d="m15.2 15.2 4.3 4.3M7.5 10.5h6" />
          {name === "zoom-in" && <path {...common} d="M10.5 7.5v6" />}
        </>
      ) : name === "reset" ? (
        <>
          <path {...common} d="M5.1 7.3A8 8 0 1 1 4.4 15" />
          <path {...common} d="M4.8 3.8v4.3h4.3" />
        </>
      ) : name === "fit" ? (
        <path {...common} d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />
      ) : name === "expand" ? (
        <path
          {...common}
          d="M4 9V4h5M4 4l6 6M15 4h5v5m0-5-6 6M4 15v5h5m-5 0 6-6m10 1v5h-5m5 0-6-6"
        />
      ) : name === "pan" ? (
        <path
          {...common}
          d="M8.5 11V6.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V10m0-2a1.5 1.5 0 0 1 3 0v4m0-2a1.5 1.5 0 0 1 3 0v3.5c0 4-2.5 6.5-6.5 6.5h-1.2a6 6 0 0 1-4.3-1.8l-4-4a1.6 1.6 0 0 1 2.3-2.2l1.7 1.5V11Z"
        />
      ) : name === "rotate-left" ? (
        <>
          <path {...common} d="M5.1 7.3A8 8 0 1 1 4.4 15" />
          <path {...common} d="M4.8 3.8v4.3h4.3" />
        </>
      ) : (
        <>
          <path {...common} d="M18.9 7.3A8 8 0 1 0 19.6 15" />
          <path {...common} d="M19.2 3.8v4.3h-4.3" />
        </>
      )}
    </svg>
  );
}

export function SceneIconButton({
  icon,
  label,
  onClick,
  disabled,
  pressed,
  className = "",
}: SceneAction & { className?: string }) {
  return (
    <button
      type="button"
      className={`scene-icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <SceneIcon name={icon} />
    </button>
  );
}

export function SceneToolbar({
  label,
  actions,
  children,
  overlay = false,
  className = "",
}: {
  label: string;
  actions: SceneAction[];
  children?: ReactNode;
  overlay?: boolean;
  className?: string;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const toolbar = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; offset: typeof offset } | null>(
    null,
  );
  useEffect(() => {
    const element = toolbar.current;
    const parent = element?.closest(
      ".composition-display-scene, .composition-plane, .composition-town, .spatial-board",
    );
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      const bounds = parent.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const scale = box.width / Math.max(1, element.offsetWidth);
      setOffset((current) => {
        const x =
          current.x +
          (box.left < bounds.left
            ? bounds.left - box.left
            : box.right > bounds.right
              ? bounds.right - box.right
              : 0) /
            scale;
        const y =
          current.y +
          (box.top < bounds.top
            ? bounds.top - box.top
            : box.bottom > bounds.bottom
              ? bounds.bottom - box.bottom
              : 0) /
            scale;
        return Math.abs(x - current.x) > 0.5 || Math.abs(y - current.y) > 0.5
          ? { x, y }
          : current;
      });
    });
    observer.observe(parent);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const reposition = (x: number, y: number) => {
    const element = toolbar.current;
    const parent = element?.closest(
      ".composition-display-scene, .composition-plane, .composition-town, .spatial-board",
    );
    if (!element || !parent) return;
    const bounds = parent.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    // Bounds are measured on screen, while offset is in the scene's local coordinates.
    const scale = box.width / Math.max(1, element.offsetWidth);
    setOffset({
      x: Math.max(
        offset.x + (bounds.left - box.left) / scale,
        Math.min(offset.x + (bounds.right - box.right) / scale, x),
      ),
      y: Math.max(
        offset.y + (bounds.top - box.top) / scale,
        Math.min(offset.y + (bounds.bottom - box.bottom) / scale, y),
      ),
    });
  };
  return (
    <div
      ref={toolbar}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
      className={`scene-toolbar ${overlay ? "scene-toolbar--overlay" : ""} ${className}`.trim()}
      role="toolbar"
      aria-label={label}
    >
      <button
        type="button"
        className="scene-icon-button scene-toolbar-grip"
        aria-label={`Move ${label.toLowerCase()} tools`}
        title="Drag to move tools · Arrow keys to position · Escape to restore"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          drag.current = { x: event.clientX, y: event.clientY, offset };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          const element = toolbar.current;
          const scale = element
            ? element.getBoundingClientRect().width /
              Math.max(1, element.offsetWidth)
            : 1;
          reposition(
            start.offset.x + (event.clientX - start.x) / scale,
            start.offset.y + (event.clientY - start.y) / scale,
          );
        }}
        onPointerUp={(event) => {
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          if (drag.current) setOffset(drag.current.offset);
          drag.current = null;
        }}
        onDoubleClick={() => setOffset({ x: 0, y: 0 })}
        onKeyDown={(event) => {
          const delta: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          if (event.key === "Escape") {
            event.preventDefault();
            setOffset(drag.current?.offset ?? { x: 0, y: 0 });
            drag.current = null;
          }
          if (delta[event.key]) {
            event.preventDefault();
            event.stopPropagation();
            const [x, y] = delta[event.key];
            reposition(
              offset.x + x * (event.shiftKey ? 10 : 4),
              offset.y + y * (event.shiftKey ? 10 : 4),
            );
          }
        }}
      >
        <SceneIcon name="move" />
      </button>
      {actions.map((action) => (
        <SceneIconButton key={action.label} {...action} />
      ))}
      {children}
    </div>
  );
}
