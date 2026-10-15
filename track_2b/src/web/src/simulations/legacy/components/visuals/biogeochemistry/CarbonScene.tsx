import type {
  CycleRun,
  CycleState,
} from "../../systems/biogeochemistry/contracts";
import { Arrow, Art, Mark, Tree } from "./SceneParts";

const names: Record<string, string> = {
  atmosphere: "CO₂ in air",
  plants: "Plant material",
  animals: "Animal material",
  dead: "Dead organic matter",
  soil: "Soil carbon",
  surface: "Ocean inorganic carbon",
};
export function CarbonScene({
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
  if (s.activity === "geology")
    return (
      <Art
        id={id}
        label="Separate schematic geological timeline: organic burial and fossil formation; weathering, carbonate sediment and rock."
      >
        <rect x="12" y="10" width="496" height="98" rx="22" fill="#f4eddc" />
        <Mark x={260} y={43} label="CO₂" />
        <path d="M12 120L230 120L290 180L508 180V370H12Z" fill="#dfd2b7" />
        <path d="M252 120H508V180H290Z" fill="#d5e7e3" />
        <Arrow
          marker={id}
          d="M289 57L397 144"
          label="weathering"
          x={345}
          y={84}
        />
        <text x="25" y="158" fontSize="16">
          Buried organic matter
        </text>
        <Arrow
          marker={id}
          d="M102 177L102 259"
          label="long-term formation"
          x={117}
          y={224}
        />
        <rect x="25" y="272" width="156" height="37" rx="7" fill="#796a56" />
        <text x="48" y="297" fontSize="18" fill="#fffbef">
          Fossil carbon
        </text>
        <Arrow
          marker={id}
          d="M417 177L417 249"
          label="deposition"
          x={317}
          y={219}
        />
        <text x="302" y="275" fontSize="17">
          Carbonate sediment
        </text>
        <Arrow marker={id} d="M416 286L416 329" label="" x={0} y={0} />
        <text x="349" y="358" fontSize="18">
          Carbonate rock
        </text>
        <Mark
          x={s.trace === "dead" ? 75 : 103}
          y={s.trace === "dead" ? 126 : s.trace === "buried" ? 186 : 290}
          label="C*"
        />
        <Arrow
          marker={id}
          d="M305 337Q228 180 245 63"
          label="geological return"
          x={151}
          y={332}
        />
      </Art>
    );
  if (s.activity === "ocean") {
    const exchange = r.fluxes.find((f) => f.process === "Air-sea exchange");
    return (
      <Art
        id={id}
        label="Carbon exchange between air, surface dissolved inorganic carbon, and a larger deep-ocean store."
      >
        <rect x="12" y="8" width="496" height="100" rx="24" fill="#f4eddc" />
        <Mark x={260} y={48} label="CO₂" />
        <text x="31" y="52" fontSize="18">
          Air
        </text>
        <path d="M12 120H508V370H12Z" fill="#dceae6" />
        <path d="M12 243H508V370H12Z" fill="#b7d0cc" />
        <Arrow
          marker={id}
          d={
            exchange && "surface" in exchange.from
              ? "M260 168L260 75"
              : "M260 75L260 168"
          }
          label="air-sea exchange"
          x={282}
          y={132}
        />
        <text x="32" y="180" fontSize="20">
          Surface ocean
        </text>
        <text x="32" y="207" fontSize="16">
          Dissolved inorganic carbon
        </text>
        <Arrow
          marker={id}
          d="M259 226L259 302"
          label="slower mixing"
          x={280}
          y={280}
        />
        <text x="32" y="323" fontSize="20">
          Deep ocean
        </text>
        <text x="32" y="350" fontSize="16">
          A large store; limited exchange
        </text>
      </Art>
    );
  }
  const clearing = s.activity === "clearing" && changed && r.injected;
  const scale = Math.min(1.1, 0.25 + r.stores.plants / 100);
  return (
    <Art
      id={id}
      label={`Carbon landscape. ${clearing ? "Cleared patch with regrowing vegetation, dead material and harvested wood" : "Plants, animals and soil"}. ${names[r.trace] ?? r.trace}.`}
    >
      <rect x="12" y="8" width="496" height="143" rx="24" fill="#f4eddc" />
      <text className="cycle-air-label" x="30" y="42" fontSize="18">
        Carbon dioxide in air
      </text>
      <Mark x={281} y={42} label="CO₂" />
      <path d="M12 234Q145 210 282 235T508 234V370H12Z" fill="#e0d1b5" />
      <Tree x={102} y={233} size={scale} />
      <Tree x={169} y={237} size={scale * 0.78} />
      {s.activity === "fuel" ? (
        <>
          <rect
            x="64"
            y="293"
            width="188"
            height="43"
            rx="8"
            fill="#fffbef"
            stroke="#796a56"
            strokeWidth="2"
          />
          <rect
            data-fuel-fill="true"
            x="66"
            y="295"
            width={(184 * r.stores.fossil) / 120}
            height="39"
            rx="6"
            fill="#796a56"
          />
          <text x="67" y="283" fontSize="18">
            Fossil carbon
          </text>
          {Array.from(
            {
              length: Math.min(
                10,
                Math.round((r.stores.atmosphere - 250) / 12),
              ),
            },
            (_, parcel) => ({
              x: 352 + (parcel % 5) * 27,
              y: 52 + Math.floor(parcel / 5) * 30,
            }),
          ).map(({ x, y }) => (
            <g
              key={`${x}-${y}`}
              aria-label="Carbon transferred from fuel to air"
            >
              <circle cx={x} cy={y} r="8" fill="#9b5c35" />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fill="#fffbef"
                fontSize="12"
              >
                C
              </text>
            </g>
          ))}
          <Arrow
            marker={id}
            d="M268 304Q465 142 320 47"
            label="combustion"
            active={r.stores.fossil > 0 || r.fluxes.length > 0}
            x={374}
            y={164}
          />
          <text x="19" y="370" fontSize="17">
            {r.stores.fossil
              ? "Burning transfers existing carbon"
              : "No fossil carbon remains"}
          </text>
        </>
      ) : (
        <>
          <Arrow
            marker={id}
            d="M249 53Q162 55 125 126"
            label="photosynthesis"
            x={74}
            y={82}
          />
          <Arrow
            marker={id}
            d="M194 188L302 188"
            label="feeding"
            x={225}
            y={175}
          />
          <g transform="translate(367 211)">
            <ellipse rx="37" ry="19" fill="#bb9c75" />
            <circle cx="35" cy="-14" r="14" fill="#bb9c75" />
            <path d="M-25 13v22m42-22v22" stroke="#927451" strokeWidth="5" />
          </g>
          <Arrow
            marker={id}
            d="M390 179Q440 77 320 45"
            label="respiration"
            x={374}
            y={86}
          />
          <Arrow
            marker={id}
            d="M148 139Q204 75 243 51"
            label="plants respire"
            x={189}
            y={112}
          />
          <text x="22" y="278" fontSize="16">
            Dead organic matter
          </text>
          <Arrow marker={id} d="M154 287L197 325" label="" x={0} y={0} />
          <text x="136" y="353" fontSize="18">
            Soil carbon
          </text>
          <Arrow
            marker={id}
            d="M290 320Q493 263 333 50"
            label="decomposition"
            x={326}
            y={295}
          />
          {clearing && (
            <>
              <path
                d="M330 333h132m-123 8h112"
                stroke="#9a7c52"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <text x="335" y="369" fontSize="16">
                Harvested wood
              </text>
            </>
          )}
        </>
      )}
      {s.activity === "route" && (
        <>
          <Mark
            x={
              r.trace === "plants"
                ? 104
                : r.trace === "animals"
                  ? 367
                  : r.trace === "dead"
                    ? 81
                    : r.trace === "soil"
                      ? 231
                      : 350
            }
            y={
              r.trace === "plants"
                ? 164
                : r.trace === "animals"
                  ? 211
                  : r.trace === "dead"
                    ? 306
                    : r.trace === "soil"
                      ? 332
                      : 42
            }
          />
          <text x="26" y="376" fontSize="17" fontWeight="600">
            Following: {names[r.trace] ?? r.trace}
          </text>
        </>
      )}
    </Art>
  );
}
