"use client";
import type { EarthState } from "../../../../domains/earth-atmosphere";
import {
  atmosphereState,
  energyFlux,
  faultState,
  lightningState,
  rainbowRay,
  rainbowState,
  tsunamiState,
  wavelengths,
  weatherState,
} from "../../systems/earth-atmosphere/physics";
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = "#285e56",
  dashed = false,
  width = 4,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
  width?: number;
}) {
  const a = Math.atan2(y2 - y1, x2 - x1),
    l = 10;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? "8 6" : undefined}
      />
      <path
        d={`M${x2 - l * Math.cos(a - 0.45)} ${y2 - l * Math.sin(a - 0.45)}L${x2} ${y2}L${x2 - l * Math.cos(a + 0.45)} ${y2 - l * Math.sin(a + 0.45)}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
      />
    </g>
  );
}
function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="#e3e8e4"
      stroke="#b4c2bb"
      strokeWidth="2"
    >
      <path d="M-70 10Q-95 -30 -50 -42Q-42 -88 0 -64Q40 -85 57 -45Q110 -35 80 10Z" />
    </g>
  );
}
export function EarthquakeDiagram({ s }: { s: EarthState }) {
  const m = faultState(
      s.phase,
      s.progress,
      Number(s.config.locking),
      Number(s.config.fault),
    ),
    shift = m.slip * 12;
  const fault = Number(s.config.fault),
    dip = fault === 0 ? 0 : 86,
    dy = fault === 0 ? 0 : fault === 1 ? shift : -shift;
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label="Fault cross-section with deformation, rupture and waves"
    >
      <path d={`M80 145H440L${440 + dip} 295H80Z`} fill="#c9b291" />
      <path
        d={`M440 145H820V295H${440 + dip}Z`}
        transform={`translate(${dy * 0.57} ${dy})`}
        fill="#baa287"
      />
      <path d={`M440 145L${440 + dip} 295`} stroke="#7d6457" strokeWidth="5" />
      {[180, 215, 250].map((y) => (
        <path
          key={y}
          d={`M80 ${y}Q330 ${y - m.deformation * 8} 438 ${y}M443 ${y}H820`}
          stroke="#806d57"
          strokeWidth="2"
          fill="none"
        />
      ))}
      <text x="85" y="45">
        Surface
      </text>
      {fault === 0 ? (
        <>
          <text x="130" y="105">
            ⊙ toward you
          </text>
          <text x="670" y="105">
            ⊗ away from you
          </text>
        </>
      ) : (
        <>
          <Arrow
            x1={fault === 1 ? 210 : 130}
            y1={105}
            x2={fault === 1 ? 130 : 210}
            y2={105}
          />
          <Arrow
            x1={fault === 1 ? 690 : 770}
            y1={105}
            x2={fault === 1 ? 770 : 690}
            y2={105}
          />
        </>
      )}
      {s.phase >= 2 && (
        <>
          <circle cx="440" cy="225" r="8" fill="#b94f3f" />
          <path
            d={`M440 225V${225 - m.ruptureFraction * 80}`}
            stroke="#b94f3f"
            strokeWidth="7"
          />
          <circle cx="440" cy="140" r="5" fill="#285e56" />
          <line
            x1="440"
            x2="440"
            y1="148"
            y2="217"
            stroke="#285e56"
            strokeDasharray="4 5"
          />
          <text x="462" y="234">
            Rupture begins
          </text>
          <text x="462" y="130">
            Epicenter
          </text>
        </>
      )}
      {s.phase >= 4 &&
        [60, 110, 160].map((r) => (
          <circle
            key={r}
            cx="440"
            cy="225"
            r={r}
            fill="none"
            stroke="#568d99"
            strokeWidth="3"
            strokeDasharray="8 6"
          />
        ))}
      <text x="85" y="325">
        Deformation and displacement exaggerated
      </text>
    </svg>
  );
}
export function TsunamiDiagram({ s }: { s: EarthState }) {
  const m = tsunamiState(
      Number(s.config.depth),
      Number(s.config.displacement),
      s.phase,
      s.progress,
    ),
    cx = 100 + m.crest * 700;
  const wave = Array.from({ length: 151 }, (_, i) => {
    const x = 50 + i * 5.3;
    const envelope = Math.exp(-(((x - cx) / 90) ** 2));
    return `${i ? "L" : "M"}${x} ${130 - Math.cos((x - cx) / 35) * envelope * (s.phase >= 1 ? (s.phase >= 3 ? m.shelfAmplitude * 12 : m.offshoreAmplitude * 16) : 0)}`;
  }).join(" ");
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label="Tsunami travels from a deep basin to a shallow shelf and schematic coast"
    >
      <path d="M50 130H850V300H50Z" fill="#d6e8e8" />
      <path d="M50 300H490L670 210H760L835 110H880V330H50Z" fill="#c9b291" />
      <path
        d="M50 300H490L670 210H760L835 110H880"
        fill="none"
        stroke="#927b62"
        strokeWidth="3"
      />
      <path d={wave} stroke="#337f91" strokeWidth="4" fill="none" />
      <text x="100" y="56">
        Deep ocean · {Number(s.config.depth).toLocaleString()} m
      </text>
      <text x="600" y="56">
        Shallow shelf
      </text>
      <text x="774" y="90">
        Coast
      </text>
      {s.phase === 1 && m.offshoreAmplitude !== 0 && (
        <>
          <Arrow
            x1={170}
            y1={294}
            x2={170}
            y2={Number(s.config.displacement) >= 0 ? 258 : 319}
            color="#bd6e43"
          />
          <text x="70" y="235">
            Seabed displacement
          </text>
        </>
      )}
      {s.phase >= 2 && m.offshoreAmplitude !== 0 && (
        <>
          <Arrow x1={240} y1={90} x2={390} y2={90} color="#337f91" />
          <text x="250" y="115">
            Faster
          </text>
          <Arrow x1={650} y1={90} x2={700} y2={90} color="#337f91" />
          <text x="650" y="115">
            Slower
          </text>
        </>
      )}
      {m.arrivals > 0 && (
        <>
          <path
            d="M760 210L840 140L860 130L850 190L790 230Z"
            fill="#629eab"
            opacity=".8"
          />
          <text x="555" y="275">
            Schematic coastal surge
          </text>
        </>
      )}
      {m.arrivals > 1 && (
        <text x="90" y="190">
          A later wave follows
        </text>
      )}
      <text x="55" y="327">
        Vertical scale exaggerated · coastal flooding is illustrative
      </text>
    </svg>
  );
}
export function AtmosphereDiagram({ s }: { s: EarthState }) {
  const alt = Number(s.config.altitude),
    m = atmosphereState(alt, Number(s.config.ozone)),
    colors = ["#dce8d9", "#d8e5e8", "#dce0ec", "#e7dfeb", "#f0e8ed"],
    ys = [270, 218, 166, 114, 62];
  const names = [
      "Troposphere",
      "Stratosphere",
      "Mesosphere",
      "Thermosphere",
      "Exosphere",
    ],
    bounds = [
      "0–~12 km",
      "~12–50 km",
      "50–85 km",
      "~85–600 km",
      "Above ~600 km",
    ];
  if (s.config.uv)
    return (
      <svg
        viewBox="0 0 900 340"
        role="img"
        aria-label="Qualitative ultraviolet transmission through stratospheric ozone"
      >
        <rect
          x="90"
          y="105"
          width="720"
          height="85"
          rx="20"
          fill="#d4e5e6"
          opacity={0.4 + Number(s.config.ozone) * 0.6}
        />
        <text x="110" y="140">
          Ozone-rich stratosphere
        </text>
        <text x="110" y="166">
          Concentration, not a solid roof
        </text>
        {[
          [420, "UV-A", m.uvA],
          [565, "UV-B", m.uvB],
          [710, "UV-C", m.uvC],
        ].map(([x, t, v]) => (
          <g key={String(t)}>
            <text x={Number(x) - 20} y="40">
              {t}
            </text>
            <Arrow
              x1={Number(x)}
              y1={52}
              x2={Number(x)}
              y2={Number(v) > 0.2 ? 265 : 150}
              color={Number(v) > 0.2 ? "#a37848" : "#86759a"}
            />
            {Number(v) <= 0.2 && (
              <text x={Number(x) - 35} y="220">
                Absorbed
              </text>
            )}
          </g>
        ))}
        <path d="M90 290H810" stroke="#8a9c71" strokeWidth="10" />
        <text x="95" y="320">
          Qualitative paths · UV-C absorption also involves oxygen
        </text>
      </svg>
    );
  const bandStart = [0, 12, 50, 85, 600][m.layer],
    bandEnd = [12, 50, 85, 600, 800][m.layer],
    probeY =
      ys[m.layer] + 44 - ((alt - bandStart) / (bandEnd - bandStart)) * 44;
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label={`Altitude ${alt} kilometers in the ${m.layerName}; compressed upper atmosphere`}
    >
      {names.map((n, i) => (
        <g key={n}>
          <rect
            x="130"
            y={ys[i]}
            width="620"
            height="49"
            rx="5"
            fill={colors[i]}
            stroke={m.layer === i ? "#285e56" : "none"}
            strokeWidth="3"
          />
          <text x="155" y={ys[i] + 31}>
            {n}
          </text>
          <text className="ea-layer-altitudes" x="565" y={ys[i] + 31}>
            {bounds[i]}
          </text>
        </g>
      ))}
      <rect
        x="350"
        y="222"
        width="170"
        height="32"
        rx="16"
        fill="#7eb6bb"
        opacity=".5"
      />
      <text x="368" y="244">
        Ozone-rich
      </text>
      <path d={`M92 ${probeY}H129`} stroke="#285e56" strokeWidth="4" />
      <circle cx="90" cy={probeY} r="9" fill="#285e56" />
      <text x="140" y="35">
        Altitude explorer
      </text>
      <text x="530" y="35">
        Heights compressed; boundaries vary
      </text>
    </svg>
  );
}
export function GreenhouseDiagram({ s }: { s: EarthState }) {
  const flux = energyFlux(
    s.energy,
    Number(s.config.absorption),
    Number(s.config.albedo),
    Number(s.config.solar),
  );
  const warming = Math.max(0, Math.min(1, (s.energy.surface - 285) / 15));
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label="Solar energy enters, surface emits infrared, atmosphere emits upward and downward"
    >
      <rect x="100" y="110" width="700" height="100" rx="22" fill="#dce7e6" />
      <path
        d="M80 280H820"
        stroke={`hsl(${100 - warming * 65} 35% 55%)`}
        strokeWidth="16"
      />
      <circle cx="130" cy="42" r="25" fill="#e8bc65" />
      <text x="190" y="45">
        Space
      </text>
      <text x="105" y="150">
        Atmosphere
      </text>
      <text x="90" y="315">
        Surface
      </text>
      <Arrow x1={170} y1={55} x2={320} y2={270} color="#c39840" />
      {s.phase >= 1 && (
        <>
          <Arrow x1={250} y1={174} x2={190} y2={58} color="#c39840" dashed />
          <text x="290" y="245">
            Absorbed sunlight
          </text>
        </>
      )}
      {s.phase >= 2 && (
        <>
          <Arrow
            x1={460}
            y1={270}
            x2={460}
            y2={s.phase >= 3 ? 165 : 45}
            color="#b56b51"
            width={Math.max(2, flux.surfaceIR / 100)}
          />
          <text x="477" y="246">
            Thermal infrared
          </text>
        </>
      )}
      {s.phase >= 3 && (
        <>
          <circle cx="460" cy="165" r="12" fill="#b56b51" />
          <Arrow x1={475} y1={155} x2={590} y2={45} color="#b56b51" />
          <Arrow x1={475} y1={175} x2={590} y2={270} color="#b56b51" />
          <text x="610" y="163">
            Absorb and emit
          </text>
          <Arrow x1={735} y1={270} x2={735} y2={45} color="#b56b51" dashed />
        </>
      )}
      {s.phase >= 4 && (
        <text x="330" y="320">
          Surface {(s.energy.surface - 273.15).toFixed(1)} °C · simplified
          energy model
        </text>
      )}
    </svg>
  );
}
export function LightningDiagram({ s }: { s: EarthState }) {
  const m = lightningState(
    s.phase,
    s.progress,
    Number(s.config.distance),
    Boolean(s.config.intracloud),
  );
  const path = s.config.intracloud
    ? "M470 190L500 163L455 140L505 105L480 80"
    : "M460 192L430 215L467 232L438 255L474 279";
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label="Ice charges separate; a leader connects before the bright return stroke"
    >
      <Cloud x={450} y={125} scale={2.7} />
      <path d="M95 300H805" stroke="#9daa83" strokeWidth="10" />
      <text x="80" y="330">
        Ground
      </text>
      <Arrow x1={260} y1={210} x2={260} y2={60} color="#659fa3" />
      <text x="115" y="170">
        Updraft
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <path
            d={`M${350 + i * 40} ${s.phase >= 2 ? 55 : 110}h10m-5 -5v10`}
            stroke="#457d93"
            strokeWidth="3"
          />
          <circle
            cx={350 + i * 40}
            cy={s.phase >= 2 ? 185 : 140}
            r="10"
            fill="#8f7b9e"
          />
          {s.phase >= 1 && (
            <>
              <text x={350 + i * 40} y={s.phase >= 2 ? 43 : 98}>
                +
              </text>
              <text x={345 + i * 40} y={s.phase >= 2 ? 192 : 147}>
                −
              </text>
            </>
          )}
        </g>
      ))}
      <text x="590" y="80">
        Small ice
      </text>
      <text x="590" y="188">
        Graupel
      </text>
      {s.phase >= 3 && (
        <path
          d={path}
          stroke={s.phase >= 5 ? "#b07c26" : "#8a8595"}
          strokeWidth={s.phase >= 5 ? 6 : 3}
          fill="none"
        />
      )}
      {m.connected && !s.config.intracloud && (
        <path d="M474 300L474 279" stroke="#b07c26" strokeWidth="4" />
      )}
      {s.phase >= 5 && !s.config.intracloud && (
        <>
          <Arrow x1={520} y1={280} x2={520} y2={210} color="#b07c26" />
          <text x="555" y="250">
            Return front travels up
          </text>
        </>
      )}
      {s.phase >= 6 && (
        <text x="90" y="45">
          Light first · thunder {m.thunderDelay.toFixed(1)} s later at{" "}
          {Number(s.config.distance)} m
        </text>
      )}
    </svg>
  );
}
/** Actual sphere ray intersections and reflection normals, in a plane through its center. */
export function dropletPath(index: number, reflections: number) {
  const ray = rainbowRay(index, reflections),
    i = ray.incidence,
    r = ray.refraction;
  let p: [number, number] = [-Math.cos(i), Math.sin(i)],
    d: [number, number] = [Math.cos(-i + r), Math.sin(-i + r)];
  const points: [number, number][] = [[-2, p[1]], p];
  for (let n = 0; n <= reflections; n++) {
    const t = -2 * (p[0] * d[0] + p[1] * d[1]);
    p = [p[0] + t * d[0], p[1] + t * d[1]];
    points.push(p);
    if (n < reflections) {
      const dot = d[0] * p[0] + d[1] * p[1];
      d = [d[0] - 2 * dot * p[0], d[1] - 2 * dot * p[1]];
    } else {
      const normal = Math.atan2(p[1], p[0]),
        angle = Math.atan2(d[1], d[0]) - normal;
      const out =
        normal + Math.asin(Math.max(-1, Math.min(1, index * Math.sin(angle))));
      points.push([p[0] + 1.2 * Math.cos(out), p[1] + 1.2 * Math.sin(out)]);
    }
  }
  return points;
}
export function DropletDiagram({ s }: { s: EarthState }) {
  return (
    <svg
      viewBox="0 -20 420 370"
      role="img"
      aria-label="Sunlight refracts, partially reflects inside the drop, and refracts out"
    >
      <circle
        cx="240"
        cy="135"
        r="95"
        fill="#d6e9eb"
        stroke="#76a9b3"
        strokeWidth="2"
      />
      {wavelengths.map((w) => {
        const points = dropletPath(w.index, s.config.secondary ? 2 : 1);
        const shown = points.slice(
          0,
          s.phase <= 1 ? 3 : s.phase === 2 ? 4 : points.length,
        );
        return (
          <polyline
            key={w.name}
            points={shown
              .map(([x, y]) => `${240 + x * 95},${135 - y * 95}`)
              .join(" ")}
            stroke={w.color}
            strokeWidth="2.5"
            fill="none"
          />
        );
      })}
      <text x="22" y="252">
        {s.phase <= 1
          ? "1 · Entry refraction"
          : s.phase === 2
            ? "2 · Internal reflection"
            : "3 · Exit refraction"}
      </text>
    </svg>
  );
}
export function RainbowDiagram({ s }: { s: EarthState }) {
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label="Sun behind the observer; observer-dependent rainbow arc"
    >
      <path d="M80 285H820" stroke="#91a67b" strokeWidth="10" />
      <circle cx="125" cy="55" r="28" fill="#e9be6c" />
      <text x="80" y="110">
        Sun behind you
      </text>
      <circle
        cx={260 + Number(s.config.observer) * 18}
        cy="250"
        r="12"
        fill="#285e56"
      />
      <text x="190" y="315">
        Observer
      </text>
      {s.phase >= 4 &&
        [false, ...(s.config.secondary ? [true] : [])].flatMap((secondary) => {
          const bow = rainbowState(
            Number(s.config.elevation),
            Number(s.config.observer),
            secondary,
          );
          return bow.rays.map((ray, i) => {
            const radius = Math.tan((ray.radius * Math.PI) / 180) * 190;
            const cx = 580 + Number(s.config.observer) * 18,
              cy =
                285 +
                Math.tan((Number(s.config.elevation) * Math.PI) / 180) * 190;
            const points = Array.from({ length: 101 }, (_, j) => [
              cx + Math.cos((j / 100) * Math.PI) * radius,
              cy - Math.sin((j / 100) * Math.PI) * radius,
            ]).filter((p) => p[1] <= 285);
            return points.length > 1 ? (
              <polyline
                key={`${secondary}-${ray.name}`}
                points={points.map((p) => p.join(",")).join(" ")}
                stroke={wavelengths[i].color}
                strokeWidth={secondary ? 4 : 6}
                opacity={secondary ? 0.55 : 1}
                fill="none"
              />
            ) : null;
          });
        })}
      <text x="565" y="55">
        Rain ahead
      </text>
      {Array.from({ length: 12 }, (_, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed rain-mark slots have stable ordinal identity.
          key={`rain-${i}`}
          d={`M${480 + i * 23} 70l-4 12`}
          stroke="#7ba4b1"
          strokeWidth="3"
        />
      ))}
    </svg>
  );
}
export function WeatherDiagram({ s }: { s: EarthState }) {
  const m = weatherState(
      s.phase,
      Number(s.config.moisture),
      Number(s.config.scenario),
    ),
    x = 220 + s.phase * 60,
    y = 260 - m.height / 18;
  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label={`Rising air parcel ${m.saturated ? "has reached saturation" : "is unsaturated"}; prescribed wind`}
    >
      <circle cx="120" cy="45" r="25" fill="#e8bd65" />
      {Number(s.config.scenario) === 2 ? (
        <>
          <path d="M50 300H850V340H50Z" fill="#bfcba7" />
          <path d="M50 300L590 300L300 180H50Z" fill="#bbdce5" />
          <Arrow x1={330} y1={260} x2={540} y2={130} />
          <text x="80" y="260">
            Cool dense air
          </text>
          <text x="580" y="205">
            Warm air lifted
          </text>
        </>
      ) : Number(s.config.scenario) === 1 ? (
        <path d="M50 300L240 270L450 140L630 290H850V340H50Z" fill="#bdb392" />
      ) : (
        <>
          <path d="M50 285H380V330H50Z" fill="#d1e7e9" />
          <path d="M380 285Q520 255 650 285H850V330H380Z" fill="#bfcba7" />
        </>
      )}
      {s.phase >= 1 && (
        <>
          <Arrow x1={240} y1={250} x2={430} y2={250} color="#5c979f" />
          <Arrow x1={530} y1={250} x2={530} y2={70} color="#5c979f" />
          <Arrow x1={510} y1={55} x2={290} y2={55} color="#5c979f" />
        </>
      )}
      <circle
        cx={x}
        cy={y}
        r="22"
        stroke="#285e56"
        strokeWidth="3"
        fill="#eac68b"
      />
      <text x={x - 35} y={y + 46}>
        Air parcel
      </text>
      {m.saturated && s.phase >= 3 && <Cloud x={x} y={y - 20} scale={1.2} />}
      <text x="90" y="320">
        {Number(s.config.scenario) === 1
          ? "Mountain lifting"
          : Number(s.config.scenario) === 2
            ? "Frontal lifting · prescribed flow"
            : "Sea"}
      </text>
      {Number(s.config.scenario) !== 1 && (
        <text x="680" y="320">
          Land
        </text>
      )}
      {s.phase >= 6 &&
        m.rain > 0 &&
        [0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${x - 35 + i * 23} ${y + 20}l-7 26`}
            stroke="#41859e"
            strokeWidth="4"
          />
        ))}
      <text x="575" y="40">
        {m.saturated
          ? "Saturated · cloud water forms"
          : "Unsaturated · water vapor"}
      </text>
    </svg>
  );
}
