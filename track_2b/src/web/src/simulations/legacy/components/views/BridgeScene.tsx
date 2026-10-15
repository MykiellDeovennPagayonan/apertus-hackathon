import { motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { DragHandleControl } from "../controls/DragHandleControl";
import { BridgeStyles } from "../resources/BridgeStyles";
import BridgeMember from "../visuals/BeamVisual";
import { BridgeSupportVisual } from "../visuals/BridgeSupportVisual";
import { bridgeDrop } from "../visuals/bridgeDeformation";
import { LoadTruckVisual } from "../visuals/LoadTruckVisual";
import { AnimatedShapeVisual2D } from "../visuals/ShapeVisual2D";
import { LegendView } from "./LegendView";
import { SVGWorldView } from "./SVGWorldView";
import { useReducedMotion } from "./useCompactDiagram";
import "./bridge.css";

const W = 800,
  H = 400,
  DECK_Y = 240,
  LEFT_PAD = 60;
const STAGES = 6,
  revealDelay = 300,
  revealInterval = 260;

export function BridgeScene({
  state: s,
  onCommand,
  visualLayers = [
    "appearance/Beam",
    "appearance/Joint",
    "appearance/BridgeSupport",
    "appearance/LoadTruck",
  ],
}: {
  visualLayers?: string[];
  state: import("../../runtime/bridgeSession").BridgeState;
  onCommand: (
    command: import("../../runtime/types").UIAction,
  ) => import("../../../creation-and-editing/runtime-engine/commands").ActionResult;
}) {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(reducedMotion ? STAGES : 0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Rebuild restarts the assembly animation.
  useEffect(() => {
    if (reducedMotion) {
      setStage(STAGES);
      return;
    }
    const resetTimer = setTimeout(() => setStage(0), 0);
    const timers = Array.from({ length: STAGES }, (_, i) =>
      setTimeout(() => setStage(i + 1), revealDelay + i * revealInterval),
    );
    return () => {
      clearTimeout(resetTimer);
      timers.forEach(clearTimeout);
    };
  }, [s.buildNonce, reducedMotion]);

  const truss = s.truss;
  const svgId = useId();
  const spanPx = (W - LEFT_PAD * 2) * (s.spanScale === 1 ? 0.9 : 1);
  const left = (W - spanPx) / 2;
  const toPx = (x: number, y: number) => ({
    x: left + x * (spanPx / (1.6 * s.spanScale)),
    y: DECK_Y + y * 180,
  });
  const jointPx = (id: string) => {
    const j = truss.joints.find((jj) => jj.id === id);
    if (!j) throw new Error(`Unknown truss joint: ${id}`);
    const p = { x: j.x * truss.span, y: j.y * truss.height };
    return toPx(p.x, p.y);
  };

  const sag =
    (s.loadTons / 22) *
    BridgeStyles.sagScale *
    (s.removedMember ? 1.6 : 1) *
    (s.dense ? 0.65 : 1) *
    s.spanScale;

  const visibleMembers = s.response.members;

  const loadX = left + s.loadPos * spanPx;
  const loadY = DECK_Y + sag * Math.sin(Math.PI * s.loadPos);

  return (
    <div className="bridge-demo">
      <SVGWorldView
        aria-label="Bridge structure; inspect a member or move the load"
        role="group"
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", flex: 1 }}
      >
        <defs>
          <linearGradient id={`${svgId}-bridge-water`} x2="0" y2="1">
            <stop stopColor="#b9d8d4" />
            <stop offset="1" stopColor="#719e9b" />
          </linearGradient>
          <pattern
            id={`${svgId}-bridge-grid`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="#d5cdbb"
              strokeWidth="0.5"
            />
          </pattern>
          <marker
            id={`${svgId}-force-arrow`}
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0L7 3.5L0 7Z" fill="#285e56" />
          </marker>
        </defs>
        <rect
          width={W}
          height={H}
          fill={`url(#${svgId}-bridge-grid)`}
          opacity="0.15"
        />
        <path
          d="M0 323Q200 304 400 327T800 323V400H0Z"
          fill={`url(#${svgId}-bridge-water)`}
        />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M180 ${345 + i * 16}Q300 ${335 + i * 16} 440 ${345 + i * 16}T650 ${345 + i * 16}`}
            fill="none"
            stroke="#e1eeea"
            opacity="0.6"
          />
        ))}
        <text x="30" y="50" fill="var(--text-dim)" fontSize="18">
          Drag the truck or use the load position slider
        </text>
        {stage >= 1 && visualLayers.includes("appearance/BridgeSupport") && (
          <BridgeSupportVisual
            left={left}
            spanPx={spanPx}
            deckY={DECK_Y}
            width={W}
          />
        )}

        {/* deck at stage 2, remaining members at stage 4 */}
        {visibleMembers
          .filter(() => visualLayers.includes("appearance/Beam"))
          .filter((m) => (m.kind === "deck" ? stage >= 2 : stage >= 4))
          .map((m) => (
            <BridgeMember
              key={m.id}
              member={m}
              joints={truss.joints}
              toXY={(j) => {
                const p = { x: j.x * truss.span, y: j.y * truss.height };
                return toPx(p.x, p.y);
              }}
              loadPos={s.loadPos}
              response={s.response.responses[m.id]}
              sag={sag}
              selected={s.selectedMember === m.id}
              onSelect={(id) => onCommand({ type: "SELECT_MEMBER", value: id })}
            />
          ))}

        {/* joints */}
        {stage >= 3 &&
          visualLayers.includes("appearance/Joint") &&
          truss.joints.map((j) => {
            const p = jointPx(j.id);
            const drop = bridgeDrop(j.x, s.loadPos, sag);
            return (
              <AnimatedShapeVisual2D
                identity={j.id}
                key={j.id + s.buildNonce}
                cx={p.x}
                cy={p.y + drop}
                r={5}
                fill="var(--panel)"
                stroke="var(--text-dim)"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1, cx: p.x, cy: p.y + drop }}
              />
            );
          })}

        {stage >= 5 && visualLayers.includes("appearance/LoadTruck") && (
          <LoadTruckVisual
            loadX={loadX}
            loadY={loadY}
            loadTons={s.loadTons}
            showArrow={stage >= 6}
            markerId={`${svgId}-force-arrow`}
          />
        )}

        {stage >= 5 && visualLayers.includes("appearance/LoadTruck") && (
          <DragHandleControl
            onCommand={(command) => onCommand(command)}
            target={truss.load.id}
            cx={loadX}
            cy={loadY - 35}
            label="Drag bridge load"
            map={(x) => ({
              type: "MOVE_LOAD",
              value: Math.max(0.05, Math.min(0.95, (x - left) / spanPx)),
            })}
          />
        )}
        {/* legend */}
        {stage >= 6 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            fontSize={16}
          >
            <BridgeSupportVisual
              left={left}
              spanPx={spanPx}
              deckY={DECK_Y}
              width={W}
              shares={s.response.supportShares}
              markerId={`${svgId}-force-arrow`}
            />
            <text x={LEFT_PAD} y={370} fill="var(--text-dim)">
              Beam load:
            </text>
            <LegendView
              x={LEFT_PAD + 100}
              y={366}
              horizontal
              fontSize={16}
              gap={75}
              entries={[
                { label: "low", color: BridgeStyles.lowColor },
                { label: "medium", color: BridgeStyles.mediumColor },
                { label: "high", color: BridgeStyles.highColor },
              ]}
            />
          </motion.g>
        )}
      </SVGWorldView>
    </div>
  );
}

export default BridgeScene;
