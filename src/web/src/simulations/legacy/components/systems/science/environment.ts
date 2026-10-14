import { requireValue } from "../../../../creation-and-editing/authoring-engine/requireValue";
import {
  clamp,
  event,
  randomAt,
  type ScienceObservation,
  type ScienceState,
} from "./contracts";
export const habitatRows = 4,
  habitatColumns = 6;
export function environmentStep(s: ScienceState): ScienceState {
  const n = { ...s, time: s.time + 1 };
  if (s.kind === "invasive") {
    const old = requireValue(s.invasive),
      d = structuredClone(old);
    if (s.settings.repeat && d.origin >= 0) {
      d.propagules[d.origin] += 3;
      d.sources[d.origin] = d.origin;
    }
    for (let i = 0; i < 24; i++) {
      if (old.cover[i] > 0) {
        d.propagules[i] += 2;
        for (let j = 0; j < 24; j++) {
          const dist =
            Math.abs((i % 6) - (j % 6)) +
            Math.abs(Math.floor(i / 6) - Math.floor(j / 6));
          const crosses = Math.floor(i / 6) < 2 !== Math.floor(j / 6) < 2;
          if (
            dist > 0 &&
            dist <= s.settings.range &&
            (!s.settings.barrier ||
              !crosses ||
              randomAt(s.seed, n.time, i * 24 + j) < 0.1)
          ) {
            d.propagules[j] += 1;
            d.sources[j] = i;
          }
        }
      }
    }
    for (let i = 0; i < 24; i++) {
      const suitable =
        ((0.65 + randomAt(s.seed, 0, i) * 0.35) * s.settings.suitability) / 100;
      if (d.propagules[i] > 0 && randomAt(s.seed, n.time, i) < suitable) {
        d.cover[i] = clamp(d.cover[i] + 25);
        d.propagules[i]--;
      }
      if (d.cover[i] > 0)
        d.native[i] = Math.max(0, d.native[i] - d.cover[i] * 0.1);
      else d.native[i] = Math.min(100, d.native[i] + 4);
    }
    return event(
      { ...n, invasive: d },
      "Seeds disperse from explicit sources; suitable patches establish and compete with native vegetation.",
    );
  }
  if (s.kind === "volcano") {
    const d = { ...requireValue(s.volcano) },
      input = s.settings.supply * 0.45;
    d.supplied += input;
    d.reservoir += input;
    const explosive = s.settings.preset === 1;
    d.activity = explosive
      ? n.time % 5 === 0 && d.reservoir > 70
        ? 2
        : 0
      : d.reservoir > 30
        ? 1
        : 0;
    const out = Math.min(
      d.reservoir,
      d.activity === 2
        ? d.reservoir * 0.55
        : d.activity === 1
          ? 8 + s.settings.supply * 0.2
          : 0,
    );
    d.reservoir -= out;
    d.lava += out * (explosive ? 0.25 : 1);
    d.ash += out * (explosive ? 0.75 : 0);
    return event(
      { ...n, volcano: d },
      d.activity === 2
        ? "Gas-rich preset releases stored magma as ash and lava deposits."
        : d.activity === 1
          ? "Low-viscosity magma moves through the conduit into effusive lava."
          : "Supply accumulates; this scenario has reduced surface activity.",
    );
  }
  if (s.kind === "water") {
    const d = {
        ...requireValue(s.water),
        trace: [...requireValue(s.water).trace],
      },
      k = s.settings;
    const externalRain = k.rain * 0.18;
    d.input += externalRain;
    d.surface += externalRain;
    const condensed = Math.min(d.atmosphere, k.rain * 0.035);
    d.atmosphere -= condensed;
    d.surface += condensed;
    const available = d.surface;
    d.infiltration = Math.min(
      available,
      ((available * (1 - k.paving / 100) * k.permeability) / 100) * 0.65,
    );
    d.surface -= d.infiltration;
    d.soil += d.infiltration;
    d.runoff = Math.min(d.surface, d.surface * (0.3 + (k.paving / 100) * 0.5));
    d.surface -= d.runoff;
    d.river += d.runoff;
    const percolation = Math.min(
      d.soil,
      ((d.soil * k.permeability) / 100) * 0.08,
    );
    d.soil -= percolation;
    d.ground += percolation;
    d.discharge = Math.min(d.ground, d.ground * 0.035);
    d.ground -= d.discharge;
    d.river += d.discharge;
    const evaporation = Math.min(
      d.surface,
      ((d.surface * k.sunlight) / 100) * 0.12,
    );
    const transpiration = Math.min(
      d.soil,
      ((((d.soil * (1 - k.paving / 100) * k.vegetation) / 100) * k.sunlight) /
        100) *
        0.045,
    );
    d.surface -= evaporation;
    d.soil -= transpiration;
    d.atmosphere += evaporation + transpiration;
    d.evaporation = evaporation + transpiration;
    const outlet = d.river * 0.15,
      atmospheric = d.atmosphere * 0.025;
    d.river -= outlet;
    d.atmosphere -= atmospheric;
    d.output += outlet + atmospheric;
    // The illustrative tracer can only traverse a pathway carrying water this step.
    const choose = randomAt(s.seed, n.time, 81);
    const transitions = [
      condensed > 0 ? 1 : 0,
      d.infiltration > 0 &&
      (d.runoff <= 0 || choose < d.infiltration / (d.infiltration + d.runoff))
        ? 2
        : d.runoff > 0
          ? 4
          : evaporation > 0
            ? 0
            : 1,
      transpiration > 0 &&
      (percolation <= 0 ||
        choose < transpiration / (transpiration + percolation))
        ? 0
        : percolation > 0
          ? 3
          : 2,
      d.discharge > 0 ? 4 : 3,
      outlet > 0 ? 5 : 4,
      5,
    ];
    d.tracer = transitions[d.tracer];
    if (d.trace.at(-1) !== d.tracer)
      d.trace = [...d.trace.slice(-10), d.tracer];
    return event(
      { ...n, water: d },
      `Rain +${externalRain.toFixed(1)}; runoff ${d.runoff.toFixed(1)}; infiltration ${d.infiltration.toFixed(1)}; outlet and atmospheric export ${(outlet + atmospheric).toFixed(1)}.`,
    );
  }
  return event(
    n,
    s.kind === "earth"
      ? "Tracer follows the prescribed schematic mantle flow over compressed geological time."
      : "Relative plate motion updates the surface and cross-section together.",
  );
}
export const waterTotal = (d: NonNullable<ScienceState["water"]>) =>
  d.atmosphere + d.surface + d.soil + d.ground + d.river;
