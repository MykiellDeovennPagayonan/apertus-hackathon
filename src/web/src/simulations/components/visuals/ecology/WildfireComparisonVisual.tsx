import { useId, useState } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import {
  WILDFIRE_MAP,
  type wildfireMeasure,
} from "../../systems/ecology/wildfire";

const fills: Record<string, string> = {
  u: "#d4dfbd",
  t: "#e6d7af",
  l: "#e4a656",
  L: "#e4a656",
  h: "#a14c35",
  H: "#a14c35",
};
const severity: Record<string, string> = {
  u: "unburned",
  t: "unburned",
  l: "low intensity",
  L: "low intensity",
  h: "high intensity",
  H: "high intensity",
};
export function WildfireComparisonVisual({
  instance,
  onCommand,
}: {
  instance: ModelInstance;
  onCommand?: (command: string, value?: unknown) => void;
}) {
  const scene = instance.outputs.scene as ReturnType<
    typeof wildfireMeasure
  >["scene"];
  const id = useId();
  const [focused, setFocused] = useState(0);
  const selectedCount = [...scene.treatment].filter((v) => v === "1").length;
  return (
    <figure
      className="systems-scene wildfire-scene"
      data-treated-area={scene.treated.area}
    >
      <figcaption>
        <strong>Can less fuel change the same wildfire?</strong>
        <span>
          Click trees on the right map to reduce their fuel before the fire.
          Click again to undo.
        </span>
      </figcaption>
      {/* biome-ignore lint/a11y/useSemanticElements: SVG contains the paired landscapes and keyboard-operable map cells. */}
      <svg
        viewBox="0 0 760 365"
        role="group"
        aria-label="Untreated and fuel-treated wildfire patch maps"
      >
        <defs>
          <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse">
            <path d="M0 6L6 0" stroke="#795e32" strokeWidth={1} />
          </pattern>
        </defs>
        {[scene.untreated, scene.treated].map((land, index) => (
          <g
            key={index === 0 ? "untreated" : "treated"}
            transform={`translate(${index * 390} 0)`}
          >
            <text x={0} y={26} className="systems-label">
              {index === 0
                ? "Untreated landscape"
                : "Earlier fuel treatment · click to edit"}
            </text>
            <text x={0} y={55} className="systems-small">
              Wind → ·{" "}
              {index === 0
                ? "No fuel removed"
                : `${selectedCount} trees treated`}
            </text>
            {land.grid.map((row, y) =>
              [...row].map((cell, x) => {
                const patch = y * WILDFIRE_MAP.columns + x;
                const editable = index === 1;
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: Only treated cells receive handlers and the button role.
                  // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-pressed is only present on editable button cells.
                  <g
                    // biome-ignore lint/suspicious/noArrayIndexKey: Permanent fixed landscape coordinates.
                    key={`${y}/${x}`}
                    transform={`translate(${x * 21} ${76 + y * 21})`}
                    role={editable ? "button" : undefined}
                    tabIndex={
                      editable ? (focused === patch ? 0 : -1) : undefined
                    }
                    aria-label={
                      editable
                        ? `Tree row ${y + 1}, column ${x + 1}: ${severity[cell]}`
                        : undefined
                    }
                    aria-pressed={
                      editable ? scene.treatment[patch] === "1" : undefined
                    }
                    data-tree={editable ? patch : undefined}
                    className={editable ? "fire-tree" : "fire-reference-tree"}
                    onFocus={editable ? () => setFocused(patch) : undefined}
                    onClick={
                      editable
                        ? () => {
                            setFocused(patch);
                            onCommand?.("FIRE_TOGGLE_PATCH", patch);
                          }
                        : undefined
                    }
                    onKeyDown={
                      editable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onCommand?.("FIRE_TOGGLE_PATCH", patch);
                              return;
                            }
                            const next =
                              e.key === "ArrowRight"
                                ? y * WILDFIRE_MAP.columns +
                                  Math.min(WILDFIRE_MAP.columns - 1, x + 1)
                                : e.key === "ArrowLeft"
                                  ? y * WILDFIRE_MAP.columns +
                                    Math.max(0, x - 1)
                                  : e.key === "ArrowDown"
                                    ? Math.min(WILDFIRE_MAP.rows - 1, y + 1) *
                                        WILDFIRE_MAP.columns +
                                      x
                                    : e.key === "ArrowUp"
                                      ? Math.max(0, y - 1) *
                                          WILDFIRE_MAP.columns +
                                        x
                                      : e.key === "Home"
                                        ? y * WILDFIRE_MAP.columns
                                        : e.key === "End"
                                          ? y * WILDFIRE_MAP.columns +
                                            WILDFIRE_MAP.columns -
                                            1
                                          : undefined;
                            if (next !== undefined) {
                              e.preventDefault();
                              setFocused(next);
                              e.currentTarget.parentElement
                                ?.querySelector<SVGGElement>(
                                  `[data-tree="${next}"]`,
                                )
                                ?.focus();
                            }
                          }
                        : undefined
                    }
                  >
                    <title>
                      {editable
                        ? "Click to treat or restore this tree"
                        : "Untreated reference"}
                    </title>
                    <rect
                      className="fire-cell"
                      width={19}
                      height={19}
                      rx={2}
                      fill={fills[cell]}
                    />
                    {/[tLH]/.test(cell) && (
                      <rect width={19} height={19} fill={`url(#${id})`} />
                    )}
                    {cell === "u" && (
                      <path
                        d="M5 14L9 5L13 14M9 5V17"
                        stroke="#749065"
                        strokeWidth={1}
                      />
                    )}
                    {/[hH]/.test(cell) && (
                      <path
                        d="M5 13L10 6L14 13"
                        fill="none"
                        stroke="#ffe4ca"
                        strokeWidth={2}
                      />
                    )}
                    {/[lL]/.test(cell) && (
                      <circle cx={10} cy={10} r={2} fill="#715522" />
                    )}
                  </g>
                );
              }),
            )}
            <path d="M-4 190L8 180L8 199Z" fill="#30362e" />
            <path
              d="M343 168L354 158L365 168V185H343Z"
              fill={land.reached ? "#a14c35" : "#39776d"}
            />
            <text x={0} y={313} className="systems-value">
              {land.area}% burned · peak {land.peak}
            </text>
            <text x={0} y={343} className="systems-small">
              Community: {land.reached ? "reached" : "not reached"}
            </text>
          </g>
        ))}
      </svg>
      <div className="systems-map-key">
        <span>
          <i className="map-unburned" />
          Unburned / vegetation
        </span>
        <span>
          <i className="map-treated" />
          Treated / stripes
        </span>
        <span>
          <i className="map-low" />
          Low intensity / dot
        </span>
        <span>
          <i className="map-high" />
          High intensity / chevron
        </span>
      </div>
      <div className="fire-edit-toolbar">
        <button type="button" onClick={() => onCommand?.("FIRE_CLEAR_PATCHES")}>
          Clear treatment
        </button>
        <button
          type="button"
          onClick={() =>
            onCommand?.("FIRE_SET_COVERAGE", instance.state.coverage)
          }
        >
          Restore width preset
        </button>
        <span>Keyboard: arrows move; Enter treats or restores.</span>
      </div>
      <p className="systems-footnote" aria-live="polite">
        {selectedCount} of {WILDFIRE_MAP.rows * WILDFIRE_MAP.columns} trees
        treated. Both maps share ignition, vegetation and weather.
      </p>
    </figure>
  );
}
