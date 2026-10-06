import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import type {
  CompositionScene,
  DisplayBounds,
  GasObject,
  SceneObject,
} from "../../runtime/composition/index";
import { fractionValue } from "../contracts/composition";
import { FractionBar } from "../prefabs/MathBoards";
import {
  GasParticleIllustrationSystem,
  gasParticles,
} from "../systems/GasParticleIllustrationSystem";
import { FractionBarVisual } from "../visuals/FractionBarVisual";
import { GasContainerVisual } from "../visuals/GasContainerVisual";
import { GasParticleVisual } from "../visuals/GasParticleVisual";
import { canvasAppearance, SceneToolbar } from "./SceneToolbar";
import { useReducedMotion } from "./useCompactDiagram";

type DisplayObject = Extract<SceneObject, { kind: "gas" | "fraction-bar" }>;
function GasIllustration({
  object,
  active,
}: {
  object: GasObject;
  active: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [particles, setParticles] = useState(() =>
    gasParticles(object.inputs.amount),
  );
  useEffect(() => {
    setParticles(gasParticles(object.inputs.amount));
  }, [object.inputs.amount]);
  useEffect(() => {
    if (reducedMotion || !active || !object.inputs.playing || !object.particles)
      return;
    let frame = 0,
      previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) {
        const delta = (now - previous) / 1000;
        setParticles((current) =>
          GasParticleIllustrationSystem(current, object.inputs, delta),
        );
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, object.inputs, object.particles, reducedMotion]);
  return (
    <svg
      x={object.display.x}
      y={object.display.y}
      width={object.display.width}
      height={object.display.height}
      viewBox="0 0 600 290"
      preserveAspectRatio="xMidYMid meet"
      style={{ "--accent": object.color } as CSSProperties}
    >
      <title>{`${object.label}: gas container with representative particles`}</title>
      <GasContainerVisual volume={object.inputs.volume}>
        {object.particles &&
          particles.map((p) => (
            <GasParticleVisual
              key={p.id}
              particle={p}
              volume={object.inputs.volume}
            />
          ))}
      </GasContainerVisual>
    </svg>
  );
}

/** Presentation geometry is independent of domain configuration and graph card positions. */
export function DisplayView({
  scene,
  selected,
  authoring,
  active,
  resetToken,
  onSelect,
  onChange,
  onCommit,
  onCanvasCommit,
  onPiece,
}: {
  scene: CompositionScene;
  selected: string;
  authoring: boolean;
  active: boolean;
  resetToken: string;
  onSelect: (id: string) => void;
  onChange: (o: SceneObject) => void;
  onCommit: (o: SceneObject) => void;
  onCanvasCommit?: (
    viewport: Pick<
      CompositionScene["canvas"],
      "xMin" | "xMax" | "yMin" | "yMax"
    >,
  ) => void;
  onPiece: (id: string, index: number) => ActionResult;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const canvasKey = JSON.stringify(scene.canvas);
  const authoredView = useMemo(
    () => JSON.parse(canvasKey) as CompositionScene["canvas"],
    [canvasKey],
  );
  const [view, setView] = useState(authoredView);
  const initialAuthorView = useRef(authoredView);
  useEffect(() => {
    setView(authoredView);
  }, [authoredView]);
  const applyView = (next: CompositionScene["canvas"], commit = authoring) => {
    setView(next);
    if (commit)
      onCanvasCommit?.({
        xMin: next.xMin,
        xMax: next.xMax,
        yMin: next.yMin,
        yMax: next.yMax,
      });
  };
  const objects = scene.objects.filter(
    (o): o is DisplayObject => o.kind === "gas" || o.kind === "fraction-bar",
  );
  const drag = useRef<{
    object: DisplayObject;
    mode: "move" | "resize";
    start: { x: number; y: number };
    latest: DisplayObject;
  } | null>(null);
  const pan = useRef<{
    x: number;
    y: number;
    bounds: typeof view;
    latest: typeof view;
  } | null>(null);
  const clip = useId().replace(/:/g, "");
  const point = (e: { clientX: number; clientY: number }) => {
    const node = svg.current,
      matrix = node?.getScreenCTM();
    if (!node || !matrix) return null;
    const p = node.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(matrix.inverse());
  };
  const snap = (v: number) =>
    scene.canvas.snap
      ? Math.round(v / scene.canvas.snap) * scene.canvas.snap
      : v;
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  const begin = (
    e: PointerEvent<SVGElement>,
    o: DisplayObject,
    resize: boolean,
  ) => {
    if (!authoring || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const start = point(e);
    if (!start) return;
    onSelect(o.id);
    drag.current = {
      object: structuredClone(o),
      latest: o,
      mode: resize ? "resize" : "move",
      start,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<SVGElement>) => {
    const d = drag.current,
      p = point(e);
    if (!d || !p) return;
    const dx = p.x - d.start.x,
      dy = p.y - d.start.y,
      display = { ...d.object.display };
    if (d.mode === "move") {
      display.x = clamp(snap(display.x + dx), -100, 100);
      display.y = clamp(snap(display.y + dy), -100, 100);
    } else {
      display.width = clamp(snap(display.width + dx), 5, 100);
      display.height = clamp(snap(display.height + dy), 5, 100);
    }
    const next = { ...d.object, display };
    d.latest = next;
    onChange(next);
  };
  const end = (cancel: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (cancel) onChange(d.object);
    else onCommit(d.latest);
  };
  const keyMove = (
    e: KeyboardEvent<SVGElement>,
    o: DisplayObject,
    resize: boolean,
  ) => {
    if (e.key === "Escape") {
      end(true);
      return;
    }
    if (
      !authoring ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    )
      return;
    e.preventDefault();
    const step = (scene.canvas.snap || 1) * (e.shiftKey ? 10 : 1),
      display = { ...o.display };
    const horizontal = e.key === "ArrowLeft" || e.key === "ArrowRight";
    const axis: keyof DisplayBounds = resize
      ? horizontal
        ? "width"
        : "height"
      : horizontal
        ? "x"
        : "y";
    display[axis] = clamp(
      display[axis] +
        (e.key === "ArrowLeft" || e.key === "ArrowUp" ? -step : step),
      resize ? 5 : -100,
      100,
    );
    const next = { ...o, display };
    onChange(next);
    onCommit(next);
  };
  const handleEvents = (o: DisplayObject, resize = false) => ({
    onPointerDown: (e: PointerEvent<SVGElement>) => begin(e, o, resize),
    onPointerMove: move,
    onPointerUp: () => end(false),
    onPointerCancel: () => end(true),
    onLostPointerCapture: () => end(true),
    onKeyDown: (e: KeyboardEvent<SVGElement>) => keyMove(e, o, resize),
  });
  const zoom = (factor: number) => {
    const w = clamp((view.xMax - view.xMin) * factor, 10, 300),
      h = clamp((view.yMax - view.yMin) * factor, 10, 300),
      cx = (view.xMax + view.xMin) / 2,
      cy = (view.yMax + view.yMin) / 2;
    applyView({
      ...view,
      xMin: cx - w / 2,
      xMax: cx + w / 2,
      yMin: cy - h / 2,
      yMax: cy + h / 2,
    });
  };
  const resetView = () =>
    applyView(authoring ? initialAuthorView.current : authoredView);
  const fitObjects = () => {
    if (!objects.length) return resetView();
    const xMin = Math.min(...objects.map((object) => object.display.x));
    const xMax = Math.max(
      ...objects.map((object) => object.display.x + object.display.width),
    );
    const yMin = Math.min(...objects.map((object) => object.display.y));
    const yMax = Math.max(
      ...objects.map((object) => object.display.y + object.display.height),
    );
    const padding = Math.max(5, Math.max(xMax - xMin, yMax - yMin) * 0.12);
    applyView({
      ...scene.canvas,
      xMin: xMin - padding,
      xMax: xMax + padding,
      yMin: yMin - padding,
      yMax: yMax + padding,
    });
  };
  return (
    <div className="composition-display-scene">
      {scene.canvas.showNavigation === true && (
        <SceneToolbar
          label="Canvas navigation"
          actions={[
            { icon: "zoom-in", label: "Zoom in", onClick: () => zoom(0.8) },
            {
              icon: "zoom-out",
              label: "Zoom out",
              onClick: () => zoom(1.25),
            },
            {
              icon: "reset",
              label: "Reset view",
              onClick: resetView,
            },
            {
              icon: "fit",
              label: "Fit objects in view",
              disabled: objects.length === 0,
              onClick: fitObjects,
            },
          ]}
          className="composition-display-tools"
        />
      )}
      {/* biome-ignore lint/a11y/useSemanticElements: SVG is the interactive canvas, not an HTML fieldset. */}
      <svg
        ref={svg}
        className="composition-display scene-frame"
        style={canvasAppearance(scene.canvas)}
        viewBox={`${view.xMin} ${view.yMin} ${view.xMax - view.xMin} ${view.yMax - view.yMin}`}
        role="group"
        aria-label={
          scene.kind === "physical"
            ? "Physical canvas with independent gas containers"
            : "Diagram canvas with independent fraction bars"
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") end(true);
        }}
      >
        <defs>
          <clipPath id={clip}>
            <rect
              x={view.xMin}
              y={view.yMin}
              width={view.xMax - view.xMin}
              height={view.yMax - view.yMin}
            />
          </clipPath>
          <pattern
            id={`${clip}-grid`}
            width={5}
            height={5}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 5 0 H 0 V 5"
              fill="none"
              stroke="#e4e7ed"
              strokeWidth={0.15}
            />
          </pattern>
        </defs>
        <rect
          x={view.xMin}
          y={view.yMin}
          width={view.xMax - view.xMin}
          height={view.yMax - view.yMin}
          fill={
            scene.canvas.grid
              ? `url(#${clip}-grid)`
              : (scene.canvas.backgroundColor ?? "transparent")
          }
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            onSelect("");
            pan.current = {
              x: e.clientX,
              y: e.clientY,
              bounds: view,
              latest: view,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const p = pan.current,
              rect = svg.current?.getBoundingClientRect();
            if (!p || !rect) return;
            const scale = Math.min(
                rect.width / (p.bounds.xMax - p.bounds.xMin),
                rect.height / (p.bounds.yMax - p.bounds.yMin),
              ),
              dx = (e.clientX - p.x) / scale,
              dy = (e.clientY - p.y) / scale;
            const next = {
              ...p.bounds,
              xMin: p.bounds.xMin - dx,
              xMax: p.bounds.xMax - dx,
              yMin: p.bounds.yMin - dy,
              yMax: p.bounds.yMax - dy,
            };
            p.latest = next;
            setView(next);
          }}
          onPointerUp={() => {
            if (pan.current && authoring) applyView(pan.current.latest);
            pan.current = null;
          }}
          onPointerCancel={() => {
            if (pan.current) setView(pan.current.bounds);
            pan.current = null;
          }}
        />
        <g clipPath={`url(#${clip})`}>
          {objects.map((o) => {
            const titleHeight =
              o.kind === "fraction-bar" ? Math.min(4, o.display.height / 3) : 4;
            const pieceTop = titleHeight + Math.min(1, o.display.height / 12);
            return (
              <g key={o.id} data-display-object={o.id}>
                {o.kind === "gas" ? (
                  <GasIllustration
                    object={o}
                    active={active}
                    key={resetToken}
                  />
                ) : (
                  <>
                    <text
                      x={o.display.x}
                      y={o.display.y + titleHeight * 0.75}
                      fontSize={Math.min(2.8, titleHeight * 0.7)}
                      fill={o.color}
                    >
                      {o.label} · {fractionValue(o).n}/{fractionValue(o).d}
                    </text>
                    <g
                      className="composition-fraction-pieces"
                      style={{ "--fraction-color": o.color } as CSSProperties}
                      transform={`translate(${o.display.x} ${o.display.y + pieceTop}) scale(${o.display.width / 780} ${(o.display.height - pieceTop) / 90})`}
                    >
                      <FractionBarVisual
                        bar={{
                          ...FractionBar(
                            o.id,
                            fractionValue(o).n,
                            o.shaded.length,
                          ),
                          shaded: o.shaded,
                        }}
                        y={0}
                        left={0}
                        barWidth={780}
                        height={90}
                        label={o.label}
                        interactive={o.interactive}
                        onPiece={(i) => onPiece(o.id, i)}
                      />
                    </g>
                  </>
                )}
                {authoring && (
                  // biome-ignore lint/a11y/useSemanticElements: Focusable SVG handle supports pointer capture and keyboard movement.
                  <rect
                    x={o.display.x}
                    y={o.display.y}
                    width={o.display.width}
                    height={titleHeight}
                    fill="transparent"
                    stroke={selected === o.id ? o.color : "transparent"}
                    strokeWidth={0.3}
                    role="button"
                    tabIndex={0}
                    aria-label={`Move ${o.label}`}
                    onClick={() => onSelect(o.id)}
                    {...handleEvents(o)}
                  />
                )}
                {authoring && selected === o.id && (
                  <>
                    <rect
                      x={o.display.x}
                      y={o.display.y}
                      width={o.display.width}
                      height={o.display.height}
                      fill="none"
                      stroke={o.color}
                      strokeWidth={0.3}
                      pointerEvents="none"
                    />
                    {/* biome-ignore lint/a11y/useSemanticElements: Focusable SVG resize handle. */}
                    <rect
                      x={o.display.x + o.display.width - 1.5}
                      y={o.display.y + o.display.height - 1.5}
                      width={3}
                      height={3}
                      fill={o.color}
                      role="button"
                      tabIndex={0}
                      aria-label={`Resize ${o.label}`}
                      {...handleEvents(o, true)}
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {scene.canvas.showAbout === true && (
        <details className="composition-interaction-help scene-guidance scene-help">
          <summary>About this scene</summary>
          <p>
            {scene.kind === "physical"
              ? "Pressure follows the ideal-gas model. Particles illustrate motion. Display size does not set volume."
              : "Each bar represents one equal whole. Tap or use the keyboard on pieces to shade them. Display width does not change the fraction."}
          </p>
        </details>
      )}
    </div>
  );
}