export function environmentObservation(s: ScienceState): ScienceObservation {
  if (s.kind === "invasive") {
    const d = requireValue(s.invasive),
      occupied = d.cover.filter(Boolean).length;
    return {
      stage: `Season ${s.time}`,
      metrics: [
        `${occupied} / 24 · occupied patches`,
        `${Math.round(d.native.reduce((a, b) => a + b, 0) / 24)}% · native cover`,
        `${d.effort} · actions remaining`,
      ],
      explanation:
        "Introduction can fail to establish. Later spread needs propagules from an explicit occupied or surviving source. Native cover responds to local competition and restoration.",
      objects: d.cover.map((v, i) => ({
        name: `Patch ${i + 1}`,
        state: `${v}% invasive · ${Math.round(d.native[i])}% native · ${d.propagules[i]} seeds`,
        why:
          d.sources[i] < 0
            ? "No incoming source recorded."
            : `Seed source: patch ${d.sources[i] + 1}. ${d.treated[i] ? "Treatment recorded; surviving or incoming seeds can recolonize." : "Not treated."}`,
      })),
    };
  }
  if (s.kind === "earth") {
    const mechanical = !!s.settings.classification;
    const objects = mechanical
      ? [
          {
            name: "Lithosphere",
            state: "Rigid crust + uppermost mantle · ~0–100 km",
            why: "A mechanical layer spans two compositional materials.",
          },
          {
            name: "Asthenosphere",
            state: "Weak, predominantly solid upper mantle · ~100–350 km",
            why: "Solid rock can deform over geological time; not a global liquid sea.",
          },
          {
            name: "Deeper mantle",
            state: "Predominantly solid · to ~2,900 km",
            why: "Slow deformation and prescribed tracer circulation are schematic.",
          },
          {
            name: "Outer core",
            state: "Liquid · ~2,900–5,150 km",
            why: "Liquid metallic material differs from the predominantly solid mantle.",
          },
          {
            name: "Inner core",
            state: "Solid · ~5,150–6,371 km",
            why: "High pressure stabilizes solid material.",
          },
        ]
      : [
          {
            name: "Crust",
            state: "Solid · ~5–70 km thick",
            why: "Thin outer compositional layer; drawing exaggerates thickness.",
          },
          {
            name: "Mantle",
            state: "Predominantly solid · to ~2,900 km",
            why: "Solid material deforms slowly; arrows show a prescribed teaching flow.",
          },
          {
            name: "Outer core",
            state: "Liquid · ~2,900–5,150 km",
            why: "Liquid metallic layer.",
          },
          {
            name: "Inner core",
            state: "Solid · ~5,150–6,371 km",
            why: "Solid despite its high temperature, under great pressure.",
          },
        ];
    return {
      stage: mechanical
        ? "Mechanical classification"
        : "Compositional classification",
      metrics: [
        mechanical ? "Lithosphere ≠ crust" : "Four compositional layers",
        "Mantle · predominantly solid",
        "Outer core · liquid / inner · solid",
      ],
      explanation:
        "Composition asks what a layer is made of. Mechanical classification asks how it behaves. The lithosphere includes crust and the rigid uppermost mantle.",
      objects: [
        ...objects,
        {
          name: "Mantle tracer",
          state: `Geological step ${s.time} · prescribed circuit ${Math.floor(s.time / 24) + 1}`,
          why: "An identifiable marker follows a prescribed schematic flow in predominantly solid mantle. This is not a fluid-dynamics solution or literal magma ocean.",
        },
      ],
    };
  }
  if (s.kind === "plates") {
    const preset = s.settings.boundary,
      sub = preset < 2,
      collision = preset === 2,
      divergent = preset === 3;
    const progress = (s.time * s.settings.motion) / 100;
    return {
      stage: [
        "Oceanic–continental convergence",
        "Oceanic–oceanic convergence",
        "Continental collision",
        "Divergence",
        "Transform",
      ][preset],
      metrics: [
        `${s.time} · geological steps`,
        `${(progress * 8).toFixed(0)} · relative displacement`,
        sub
          ? "Trench → slab → volcanic arc"
          : collision
            ? "Continental mountain belt"
            : divergent
              ? "Rift → spreading ridge"
              : "Lateral offset · no slab",
      ],
      explanation: sub
        ? "Denser oceanic lithosphere descends. The scenario forms a trench and, after continued motion, a volcanic arc."
        : collision
          ? "Buoyant continental lithosphere thickens into mountains; this preset forms no subducting oceanic slab or volcanic arc."
          : divergent
            ? "Plates separate, exposing a rift and a schematic spreading ridge."
            : "Plates slide past one another. Lateral displacement does not create a subducting slab.",
      objects: [
        {
          name: "Left lithospheric plate",
          state: sub
            ? "Oceanic"
            : collision
              ? "Continental"
              : divergent
                ? "Separating"
                : "Sliding laterally",
          why: "The plate includes crust and rigid uppermost mantle.",
        },
        {
          name: "Boundary",
          state:
            progress === 0
              ? "Initial geometry"
              : sub
                ? "Trench and descending slab"
                : collision
                  ? "Thickened collision zone"
                  : divergent
                    ? "Opening rift"
                    : "Offset zone",
          why: "Both surface and cross-section read the same displacement.",
        },
        {
          name: "Landscape feature",
          state:
            progress > 1
              ? sub
                ? "Volcanic arc"
                : collision
                  ? "Mountain belt"
                  : divergent
                    ? "Spreading ridge"
                    : "Lateral offset"
              : "Beginning to form",
          why: "Scenario-specific kinematics; no real hazard forecast.",
        },
      ],
    };
  }
  if (s.kind === "volcano") {
    const d = requireValue(s.volcano);
    return {
      stage: ["Storing magma", "Effusive activity", "Explosive activity"][
        d.activity
      ],
      metrics: [
        `${d.reservoir.toFixed(1)} · reservoir`,
        `${d.lava.toFixed(1)} · lava deposits`,
        `${d.ash.toFixed(1)} · ash deposits`,
      ],
      explanation: `${s.settings.preset ? "Gas-rich, higher-viscosity preset stores material before episodic outflow." : "Low-viscosity preset allows continued conduit outflow."} Available magma limits every release; these transitions do not forecast real eruptions.`,
      objects: [
        {
          name: "Magma reservoir",
          state: `${d.reservoir.toFixed(1)} stored · ${d.supplied.toFixed(1)} supplied`,
          why: "Starting reservoir + supplied = current reservoir + erupted lava + ash.",
        },
        {
          name: "Conduit",
          state: d.activity ? "Transporting magma" : "Reduced outflow",
          why: "Outflow is capped by reservoir availability.",
        },
        {
          name: "Surface deposits",
          state: `Lava ${d.lava.toFixed(1)} / ash ${d.ash.toFixed(1)}`,
          why: "Accumulated deposits come from model events, not visual particles.",
        },
      ],
    };
  }
  const d = requireValue(s.water),
    total = waterTotal(d),
    residual = 230 + d.input - d.output - total;
  return {
    stage: `Watershed day ${s.time}`,
    metrics: [
      `${d.runoff.toFixed(1)} · runoff`,
      `${d.infiltration.toFixed(1)} · infiltration`,
      `${total.toFixed(1)} · stored water`,
    ],
    explanation: `Open budget: 230 starting + ${d.input.toFixed(1)} external rainfall − ${d.output.toFixed(1)} exports = ${total.toFixed(1)} stored. Residual ${Math.abs(residual) < 1e-8 ? "0" : residual.toExponential(1)}. Paving redirects surface water toward runoff.`,
    objects: [
      {
        name: "Atmosphere / cloud",
        state: `${d.atmosphere.toFixed(1)} water units`,
        why: "Evaporation/transpiration enter the atmospheric store; condensation and precipitation leave it. Clouds contain droplets or ice.",
      },
      {
        name: "Surface water",
        state: `${d.surface.toFixed(1)} water units`,
        why: "Rain feeds this store; infiltration, evaporation, and runoff remove finite amounts.",
      },
      {
        name: "Soil moisture",
        state: `${d.soil.toFixed(1)} water units`,
        why: "Infiltration enters soil; percolation reaches groundwater; roots transpire water.",
      },
      {
        name: "Groundwater",
        state: `${d.ground.toFixed(1)} water units`,
        why: "Water occupies pores/fractures and discharges into the channel.",
      },
      {
        name: "River / outlet",
        state: `${d.river.toFixed(1)} water units`,
        why: "Runoff and groundwater discharge enter the river; outlet discharge leaves this open watershed.",
      },
      {
        name: "Water tracer",
        state: `${["Atmosphere", "Surface", "Soil", "Groundwater", "River", "Outlet"][d.tracer]} · ${d.trace.map((i) => ["Air", "Surface", "Soil", "Ground", "River", "Outlet"][i]).join(" → ")}`,
        why: "An illustrative seeded pathway through active stores; this tracer does not replace the volume budget.",
      },
    ],
  };
}
