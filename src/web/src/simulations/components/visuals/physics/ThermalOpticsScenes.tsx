"use client";
import type { ModelInstance } from "../../../runtime/contribution";
import {
  capacitorMeasure,
  capacitorState,
} from "../../systems/physics/capacitor";
import { conductionState } from "../../systems/physics/conduction";
import {
  COOLING_DURATION,
  coolingMeasure,
  coolingState,
} from "../../systems/physics/cooling";
import { dopplerMeasure, dopplerState } from "../../systems/physics/doppler";
import { fibreMeasure, fibreState } from "../../systems/physics/fibre";
import {
  inductionMeasure,
  inductionState,
} from "../../systems/physics/induction";
import { latentMeasure, latentState } from "../../systems/physics/latent";
import { lensMeasure, lensState } from "../../systems/physics/lens";
import {
  stringDisplacement,
  stringMeasure,
  stringState,
} from "../../systems/physics/string";
import { turningMeasure, turningState } from "../../systems/physics/turning";
import "./thermal-optics.css";
const fmt = (v: number) => Number(v.toPrecision(3)).toString();
export function CoolingScene({ instance }: { instance: ModelInstance }) {
  const s = coolingState(instance.state),
    o = coolingMeasure(s);
  const horizon = COOLING_DURATION;
  const path = Array.from({ length: 61 }, (_, i) => {
    const t = coolingMeasure({ ...s, time: (i * horizon) / 60 }).temperature;
    return `${i ? "L" : "M"}${275 + i * 5} ${270 - t * 2}`;
  }).join(" ");
  return (
    <figure className="thermal-optics-scene">
      <svg
        viewBox="0 0 680 340"
        role="img"
        aria-label={`${instance.label}: ${fmt(o.temperature)}°C after ${fmt(s.time)} minutes in a ${fmt(s.ambient)}°C room`}
      >
        <text x="50" y="40">
          Room {fmt(s.ambient)}°C
        </text>
        <path
          d="M65 110H205V250Q135 285 65 250Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
        <path
          d="M205 135Q260 135 260 175Q260 210 205 210"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
        <path
          d="M70 135H200V246Q135 275 70 246Z"
          fill={`hsl(${210 - Math.max(0, Math.min(100, o.temperature)) * 2.1} 55% 65%)`}
        />
        <text x="135" y="205" textAnchor="middle">
          {fmt(o.temperature)}°C
        </text>
        <path d="M275 60V270H595" fill="none" stroke="currentColor" />
        <path
          d={`M275 ${270 - s.ambient * 2}H595`}
          stroke="currentColor"
          strokeDasharray="4 5"
        />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />
        {s.time <= horizon && (
          <circle
            cx={275 + (s.time / horizon) * 300}
            cy={270 - o.temperature * 2}
            r="6"
            fill="var(--accent)"
          />
        )}
        <text x="275" y="305">
          0
        </text>
        <text x="585" y="305" textAnchor="end">
          {fmt(horizon)} min
        </text>
        <text x="450" y="40" textAnchor="middle">
          After {fmt(s.time)} min
        </text>
      </svg>
    </figure>
  );
}

