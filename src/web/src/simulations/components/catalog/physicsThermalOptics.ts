import { thermalOpticsSpecs } from "../../domains/physics/thermalOptics";
import type { CompositionRequirements } from "./explorationTeaching";

const additionalRequirements: Record<string, CompositionRequirements> =
  Object.fromEntries(
    thermalOpticsSpecs.map((s) => [
      s.ref,
      {
        topic: `${s.question} ${s.tags.join(", ")}`,
        selectionKey: s.key,
        selectionGroup: "physics",
        commands: s.controls.map((c) => c.command),
        observations: [],
        appearance: `appearance/physics-${s.key}`,
        ...(s.objects
          ? {
              minimumInstances: s.objects.length,
              sharedCommands: s.controls
                .filter((c) => c.field === "time")
                .map((c) => c.command),
            }
          : {}),
        guidance: `${s.assumptions} Attach one scene per independent model. Add ONLY ${s.controls.map((c) => c.label).join(", ")}. The scene already shows the relevant quantities; no separate readouts or universal playback. ${s.objects ? "Use the same one time slider wired to BOTH models; preserve shared geometry and thermal storage. " : ""}All model/scene/control nodes remain independently editable. Preserve unrelated accepted quantities and topology on followups. Unsupported extensions must clarify/reject and preserve the last accepted recipe.`,
      },
    ]),
  );
export const thermalOpticsRequirements: Record<
  string,
  CompositionRequirements
> = {
  ...additionalRequirements,
  "prefabs/physics/Cooling": {
    topic:
      "Hot drink cooling in warm and cold rooms: compare temperature over time",
    selectionKey: "cooling",
    selectionGroup: "physics",
    commands: ["PT_COOLING_TIME"],
    sharedCommands: ["PT_COOLING_TIME"],
    observations: [],
    appearance: "appearance/physics-cooling",
    minimumInstances: 2,
    guidance:
      "Compare two independent drinks initially80°C, ambient20/30°C, coefficient0.05 per minute. Attach one cooling scene per drink and ONE shared Minutes elapsed slider connected to BOTH PT_COOLING_TIME ports. This slider includes Play/Pause, Restart, elapsed time and a short cooling explanation; allow enough space for it. No extra readouts or separate playback toolbar. Defaults time0. Preserve the other cup and unrelated values on revisions. Changing ambient recomputes the experiment from its initial temperature at elapsed time; it is not a mid-run room switch. Builder can independently edit initial/ambient/coefficient. Reject freezing, boiling, evaporation or detailed cup geometry as unsupported.",
  },
};
export const thermalOpticsScalarCommands = {
  ...Object.fromEntries(
    thermalOpticsSpecs.flatMap((s) =>
      s.controls
        .filter((c) => c.type !== "Button")
        .map((c) => [c.command, c.field]),
    ),
  ),
  PT_COOLING_TIME: "time",
  PT_COOLING_AMBIENT: "ambient",
};
export const thermalOpticsLabels = {
  ...Object.fromEntries(
    thermalOpticsSpecs.flatMap((s) =>
      s.controls.map((c) => [c.command, c.label]),
    ),
  ),
  PT_COOLING_TIME: "Minutes elapsed",
  PT_COOLING_AMBIENT: "Room temperature",
};
export const thermalOpticsLiveCommands = Object.keys(
  thermalOpticsScalarCommands,
);
