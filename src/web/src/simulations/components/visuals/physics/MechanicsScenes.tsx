"use client";

import type { ReactNode } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import { buoyancyMeasure, buoyancyState } from "../../systems/physics/buoyancy";
import {
  collisionMeasure,
  collisionState,
} from "../../systems/physics/collision";
import { flowMeasure, flowState } from "../../systems/physics/flow";
import { gearsMeasure, gearsState } from "../../systems/physics/gears";
import {
  hydraulicsMeasure,
  hydraulicsState,
} from "../../systems/physics/hydraulics";
import {
  parachuteMeasure,
  parachuteState,
} from "../../systems/physics/parachute";
import { pressureMeasure, pressureState } from "../../systems/physics/pressure";
import { pulleyMeasure, pulleyState } from "../../systems/physics/pulley";
import { tippingMeasure, tippingState } from "../../systems/physics/tipping";
import "./mechanics.css";

const fmt = (v: number) => Number(v.toPrecision(3)).toString();
function Scene({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="mechanics-scene">
      <svg viewBox="0 0 680 340" role="img" aria-label={title}>
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
function Arrow({
  x,
  y,
  dx = 0,
  dy = 0,
  label,
}: {
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  label: string;
}) {
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x + dx}
        y2={y + dy}
        stroke="currentColor"
        strokeWidth="3"
      />
      {(dx !== 0 || dy !== 0) && (
        <path
          d="M-9 -5L0 0L-9 5"
          transform={`translate(${x + dx} ${y + dy}) rotate(${angle})`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
      )}
      <text x={x} y={y - 12}>
        {label}
      </text>
    </g>
  );
}
export function PulleyScene({ instance }: { instance: ModelInstance }) {
  const s = pulleyState(instance.state),
    o = pulleyMeasure(s);
  const y = 235 - o.rise * 60,
    handle = 100 + s.pull * 60;
  const path =
    s.strands === 1
      ? `M130 ${y}V65Q150 25 170 65V${handle}`
      : s.strands === 2
        ? `M130 40V${y}Q150 ${y + 40} 170 ${y}V65Q190 25 210 65V${handle}`
        : `M110 40V${y}Q130 ${y + 40} 150 ${y}V65Q170 25 190 65V${y}Q210 ${y + 40} 230 ${y}V65Q250 25 270 65V${handle}`;
  return (
    <Scene
      title={`${s.strands} supporting strands; pull ${fmt(o.tension)} N to lift ${fmt(o.rise)} m`}
      caption={`${s.strands} strands support the load. Pull ${fmt(s.pull)} m of rope: the load rises ${fmt(o.rise)} m. Ideal work stays equal.`}
    >
      <line
        x1="85"
        x2="300"
        y1="40"
        y2="40"
        stroke="currentColor"
        strokeWidth="6"
      />
      {(s.strands === 4 ? [170, 250] : [s.strands === 1 ? 150 : 190]).map(
        (x) => (
          <circle
            key={x}
            cx={x}
            cy="65"
            r="20"
            fill="var(--panel)"
            stroke="currentColor"
            strokeWidth="3"
          />
        ),
      )}
      {s.strands > 1 &&
        (s.strands === 4 ? [130, 210] : [150]).map((x) => (
          <circle
            key={x}
            cx={x}
            cy={y}
            r="20"
            fill="var(--panel)"
            stroke="currentColor"
            strokeWidth="3"
          />
        ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="5" />
      <path
        d={
          s.strands === 1
            ? `M130 ${y}V${y + 35}`
            : s.strands === 2
              ? `M150 ${y}V${y + 35}`
              : `M130 ${y}V${y + 35}H210V${y}`
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect
        x={s.strands === 1 ? 100 : 130}
        y={y + 35}
        width="90"
        height="45"
        rx="5"
        fill="#b78242"
      />
      <text x="85" y="325">
        Load {fmt(s.loadForce)} N
      </text>
      <Arrow
        x={s.strands === 4 ? 270 : s.strands === 2 ? 210 : 170}
        y={handle}
        dy={35}
        label={`${fmt(o.tension)} N pull`}
      />
      <text x="365" y="75">
        {s.strands} supporting strands
      </text>
      <text x="365" y="285">
        Load rise {fmt(o.rise)} m
      </text>
    </Scene>
  );
}
export function GearsScene({ instance }: { instance: ModelInstance }) {
  const s = gearsState(instance.state),
    o = gearsMeasure(s),
    r1 = s.front * 1.2,
    r2 = s.rear * 1.2;
  const phi = Math.acos((r1 - r2) / 230),
    tx = Math.cos(phi),
    ty = Math.sin(phi);
  return (
    <Scene
      title={`Uncrossed chain: ${s.front} front teeth, ${s.rear} rear teeth. Wheel turns ${fmt(o.ratio)} times per pedal turn.`}
      caption={`One pedal turn moves ${fmt(o.distancePerTurn)} m. The wheel gets ${fmt(o.torqueRatio)} times the pedal torque; both turn in the same direction.`}
    >
      <circle
        cx="430"
        cy="175"
        r="110"
        fill="none"
        stroke="var(--border)"
        strokeWidth="5"
      />
      <path
        d={`M${200 + r1 * tx} ${175 - r1 * ty}L${430 + r2 * tx} ${175 - r2 * ty}A${r2} ${r2} 0 1 1 ${430 + r2 * tx} ${175 + r2 * ty}L${200 + r1 * tx} ${175 + r1 * ty}A${r1} ${r1} 0 1 1 ${200 + r1 * tx} ${175 - r1 * ty}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
      />
      {[
        [200, r1, s.turns, s.front],
        [430, r2, o.wheelTurns, s.rear],
      ].map(([x, r, turns, teeth]) => (
        <g key={x}>
          <circle
            cx={x}
            cy="175"
            r={r - 4}
            fill="var(--panel)"
            stroke="currentColor"
            strokeWidth="3"
          />
          <line
            x1={x}
            y1="175"
            x2={x + (r - 6) * Math.cos(turns * 2 * Math.PI)}
            y2={175 + (r - 6) * Math.sin(turns * 2 * Math.PI)}
            stroke="#996018"
            strokeWidth="5"
          />
          <text x={x} y="320" textAnchor="middle">
            {teeth} teeth · {fmt(turns)} turns
          </text>
        </g>
      ))}
      <text x="340" y="35" textAnchor="middle">
        Distance travelled {fmt(o.distance)} m
      </text>
    </Scene>
  );
}
export function TippingScene({ instance }: { instance: ModelInstance }) {
  const s = tippingState(instance.state),
    o = tippingMeasure(s),
    scale = Math.min(230 / s.height, 280 / s.width);
  const theta = (s.tilt * Math.PI) / 180,
    cx = 380 + o.gravityX * scale,
    cy =
      290 -
      ((s.width / 2) * Math.sin(theta) + o.centreHeight * Math.cos(theta)) *
        scale;
  return (
    <Scene
      title={`Centre of mass at ${fmt(o.centreHeight)} m; tips beyond ${fmt(o.criticalAngle)} degrees. ${o.tipped ? "Gravity overturns" : "Gravity restores"}.`}
      caption={`${o.tipped ? "The weight now pulls beyond the supporting edge." : "The weight acts inside the supporting edge."} Critical tilt ${fmt(o.criticalAngle)}°. Slowly tilted; sliding is excluded.`}
    >
      <line
        x1="60"
        x2="620"
        y1="292"
        y2="292"
        stroke="currentColor"
        strokeWidth="3"
      />
      <g transform={`translate(380 290) rotate(${s.tilt})`}>
        <rect
          x={-s.width * scale}
          y={-s.height * scale}
          width={s.width * scale}
          height={s.height * scale}
          fill="var(--panel)"
          stroke="currentColor"
          strokeWidth="4"
        />
        <line
          x1={-s.width * scale}
          x2="0"
          y1={-s.loadHeight * scale}
          y2={-s.loadHeight * scale}
          stroke="#996018"
          strokeWidth="7"
        />
      </g>
      <line
        x1={cx}
        x2={cx}
        y1={cy}
        y2="305"
        stroke="var(--accent)"
        strokeDasharray="6 4"
        strokeWidth="3"
      />
      <circle cx={cx} cy={cy} r="8" fill="var(--accent)" />
      <circle cx="380" cy="290" r="6" fill="#996018" />
      <text x="65" y="35">
        Centre of mass {fmt(o.centreHeight)} m
      </text>
      <text x="440" y="315">
        Support edge
      </text>
    </Scene>
  );
}
export function CollisionScene({ instance }: { instance: ModelInstance }) {
  const s = collisionState(instance.state),
    o = collisionMeasure(s),
    after = s.collided && o.approaching;
  const speedScale = Math.min(
      8,
      100 / Math.max(Math.abs(o.velocity1), Math.abs(o.velocity2), 1),
    ),
    x1 = 250 + (after ? o.velocity1 * speedScale : 0),
    x2 = after ? 334 + o.velocity2 * speedScale : 350;
  return (
    <Scene
      title={`${after ? "After" : "Before"} collision. Velocities ${fmt(o.velocity1)} and ${fmt(o.velocity2)} metres per second; total momentum ${fmt(o.finalMomentum)} kilogram metres per second.`}
      caption={
        !o.approaching
          ? "The left cart is not catching the right cart, so no impact occurs."
          : after
            ? `${fmt(o.internalEnergy)} J moved from motion into internal energy. Total momentum stays ${fmt(o.momentum)} kg·m/s.`
            : "Choose starting speeds, then collide the carts. Rightward velocity is positive."
      }
    >
      <line
        x1="45"
        x2="635"
        y1="240"
        y2="240"
        stroke="currentColor"
        strokeWidth="3"
      />
      {[
        [x1, s.mass1, o.velocity1],
        [x2, s.mass2, o.velocity2],
      ].map(([x, m, v], i) => (
        <g key={i === 0 ? "left" : "right"}>
          <rect
            x={x - 42}
            y={185 - 10 * Math.sqrt(m)}
            width="84"
            height={40 + 10 * Math.sqrt(m)}
            rx="5"
            fill={i ? "#b78242" : "var(--accent)"}
          />
          <text x={x} y="280" textAnchor="middle">
            {fmt(m)} kg
          </text>
          <Arrow
            x={x}
            y={i === 0 ? 115 : 85}
            dx={Math.max(-140, Math.min(140, v * 13))}
            label={`${fmt(v)} m/s`}
          />
        </g>
      ))}
      <text x="340" y="35" textAnchor="middle">
        {after ? "After impact" : "Before impact"} · motion energy{" "}
        {fmt(o.kineticEnergy)} J
      </text>
    </Scene>
  );
}
export function BuoyancyScene({ instance }: { instance: ModelInstance }) {
  const s = buoyancyState(instance.state),
    o = buoyancyMeasure(s);
  const bottom = o.floats ? 140 + (100 * o.draft) / s.hullHeight : 285,
    top = bottom - 100;
  return (
    <Scene
      title={`Hull ${o.floats ? "floats" : "sinks"}, displacing ${fmt(o.displacedVolume)} cubic metres. Same-material solid block ${o.solidFloats ? "floats" : "sinks"}.`}
      caption={`${s.flooded ? "Floodwater fills the hollow space; only material volume excludes water." : "The sealed hull excludes water from its hollow space."} ${o.floats ? "Buoyancy balances weight." : "Even full submersion cannot balance the weight."}`}
    >
      <rect x="55" y="140" width="570" height="160" fill="#c2dce0" />
      <line
        x1="55"
        x2="625"
        y1="140"
        y2="140"
        stroke="var(--accent)"
        strokeWidth="3"
      />
      <path
        d={`M290 ${top}V${bottom}H510V${top}`}
        fill={s.flooded ? "#c2dce0" : "var(--panel)"}
        stroke="currentColor"
        strokeWidth="8"
      />
      <rect
        x="110"
        y={
          o.solidFloats
            ? 105 + (35 * s.mass) / (s.density * s.materialVolume)
            : 260
        }
        width="40"
        height="35"
        fill="#767e80"
      />
      <text x="130" y="325" textAnchor="middle">
        Solid block
      </text>
      <text x="400" y="325" textAnchor="middle">
        {s.flooded ? "Flooded" : "Sealed"} hull
      </text>
      <text x="340" y="32" textAnchor="middle">
        Displaced water {fmt(o.displacedVolume)} m³
      </text>
      <Arrow x={320} y={95} dy={30} label={`Weight ${fmt(o.weight)} N`} />
      <Arrow
        x={510}
        y={100}
        dy={(-30 * o.buoyantForce) / o.weight}
        label={`Buoyancy ${fmt(o.buoyantForce)} N`}
      />
    </Scene>
  );
}
export function PressureScene({ instance }: { instance: ModelInstance }) {
  const s = pressureState(instance.state),
    o = pressureMeasure(s),
    scale = 220 / s.surfaceHeight;
  const holeY = 290 - s.holeHeight * scale;
  const path = Array.from({ length: 25 }, (_, i) => {
    const t = (o.flightTime * i) / 24;
    return `${i ? "L" : "M"}${220 + o.speed * t * scale} ${holeY + (9.81 * t * t * scale) / 2}`;
  }).join(" ");
  return (
    <Scene
      title={`Hole depth ${fmt(o.depth)} m; pressure ${fmt(o.gaugePressure)} Pa; jet range ${fmt(o.range)} m.`}
      caption={`Lower holes give faster water, but less time to fall. This hole sends water ${fmt(o.range)} m. The water surface stays fixed.`}
    >
      <path
        d="M70 50V290H220V50"
        fill="#c2dce0"
        stroke="currentColor"
        strokeWidth="4"
      />
      <line
        x1="70"
        x2="220"
        y1="70"
        y2="70"
        stroke="var(--accent)"
        strokeWidth="3"
      />
      <circle cx="220" cy={holeY} r="5" fill="var(--panel)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="4" />
      <line
        x1="45"
        x2="660"
        y1="290"
        y2="290"
        stroke="currentColor"
        strokeWidth="3"
      />
      <text x="340" y="32" textAnchor="middle">
        Outlet speed {fmt(o.speed)} m/s
      </text>
      <text x="230" y="325">
        Range {fmt(o.range)} m
      </text>
      <text x="75" y="115">
        Fixed head
      </text>
    </Scene>
  );
}
export function HydraulicsScene({ instance }: { instance: ModelInstance }) {
  const s = hydraulicsState(instance.state),
    o = hydraulicsMeasure(s);
  const w1 = 40 * Math.sqrt(s.inputArea),
    w2 = 40 * Math.sqrt(s.outputArea),
    scale = Math.min(150, 55 / Math.max(o.inputTravel, o.outputTravel, 1e-12));
  const y1 = 150 + o.inputTravel * scale,
    y2 = 150 - o.outputTravel * scale;
  return (
    <Scene
      title={`Available output force ${fmt(o.outputForce)} N. ${o.canLift ? "Load lifts" : "Force is insufficient"}. Output travel ${fmt(o.outputTravel * 100)} cm.`}
      caption={
        o.canLift
          ? `Input travels ${fmt(o.inputTravel * 100)} cm; output travels ${fmt(o.outputTravel * 100)} cm. A slow lift uses ${fmt(o.requiredInputForce)} N input force; both transfer ${fmt(o.loadWork)} J.`
          : "Available force cannot support this load. Both pistons stay still."
      }
    >
      <path
        d={`M${170 - w1 / 2} 95V280H${480 + w2 / 2}V95M${170 + w1 / 2} 95V245H${480 - w2 / 2}V95`}
        fill="#c2dce0"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect
        x={170 - w1 / 2}
        y={y1}
        width={w1}
        height="12"
        fill="var(--accent)"
      />
      <rect
        x={480 - w2 / 2}
        y={y2}
        width={w2}
        height="12"
        fill="var(--accent)"
      />
      <rect x="450" y={y2 - 40} width="60" height="40" fill="#b78242" />
      <text x="170" y="325" textAnchor="middle">
        {fmt(s.inputArea)} cm² input
      </text>
      <text x="480" y="325" textAnchor="middle">
        {fmt(s.outputArea)} cm² output
      </text>
      <text x="340" y="32" textAnchor="middle">
        Load {fmt(s.loadForce)} N · capacity {fmt(o.outputForce)} N
      </text>
    </Scene>
  );
}
export function FlowScene({ instance }: { instance: ModelInstance }) {
  const s = flowState(instance.state),
    o = flowMeasure(s),
    narrow = 70 * Math.sqrt(s.narrowArea / s.wideArea);
  return (
    <Scene
      title={`Fixed flow ${fmt(s.flowRate)} cubic metres per second. Speeds ${fmt(o.wideSpeed)} and ${fmt(o.narrowSpeed)} metres per second. Narrow pressure ${fmt(o.narrowPressure)} pascals absolute.`}
      caption={`The same volume passes each section every second. Narrowing raises speed and lowers pressure here because volume flow stays fixed.`}
    >
      <path
        d={`M45 110H275L375 ${180 - narrow}H635V${180 + narrow}H375L275 250H45Z`}
        fill="#c2dce0"
        stroke="currentColor"
        strokeWidth="3"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle
            cx={55 + ((i * 53 + o.wideSpeed * s.time * 45) % 210)}
            cy="180"
            r="6"
            fill="var(--accent)"
          />
          <circle
            cx={385 + ((i * 57 + o.narrowSpeed * s.time * 45) % 240)}
            cy="180"
            r="6"
            fill="var(--accent)"
          />
        </g>
      ))}
      <Arrow
        x={85}
        y={85}
        dx={Math.min(150, o.wideSpeed * 35)}
        label={`${fmt(o.wideSpeed)} m/s`}
      />
      <Arrow
        x={400}
        y={85}
        dx={Math.min(200, o.narrowSpeed * 35)}
        label={`${fmt(o.narrowSpeed)} m/s`}
      />
      <text x="155" y="295" textAnchor="middle">
        {fmt(s.referencePressure / 1000)} kPa abs.
      </text>
      <text x="490" y="295" textAnchor="middle">
        {fmt(o.narrowPressure / 1000)} kPa abs.
      </text>
      <text x="340" y="32" textAnchor="middle">
        Fixed flow {fmt(s.flowRate * 1000)} L/s
      </text>
    </Scene>
  );
}
export function ParachuteScene({ instance }: { instance: ModelInstance }) {
  const s = parachuteState(instance.state),
    o = parachuteMeasure(s),
    y = 70 + (175 * s.distance) / s.height;
  const canopy = 22 * Math.sqrt(s.area / 20),
    forceScale = 55 / o.weight;
  return (
    <Scene
      title={`${fmt(s.area)} square metre canopy, ${fmt(s.time)} seconds, speed ${fmt(s.speed)} metres per second downward. ${s.landed ? "At ground." : ""}`}
      caption={
        s.landed
          ? "The load has reached the ground; the fall stops."
          : `Downward speed ${fmt(s.speed)} m/s approaches ${fmt(o.terminalSpeed)} m/s as drag balances weight. Changing area preserves the current fall.`
      }
    >
      <line
        x1="80"
        x2="600"
        y1="295"
        y2="295"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d={`M${250 - canopy} ${y}Q250 ${y - canopy} ${250 + canopy} ${y}Z`}
        fill="#b78242"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d={`M${250 - canopy} ${y}L250 ${y + 30}L${250 + canopy} ${y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="240" y={y + 30} width="20" height="20" fill="var(--accent)" />
      <Arrow
        x={320}
        y={y + 35}
        dy={o.weight * forceScale}
        label={`Weight ${fmt(o.weight)} N`}
      />
      <Arrow
        x={485}
        y={y + 35}
        dy={s.landed ? -55 : Math.max(-100, Math.min(100, o.drag * forceScale))}
        label={
          s.landed
            ? `Ground support ${fmt(o.support)} N`
            : `Drag ${fmt(Math.abs(o.drag))} N`
        }
      />
      <text x="340" y="32" textAnchor="middle">
        {fmt(s.area)} m² canopy · {fmt(s.mass)} kg · {fmt(s.time)} s
      </text>
      <text x="80" y="325">
        Fallen {fmt(s.distance)} of {fmt(s.height)} m
      </text>
    </Scene>
  );
}

export const mechanicsAppearances = {
  "physics-pulley": PulleyScene,
  "physics-gears": GearsScene,
  "physics-tipping": TippingScene,
  "physics-collision": CollisionScene,
  "physics-buoyancy": BuoyancyScene,
  "physics-pressure": PressureScene,
  "physics-hydraulics": HydraulicsScene,
  "physics-flow": FlowScene,
  "physics-parachute": ParachuteScene,
};