function Scene({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: import("react").ReactNode;
}) {
  return (
    <figure className="thermal-optics-scene">
      <svg viewBox="0 0 680 340" role="img" aria-label={`${title}. ${caption}`}>
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
function CapacitorScene({ instance }: { instance: ModelInstance }) {
  const s = capacitorState(instance.state),
    o = capacitorMeasure(s);
  const target = s.mode === "charge" ? s.source : 0;
  return (
    <Scene
      title={instance.label}
      caption={
        s.mode === "isolate"
          ? "An isolated capacitor keeps its charge: there is no closed path."
          : s.mode === "charge"
            ? "Current gets smaller as the capacitor voltage approaches the battery."
            : "Stored energy now flows through the connected resistor load."
      }
    >
      <path
        d="M100 210V90H305M335 90H580V115M580 185V210H350M330 210H100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M330 180V240M350 180V240"
        stroke="var(--accent)"
        strokeWidth="5"
      />
      <path
        d="M580 115L570 125L590 135L570 145L590 155L570 165L580 175V185"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <text x="615" y="150" textAnchor="middle">
        R
      </text>
      <text x="105" y="65">
        {s.mode === "charge"
          ? `Battery ${fmt(s.source)} V`
          : s.mode === "discharge"
            ? "Load connected"
            : "Switch open"}
      </text>
      <path
        d={
          s.mode === "charge"
            ? "M305 75V105M335 65V115"
            : s.mode === "isolate"
              ? "M305 90L325 65"
              : "M305 90H335"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <text x="70" y="285">
        Capacitor {fmt(o.voltage)} V
      </text>
      <text x="360" y="285">
        τ = {fmt(o.timeConstant)} s
      </text>
      <rect
        x="390"
        y="135"
        width="180"
        height="30"
        fill="none"
        stroke="currentColor"
      />
      <rect
        x="390"
        y="135"
        width={180 * (o.voltage / 24) ** 2}
        height="30"
        fill="var(--accent)"
      />
      <text x="390" y="195">
        Energy {fmt(o.energy)} J
      </text>
      <text x="70" y="150">
        {s.mode === "isolate" ? "I = 0" : `I = ${fmt(o.current * 1000)} mA`}
      </text>
      <text x="70" y="320">
        {fmt(s.time)} s elapsed ·{" "}
        {s.mode === "isolate"
          ? "voltage stays constant"
          : `voltage approaches ${fmt(target)} V`}
      </text>
    </Scene>
  );
}
function LensScene({ instance }: { instance: ModelInstance }) {
  const s = lensState(instance.state),
    o = lensMeasure(s),
    x = 340 - 3 * s.distance,
    y = 170 - 8 * s.height;
  const finite = o.imageDistance !== null,
    visible =
      finite &&
      Math.abs(o.imageDistance!) <= 95 &&
      Math.abs(o.imageHeight!) <= 17;
  return (
    <Scene
      title={instance.label}
      caption={
        !finite
          ? "At the focal distance, outgoing rays are parallel: no finite image."
          : `${o.kind === "virtual" ? "Dashed backward extensions meet at an upright virtual image." : "The outgoing rays meet at an inverted real image."} Image distance ${fmt(o.imageDistance!)} cm${visible ? "" : " (outside this view)"}.`
      }
    >
      <line x1="20" x2="660" y1="170" y2="170" stroke="currentColor" />
      <ellipse
        cx="340"
        cy="170"
        rx="13"
        ry="110"
        fill="var(--accent)"
        opacity=".25"
      />
      <line x1={x} x2={x} y1="170" y2={y} stroke="#996018" strokeWidth="5" />
      <path
        d={`M${x - 6} ${y + 10}L${x} ${y}L${x + 6} ${y + 10}`}
        stroke="#996018"
        fill="none"
      />
      <path
        d={`M${x} ${y}H340L660 ${y + (320 * (170 - y)) / (3 * s.focal)}`}
        fill="none"
        stroke="#a14638"
        strokeWidth="2"
      />
      <path
        d={`M${x} ${y}L660 ${170 + (320 * (170 - y)) / (3 * s.distance)}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      {o.kind === "virtual" && (
        <>
          <path
            d={`M340 ${y}L20 ${y - (320 * (170 - y)) / (3 * s.focal)}`}
            stroke="#a14638"
            strokeDasharray="5 5"
          />
          <path
            d={`M340 170L20 ${170 - (320 * (170 - y)) / (3 * s.distance)}`}
            stroke="var(--accent)"
            strokeDasharray="5 5"
          />
        </>
      )}
      {visible && (
        <line
          x1={340 + 3 * o.imageDistance!}
          x2={340 + 3 * o.imageDistance!}
          y1="170"
          y2={170 - 8 * o.imageHeight!}
          stroke="var(--accent)"
          strokeWidth="5"
          strokeDasharray={o.kind === "virtual" ? "5 4" : undefined}
        />
      )}
      <text x={340 - 3 * s.focal} y="195" textAnchor="middle">
        F
      </text>
      <text x={340 + 3 * s.focal} y="195" textAnchor="middle">
        F
      </text>
      <text x="40" y="40">
        Object {fmt(s.distance)} cm · focal length {fmt(s.focal)} cm
      </text>
      <text x="40" y="310">
        {finite
          ? `${o.kind} · magnification ${fmt(o.magnification!)}×`
          : "No finite image"}
      </text>
    </Scene>
  );
}
function FibreScene({ instance }: { instance: ModelInstance }) {
  const s = fibreState(instance.state),
    o = fibreMeasure(s),
    slope = Math.tan((o.direction * Math.PI) / 180);
  const points: [number, number][] = [[70, 170]];
  let x = 70,
    y = 170,
    sign = -1,
    hit: [number, number] | undefined;
  for (let i = 0; i < 32 && x < 610; i++) {
    const wall = sign < 0 ? 110 : 230,
      next = slope === 0 ? Infinity : x + Math.abs(wall - y) / slope;
    if (next > 610) {
      points.push([610, y + sign * slope * (610 - x)]);
      break;
    }
    points.push([next, wall]);
    hit ??= [next, wall];
    x = next;
    y = wall;
    sign = -sign;
    if (!o.confined) {
      points.push([
        Math.min(610, x + 120 / slope),
        wall + sign * Math.min(120, (610 - x) * slope),
      ]);
      break;
    }
  }
  return (
    <Scene
      title={instance.label}
      caption={
        o.confined
          ? `Internal incidence ${fmt(o.incidence)}° exceeds critical ${fmt(o.critical!)}°: light is totally reflected.`
          : `Internal incidence ${fmt(o.incidence)}°: some light transmits${o.critical === null ? "; no critical angle for this index order" : ` below critical ${fmt(o.critical)}°`}.`
      }
    >
      <rect x="70" y="65" width="540" height="210" fill="#dbe9dc" />
      <rect x="70" y="110" width="540" height="120" fill="#a9caca" />
      <text x="80" y="45">
        Core {fmt(s.core)} · cladding {fmt(s.cladding)}
      </text>
      <path
        d={`M25 ${170 - 45 * Math.tan((s.entry * Math.PI) / 180)}L70 170`}
        stroke="#996018"
        strokeWidth="3"
        fill="none"
      />
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        stroke="#996018"
        strokeWidth="3"
        fill="none"
        strokeDasharray={o.confined ? undefined : "6 3"}
      />
      {hit && (
        <>
          <line
            x1={hit[0]}
            x2={hit[0]}
            y1="70"
            y2="160"
            stroke="currentColor"
            strokeDasharray="4 5"
          />
          {!o.confined && o.transmittedAngle !== null && (
            <line
              x1={hit[0]}
              y1={hit[1]}
              x2={hit[0] + 140 * Math.sin((o.transmittedAngle * Math.PI) / 180)}
              y2={hit[1] - 140 * Math.cos((o.transmittedAngle * Math.PI) / 180)}
              stroke="#a14638"
              strokeWidth="3"
            />
          )}
        </>
      )}
      <text x="80" y="310">
        Entry {fmt(s.entry)}° · interface reflection {fmt(o.reflectance * 100)}%
      </text>
    </Scene>
  );
}
function DopplerScene({ instance }: { instance: ModelInstance }) {
  const s = dopplerState(instance.state),
    o = dopplerMeasure(s),
    scale = 0.8,
    sourceX = 340 + o.sourceX * scale;
  return (
    <Scene
      title={instance.label}
      caption={
        o.received === null
          ? "Source and listener coincide: received pitch is undefined here."
          : `Emitted ${fmt(s.frequency)} Hz → received ${fmt(o.received)} Hz. Wavefront circles are a sparse illustration.`
      }
    >
      <path d="M20 200H660" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 16 }, (_, i) => {
        const te = s.time - i * 0.12,
          r = s.soundSpeed * (s.time - te) * scale;
        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed spatial cells, nodes and emission slots never reorder.
            key={i}
            cx={340 + s.speed * te * scale}
            cy="200"
            r={r}
            fill="none"
            stroke="var(--accent)"
            opacity={1 - i / 20}
          />
        );
      })}
      <rect
        x={sourceX - 20}
        y="182"
        width="40"
        height="28"
        rx="5"
        fill="#996018"
      />
      <circle cx="340" cy={200 - s.offset * scale} r="6" fill="#a14638" />
      <text x="40" y="40">
        Speed {fmt(s.speed)} m/s · observer {fmt(s.offset)} m beside road
      </text>
      <text x="40" y="315">
        {fmt(s.time)} s relative to closest pass
      </text>
    </Scene>
  );
}
function StringScene({ instance }: { instance: ModelInstance }) {
  const s = stringState(instance.state),
    o = stringMeasure(s),
    end = 80 + s.length * 550;
  const d = Array.from(
    { length: 121 },
    (_, i) =>
      `${i ? "L" : "M"}${80 + ((end - 80) * i) / 120} ${180 - 65 * stringDisplacement(s, (s.length * i) / 120)}`,
  ).join(" ");
  return (
    <Scene
      title={instance.label}
      caption={`Shorter length raises the note. ${fmt(o.frequency)} Hz for harmonic ${s.harmonic}; phase is one slowed display cycle.`}
    >
      <line
        x1="80"
        x2="630"
        y1="180"
        y2="180"
        stroke="currentColor"
        strokeDasharray="5 5"
      />
      <path d={d} stroke="var(--accent)" strokeWidth="4" fill="none" />
      {Array.from({ length: s.harmonic + 1 }, (_, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed spatial cells, nodes and emission slots never reorder.
          key={i}
          cx={80 + ((end - 80) * i) / s.harmonic}
          cy="180"
          r="6"
          fill="#996018"
        />
      ))}
      <path d={`M80 230V245H${end}V230`} stroke="currentColor" fill="none" />
      <text x={(80 + end) / 2} y="275" textAnchor="middle">
        {fmt(s.length)} m · fixed ends are nodes
      </text>
      <text x="80" y="50">
        Fundamental {fmt(o.fundamental)} Hz
      </text>
    </Scene>
  );
}
function TurningScene({ instance }: { instance: ModelInstance }) {
  const s = turningState(instance.state),
    o = turningMeasure(s),
    r = 55 + s.radius * 1.3;
  const barScale = 170 / Math.max(1, o.requiredForce, o.availableForce);
  return (
    <Scene
      title={instance.label}
      caption={
        o.feasible
          ? `Speed ${fmt(s.speed)} m/s: within assumed grip. Ideal lean ${fmt(o.lean)}°.`
          : `Speed ${fmt(s.speed)} m/s exceeds grip. The model marks a limit, without predicting a skid path.`
      }
    >
      <circle
        cx="200"
        cy="170"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeDasharray={o.feasible ? undefined : "6 5"}
      />
      <circle cx={200 + r} cy="170" r="8" fill="#996018" />
      <path
        d={`M${200 + r - 12} 170H200M210 162L200 170L210 178`}
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <text x="200" y="320" textAnchor="middle">
        Radius {fmt(s.radius)} m
      </text>
      <text x="420" y="95">
        Required {fmt(o.requiredForce)} N
      </text>
      <rect
        x="420"
        y="110"
        width={o.requiredForce * barScale}
        height="26"
        fill={o.feasible ? "var(--accent)" : "#a14638"}
      />
      <text x="420" y="180">
        Grip ceiling {fmt(o.availableForce)} N
      </text>
      <rect
        x="420"
        y="195"
        width={o.availableForce * barScale}
        height="26"
        fill="#996018"
      />
      <text x="420" y="270">
        Speed limit {fmt(o.limit)} m/s
      </text>
    </Scene>
  );
}
function LatentScene({ instance }: { instance: ModelInstance }) {
  const s = latentState(instance.state),
    o = latentMeasure(s);
  return (
    <Scene
      title={instance.label}
      caption={
        o.solid > 0 && o.liquid > 0
          ? "Energy melts more ice while temperature stays at 0°C."
          : o.liquid > 0 && o.vapour > 0
            ? "Energy turns more liquid into vapour while temperature stays at 100°C."
            : "Within one phase, added energy raises temperature."
      }
    >
      <text x="60" y="50">
        {fmt(o.temperature)}°C · energy added {fmt(o.addedEnergy / 1000)} kJ
      </text>
      <rect
        x="70"
        y="95"
        width="150"
        height="170"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect
        x="75"
        y={260 - o.liquid * 160}
        width="140"
        height={o.liquid * 160}
        fill="#75aaa5"
      />
      <rect
        x="75"
        y={260 - (o.solid + o.liquid) * 160}
        width="140"
        height={o.solid * 160}
        fill="#c7e4ef"
      />
      {o.vapour > 0 && (
        <text x="90" y="125">
          Vapour {fmt(o.vapour * 100)}%
        </text>
      )}
      <path
        d="M280 270L320 230H400L490 130H600L640 80"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
      />
      <text x="330" y="255">
        0°C · melting
      </text>
      <text x="490" y="110">
        100°C · boiling
      </text>
      <text x="280" y="65">
        Heating curve (stage sketch)
      </text>
      <text x="60" y="315">
        {fmt(s.power)} W · {fmt(s.time)} s · solid {fmt(o.solid * 100)}% ·
        liquid {fmt(o.liquid * 100)}% · vapour {fmt(o.vapour * 100)}%
      </text>
    </Scene>
  );
}
function InductionScene({ instance }: { instance: ModelInstance }) {
  const s = inductionState(instance.state),
    o = inductionMeasure(s),
    x = 340 + s.position * 650;
  return (
    <Scene
      title={instance.label}
      caption={
        s.speed === 0
          ? "The stationary magnet has flux but induces no voltage."
          : `Motion changes flux: ${fmt(o.emf)} V, ${fmt(o.current * 1000)} mA. External work supplies the electrical energy.`
      }
    >
      <path
        d="M350 100Q310 170 350 240M366 100Q326 170 366 240M382 100Q342 170 382 240M398 100Q358 170 398 240"
        fill="none"
        stroke="#996018"
        strokeWidth="5"
      />
      <rect x={x - 55} y="145" width="55" height="50" fill="#a14638" />
      <rect x={x} y="145" width="55" height="50" fill="#75aaa5" />
      <text x={x - 28} y="176" textAnchor="middle">
        {s.polarity === 1 ? "N" : "S"}
      </text>
      <text x={x + 28} y="176" textAnchor="middle">
        {s.polarity === 1 ? "S" : "N"}
      </text>
      <text x="60" y="45">
        Flux per turn {fmt(o.flux * 1000)} mWb
      </text>
      <text x="60" y="280">
        Motion {fmt(s.speed)} m/s · position {fmt(s.position)} m
      </text>
      <text x="60" y="315">
        Loop dissipation {fmt(o.dissipation)} W
      </text>
    </Scene>
  );
}
function ConductionScene({ instance }: { instance: ModelInstance }) {
  const s = conductionState(instance.state),
    o = instance.outputs,
    profile = o.temperatures as { firstHalf: number[]; secondHalf: number[] },
    temperatures = [...profile.firstHalf, ...profile.secondHalf];
  return (
    <Scene
      title={instance.label}
      caption={`Handle ${fmt(Number(o.handle))}°C after ${fmt(s.time)} s. Heat diffuses faster when k/(ρcₚ) is larger.`}
    >
      <text x="55" y="45">
        Conductivity {fmt(s.conductivity)} W/(m·K)
      </text>
      <rect x="40" y="95" width="65" height="160" fill="#dbaa75" />
      <text x="45" y="285">
        Bath {fmt(s.bath)}°C
      </text>
      {temperatures.map((t, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed spatial cells, nodes and emission slots never reorder.
          key={i}
          x={100 + i * 15}
          y="145"
          width="15.5"
          height="50"
          fill={`hsl(${210 - t * 2.1} 55% 65%)`}
        />
      ))}
      <path d="M100 205H580" stroke="currentColor" strokeWidth="2" />
      <text x="420" y="245">
        Handle {fmt(Number(o.handle))}°C
      </text>
      <text x="130" y="310">
        {s.boundary === "bath"
          ? "Bath end fixed; sides and far end insulated"
          : "Both ends and sides insulated"}
      </text>
    </Scene>
  );
}

export const thermalOpticsAppearances = {
  "physics-cooling": CoolingScene,
  "physics-capacitor": CapacitorScene,
  "physics-lens": LensScene,
  "physics-fibre": FibreScene,
  "physics-doppler": DopplerScene,
  "physics-string": StringScene,
  "physics-turning": TurningScene,
  "physics-latent": LatentScene,
  "physics-induction": InductionScene,
  "physics-conduction": ConductionScene,
};
