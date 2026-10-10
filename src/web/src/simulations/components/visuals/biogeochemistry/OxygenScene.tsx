import type {
  CycleRun,
  CycleState,
} from "../../systems/biogeochemistry/contracts";
import { dissolvedOxygen } from "../../systems/biogeochemistry/oxygen";
import { Arrow, Art, Mark } from "./SceneParts";
export function OxygenScene({
  state: s,
  run: r,
  changed,
  id,
}: {
  state: CycleState;
  run: CycleRun;
  changed: boolean;
  id: string;
}) {
  const physical = ["temperature", "mixing"].includes(s.activity);
  const night =
    s.activity === "light"
      ? changed
      : s.activity === "atoms"
        ? r.time > 0 && Math.floor(r.time / 12) % 2 === 0
        : Math.floor(r.time / 12) % 2 === 1;
  const oxygen = dissolvedOxygen(r);
  const before =
    r.fluxes
      .filter((f) => "dissolved" in f.to)
      .reduce((v, f) => v + f.amount, 0) -
    r.fluxes
      .filter((f) => "dissolved" in f.from)
      .reduce((v, f) => v + f.amount, 0);
  const availability =
    oxygen < 3
      ? "Little oxygen available"
      : oxygen < 6
        ? "Less oxygen available"
        : "Oxygen available";
  const exchange = r.fluxes.find((f) => f.process === "Air-water exchange");
  return (
    <Art
      id={id}
      label={`${night ? "Night" : "Daylight"} pond. ${availability}. ${r.event}`}
    >
      <rect
        x="12"
        y="8"
        width="496"
        height="112"
        rx="24"
        fill={night && !physical ? "#e5e6ed" : "#f5edd7"}
      />
      {night && !physical ? (
        <path d="M58 26A26 26 0 1 0 78 62A23 23 0 0 1 58 26" fill="#fdfbee" />
      ) : (
        <circle cx="66" cy="54" r="23" fill="#e7c36e" />
      )}
      <text x="106" y="55" fontSize="20" fontWeight="600">
        {physical
          ? s.activity === "temperature"
            ? `${changed ? 25 : 15} °C water`
            : changed
              ? "Mixed water"
              : "Still water"
          : night
            ? "Night"
            : "Daylight"}
      </text>
      <text x="305" y="38" fontSize="17">
        Oxygen in air
      </text>
      <Mark x={364} y={67} label="O₂" />
      <path
        d="M12 122Q100 117 180 123T350 122T508 123L508 337Q260 357 12 337Z"
        fill="#dceae6"
      />
      <path
        d="M12 122Q100 117 180 123T350 122T508 123"
        fill="none"
        stroke="#789f97"
        strokeWidth="2"
      />
      <Arrow
        marker={id}
        d={
          exchange && "dissolved" in exchange.from
            ? "M420 161L420 85"
            : "M420 85L420 161"
        }
        label="exchange"
        x={429}
        y={104}
      />
      {s.activity === "mixing" && changed && (
        <path
          d="M345 137q18-14 37 0m-15 4q18-14 37 0"
          fill="none"
          stroke="#789f97"
          strokeWidth="3"
        />
      )}
      {[0, 1, ...(s.activity === "plants" && changed ? [2, 3] : [])].map(
        (i) => (
          <g
            key={`plant-position-${i}`}
            transform={`translate(${53 + i * 24} 308)`}
          >
            <path
              d="M0 0Q-12-70 1-136M0-35Q-35-50-22-78M1-70Q28-86 20-114"
              fill="none"
              stroke="#678a62"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        ),
      )}
      <text x="30" y="330" fontSize="17">
        Plants
      </text>
      {!physical && (
        <>
          <Arrow
            marker={id}
            d="M126 184Q176 149 222 181"
            label={night ? "production stops" : "produces oxygen"}
            x={121}
            y={155}
            active={!night}
          />
          <Arrow
            marker={id}
            d="M208 217Q172 251 121 228"
            label="plants use oxygen"
            x={129}
            y={269}
          />
        </>
      )}
      {[
        { x: 232, y: 184 },
        { x: 261, y: 184 },
        { x: 290, y: 184 },
        { x: 232, y: 214 },
        { x: 261, y: 214 },
        { x: 290, y: 214 },
        { x: 232, y: 244 },
        { x: 261, y: 244 },
      ]
        .slice(0, Math.max(0, Math.min(8, Math.round(oxygen))))
        .map(({ x, y }) => (
          <g key={`${x}-${y}`} opacity="0.8" transform={`translate(${x} ${y})`}>
            <circle cx="-5" r="6" fill="#6b9f9c" />
            <circle cx="5" r="6" fill="#6b9f9c" />
          </g>
        ))}
      <g transform="translate(383 240)">
        <path
          d="M-34 0Q-10-26 25 0Q-10 26-34 0M25 0L44-17L44 17Z"
          fill="#c6a36f"
          stroke="#92774f"
          strokeWidth="2"
        />
        <circle cx="-20" cy="-3" r="3" fill="#30362e" />
      </g>
      {!physical && (
        <Arrow
          marker={id}
          d="M308 217L346 232"
          label="uses oxygen"
          x={335}
          y={201}
        />
      )}
      <path d="M164 322q20-33 44 0q21-27 35 0" fill="#c6b396" />
      <text x="170" y="345" fontSize="15">
        {s.activity === "leaves" && r.injected
          ? "Added leaves"
          : "Dead material"}
      </text>
      {!physical && (
        <Arrow
          marker={id}
          d="M288 277L242 316"
          label="microbes use oxygen"
          x={294}
          y={314}
        />
      )}
      {s.activity === "atoms" && (
        <>
          <Mark x={262} y={160} label={r.trace === "dissolved" ? "O" : "H₂O"} />
          <text x="171" y="366" fontSize="16">
            {r.trace === "dissolved"
              ? "Marked atom is in molecular O₂"
              : "Marked atom is now in water"}
          </text>
        </>
      )}
      {s.activity !== "atoms" && (
        <text x="20" y="371" fontSize="18" fontWeight="600">
          {availability}
          {r.time
            ? before > 0.02
              ? " · increasing"
              : before < -0.02
                ? " · decreasing"
                : " · nearly steady"
            : ""}
        </text>
      )}
    </Art>
  );
}
