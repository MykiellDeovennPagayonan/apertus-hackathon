import { motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { useBridgeStore } from "../../runtime/bridgeSession";
import { dispatchCommand } from "../../runtime/session";
import { BridgeExperiment } from "../compositions/BridgeExperiment";
import { DragHandleControl } from "../controls/DragHandleControl";
import { selectMember } from "../controls/SelectionControl";
import { BridgeStyles } from "../resources/BridgeStyles";
import BridgeMember from "../visuals/BeamVisual";
import { BridgeSupportVisual } from "../visuals/BridgeSupportVisual";
import { bridgeDrop } from "../visuals/bridgeDeformation";
import { LoadTruckVisual } from "../visuals/LoadTruckVisual";
import { AnimatedShapeVisual2D } from "../visuals/ShapeVisual2D";
import { LegendView } from "./LegendView";
import { MemberInspector } from "./MemberInspector";
import { SVGWorldView } from "./SVGWorldView";
import "./bridge.css";

const {
  width: W,
  height: H,
  deckY: DECK_Y,
  leftPad: LEFT_PAD,
  revealStages: STAGES,
  revealDelay,
  revealInterval,
} = BridgeExperiment.viewSettings;

export function BridgeScene() {
  const s = useBridgeStore();
  const [stage, setStage] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Rebuild restarts the assembly animation.
  useEffect(() => {
    const resetTimer = setTimeout(() => setStage(0), 0);
    const timers = Array.from({ length: STAGES }, (_, i) =>
      setTimeout(() => setStage(i + 1), revealDelay + i * revealInterval),
    );
    return () => {
      clearTimeout(resetTimer);
      timers.forEach(clearTimeout);
    };
  }, [s.buildNonce]);

  const truss = s.truss;
  const svgId = useId();
  const spanPx = (W - LEFT_PAD * 2) * (s.spanScale === 1 ? 0.68 : 1);
  const left = (W - spanPx) / 2;
  const toPx = (x: number, y: number) => ({
    x: left + x * (spanPx / (1.6 * s.spanScale)),
    y: DECK_Y + y * 140,
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
  const sel = s.selectedMember
    ? visibleMembers.find((m) => m.id === s.selectedMember)
    : null;

  return (
    <div className="bridge-demo">
      <SVGWorldView
        aria-label="Simulation diagram"
        role="img"
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
          opacity="0.5"
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
        <text x="30" y="65" fill="var(--text-dim)" fontSize="11">
          STRUCTURAL LAB / {s.spanScale * 30} m span · {truss.panels} panels
        </text>
        {stage >= 1 && (
          <BridgeSupportVisual
            left={left}
            spanPx={spanPx}
            deckY={DECK_Y}
            width={W}
          />
        )}

        {/* deck at stage 2, remaining members at stage 4 */}
        {visibleMembers
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
              onSelect={selectMember}
            />
          ))}

        {/* joints */}
        {stage >= 3 &&
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

        {stage >= 5 && (
          <LoadTruckVisual
            loadX={loadX}
            loadY={loadY}
            loadTons={s.loadTons}
            showArrow={stage >= 6}
            markerId={`${svgId}-force-arrow`}
          />
        )}

        {stage >= 5 && (
          <DragHandleControl
            onCommand={(command) => dispatchCommand("bridge", command)}
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
            fontSize={11}
          >
            <BridgeSupportVisual
              left={left}
              spanPx={spanPx}
              deckY={DECK_Y}
              width={W}
              shares={s.response.supportShares}
              markerId={`${svgId}-force-arrow`}
            />
            <text x={LEFT_PAD} y={30} fill="var(--text-dim)">
              Response score:
            </text>
            <LegendView
              x={LEFT_PAD + 95}
              y={26}
              horizontal
              gap={55}
              entries={[
                { label: "low", color: BridgeStyles.lowColor },
                { label: "med", color: BridgeStyles.mediumColor },
                { label: "high", color: BridgeStyles.highColor },
              ]}
            />
            <text x={W - 30} y={30} textAnchor="end" fill="var(--text-dim)">
              solid: compression · dashed: tension
            </text>
          </motion.g>
        )}
      </SVGWorldView>

      {sel && (
        <MemberInspector member={sel} response={s.response.responses[sel.id]} />
      )}
    </div>
  );
}

export default BridgeScene;
