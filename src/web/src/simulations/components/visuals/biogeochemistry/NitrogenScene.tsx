import type {
  CycleRun,
  CycleState,
} from "../../systems/biogeochemistry/contracts";
import { Arrow, Art, Mark, Tree } from "./SceneParts";

const carrierNames: Record<string, string> = {
  atmosphere: "Nitrogen gas in air",
  nodules: "Microbial partners",
  plants: "Plant material",
  animals: "Animal material",
  dead: "Dead material",
  ammonium: "Soil ammonium",
  nitrite: "Soil nitrite",
  nitrate: "Soil nitrate",
};
export function NitrogenScene({
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
  const partner =
    s.activity === "partners"
      ? changed
      : s.activity === "rain"
        ? changed && s.variant === 1
        : true;
  const waterlogged = s.activity === "soil" && changed;
  const growth = Math.min(1.3, 0.72 + (r.stores.plants - 5) * 0.05);
  return (
    <Art
      id={id}
      label={`Soil and roots. ${partner ? "Microbial partners in nodules" : "No microbial partners"}. ${carrierNames[r.trace] ?? r.trace}.`}
    >
      <rect x="12" y="8" width="496" height="148" rx="24" fill="#f4eddc" />
      <Tree x={328} y={153} size={growth} />
      <Mark x={90} y={49} label="N₂" />
      {s.activity === "route" && (
        <>
          <g transform="translate(450 82)">
            <ellipse rx="24" ry="14" fill="#c6a36f" />
            <circle cx="21" cy="-11" r="10" fill="#c6a36f" />
            <path d="M-14 9v20m24-20v20" stroke="#92774f" strokeWidth="4" />
            <circle cx="25" cy="-14" r="2" fill="#30362e" />
          </g>
          <Arrow
            marker={id}
            d="M372 77L414 81"
            label="feeding"
            x={389}
            y={54}
          />
          <Arrow
            marker={id}
            d="M453 115Q483 219 437 307"
            label="waste"
            x={457}
            y={268}
          />
        </>
      )}
      <text x="27" y="87" fontSize="16">
        Nitrogen gas
      </text>
      <path
        d="M12 160L508 160L508 355Q260 371 12 355Z"
        fill={waterlogged ? "#cfddd6" : "#e1d0b1"}
      />
      <path
        d="M328 160v40l-38 36m38-36 45 45m-45-23-8 37m0-14-32 16m40-15 17 22"
        stroke="#8d7451"
        strokeWidth="4"
        fill="none"
      />
      {partner && (
        <>
          <circle cx="291" cy="234" r="11" fill="#c8a0a0" stroke="#805e5e" />
          <circle cx="346" cy="258" r="8" fill="#c8a0a0" stroke="#805e5e" />
          <Arrow
            marker={id}
            d="M100 101Q158 169 276 230"
            label="microbes fix nitrogen"
            x={112}
            y={127}
          />
        </>
      )}
      {!partner && (
        <text x="295" y="282" fontSize="16">
          No nodules
        </text>
      )}
      {s.activity === "soil" ? (
        <>
          <Mark x={65} y={225} label="NH₄⁺" shape="diamond" />
          <Mark x={168} y={225} label="NO₂⁻" shape="square" />
          <Mark x={266} y={304} label="NO₃⁻" />
          <Arrow
            marker={id}
            d="M95 225L136 225"
            label="nitrification"
            x={33}
            y={263}
            active={!waterlogged}
          />
          <Arrow
            marker={id}
            d="M185 240L239 290"
            label=""
            x={0}
            y={0}
            active={!waterlogged}
          />
          <Arrow
            marker={id}
            d="M280 284Q440 152 128 55"
            label="denitrification"
            x={351}
            y={122}
            active={waterlogged}
          />
        </>
      ) : (
        <>
          <Mark x={70} y={220} label="NH₄⁺" shape="diamond" />
          <text x="29" y="254" fontSize="15">
            Ammonium
          </text>
          <Mark x={193} y={220} label="NO₃⁻" />
          <text x="160" y="254" fontSize="15">
            Nitrate
          </text>
          <Arrow
            marker={id}
            d="M218 220L280 226"
            label="root uptake"
            x={218}
            y={204}
          />
          <Arrow marker={id} d="M94 229Q172 285 289 248" label="" x={0} y={0} />
        </>
      )}
      {s.activity === "rain" ? (
        <>
          <path d="M16 163L153 163" stroke="#749c9b" strokeWidth="3" />
          <Arrow marker={id} d="M40 169L40 316" label="" x={0} y={0} />
          {["leached", "runoff"].flatMap((destination) =>
            Array.from(
              { length: Math.min(8, Math.round(r.stores[destination])) },
              (_, position) => ({
                destination,
                x: destination === "leached" ? 75 + position * 18 : 481,
                y: destination === "leached" ? 316 : 192 + position * 18,
              }),
            ).map(({ destination, x, y }) => (
              <circle
                key={`${destination}-${x}-${y}`}
                cx={x}
                cy={y}
                r="5"
                fill="#285e56"
                aria-label={
                  destination === "leached"
                    ? "Nitrogen below roots"
                    : "Nitrogen in runoff"
                }
              />
            )),
          )}
          <text x="20" y="335" fontSize="15">
            Below roots
          </text>
          <Arrow
            marker={id}
            d="M381 165L487 165"
            label="runoff"
            x={413}
            y={147}
          />
          <text x="100" y="365" fontSize="16">
            {r.injected
              ? r.stores.leached > 0
                ? "Nitrogen left the root zone"
                : "No nitrate available to leave"
              : "Same rainfall in both plots"}
          </text>
        </>
      ) : (
        <>
          <path d="M370 315q18-27 32 0q25-30 45 0" fill="#bba686" />
          <text x="343" y="341" fontSize="15">
            Dead material
          </text>
          <Arrow
            marker={id}
            d="M355 326Q90 365 65 247"
            label="mineralization"
            x={105}
            y={317}
          />
        </>
      )}
      {s.activity === "route" && (
        <>
          {r.trace === "nitrite" && (
            <Mark x={135} y={285} label="NO₂⁻" shape="square" />
          )}
          {(() => {
            const locations: Record<string, [number, number]> = {
              atmosphere: [90, 49],
              nodules: [291, 234],
              plants: [328, 75],
              animals: [450, 82],
              dead: [406, 311],
              ammonium: [70, 220],
              nitrite: [135, 285],
              nitrate: [193, 220],
            };
            const [x, y] = locations[r.trace] ?? [90, 49];
            return (
              <g aria-label="Marked nitrogen location">
                <circle
                  cx={x}
                  cy={y}
                  r="31"
                  fill="none"
                  stroke="#9b5c35"
                  strokeWidth="3"
                  strokeDasharray="4 3"
                />
                <text
                  x={x + 27}
                  y={y - 22}
                  fill="#9b5c35"
                  fontSize="16"
                  fontWeight="600"
                >
                  N*
                </text>
              </g>
            );
          })()}
          <rect x="18" y="354" width="484" height="25" rx="6" fill="#fffbef" />
          <text
            x="260"
            y="373"
            textAnchor="middle"
            fontSize="17"
            fontWeight="600"
          >
            Following: {carrierNames[r.trace] ?? r.trace}
          </text>
        </>
      )}
      {s.activity === "fertilizer" && (
        <text x="20" y="374" fontSize="17">
          {r.stores.plants > 13
            ? "Light and space now limit growth"
            : changed && r.injected
              ? "Added nitrogen is available in soil"
              : "Plant growth takes time"}
        </text>
      )}
    </Art>
  );
}
