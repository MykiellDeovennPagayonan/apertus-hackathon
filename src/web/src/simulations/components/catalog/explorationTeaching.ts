import { mathAnalysisRequirements } from "./mathAnalysis";
import { mathGeometryRequirements } from "./mathGeometry";
import { thermalOpticsRequirements } from "./physicsThermalOptics";
import { physicsMechanicsRequirements } from "./physicsMechanics";
import { cycleKinds, cycleModels } from "../../domains/biogeochemistry";
import {
  collectiveKinds,
  collectiveModels,
  command,
} from "../../domains/collective";
import { scienceCommand } from "../../domains/science";
import { scienceSpecs } from "../../domains/science/specs";
import type { PublicDefinition } from "../../runtime/authoring/types";
import { cycleCommand } from "../systems/biogeochemistry/contracts";
import { earthRequirements } from "./earthAtmosphere";
export interface CompositionRequirements {
  topic: string;
  guidance?: string;
  instanceNoun?: string;
  selectionKey: string;
  /** Distinct neighboring topics give the decision model meaningful alternatives. */
  selectionGroup?: string;
  commands: string[];
  /** Only declared comparison actions reuse another instance's control. */
  sharedCommands?: string[];
  observations: string[];
  appearance?: string;
  dependencies?: string[];
  minimumInstances?: number;
}
const scienceTopics: Record<string, string> = {
  cell: "Cell division and mitosis",
  immune: "Immune defense and antigen-specific memory",
  genome: "Genetics and inheritance",
  pollination: "Pollination",
  invasive: "Spread and removal of invasive species",
  earth:
    "Earth interior: crust, mantle, outer core and inner core; mantle convection.",
  plates: "Plate boundaries and tectonics",
  volcano: "Volcano eruptions: effusive and explosive",
  water: "Water cycle and watershed runoff",
};
const collectiveEditGuidance: Record<string, string> = {
  fishing:
    "Configuration meanings: arrangement=0 requests 4 fish each; arrangement=1 requests 8 from the first fisherman and 4 from each other; arrangement=2 requests 8 each. visibility=0 private catches, 1 public catches. policy=0 fixed requests, 1 copying the previous highest visible catch, 2 cooperating to share the current daily births. quota=true enforces a fixed four-fish cap; this is distinct from voluntary cooperation. For an agreement request set policy=2, preserve initialStock and all unrelated settings. Human negotiation is unsupported. Catch changes preserve current stock and day.",
  crowd:
    "placement=0 central pillar, 1 closer to exit, 2 offset. friction is a conflict probability, not physical pressure; higher friction represents stronger destination conflicts (default .9, stronger .99). Change only friction for stronger pushing and explain this approximation. Preserve count, seed, placement and radius. A placement change reruns the same initial crowd. A pillar cannot be guaranteed to help; measurements can show slower, faster or equal evacuation.",
  voting:
    "rule=0 plurality, 1 instant-runoff ranked choice, 2 approval allowing multiple candidates. A rule change must patch ONLY rule and preserve groups, ballots, candidateCount and seed, retaining the same electorate. There is no defined universally best candidate; a request to prove universal superiority is unsupported.",
  selection:
    "habitat=.1 light, .9 dark; trait=0 light, 1 dark. For a darker environment change ONLY habitat to .9, preserving living organisms and generation and all starting settings. To start identical with no mutations set uniform=true and mutationRate=0; this restarts the population. initialTrait describes a newly started population, never a living individual's adaptation. Living individuals cannot change trait to adapt: selection acts on variation, offspring inherit and may mutate. A request to recolor living individuals to adapt is unsupported.",
};
export const compositionRequirements: Record<string, CompositionRequirements> =
  {
    ...mathGeometryRequirements,
    "prefabs/physics/Lever": {
      topic:
        "Crowbar and lever: adjustable fulcrum, torque, mechanical advantage and force/travel tradeoff",
      selectionKey: "lever",
      selectionGroup: "physics",
      guidance:
        "Build an independent crowbar scene, one pivotPercent slider and one LEVER_LIFT button. The scene already shows required effort and arm lengths; no generic readouts, load/length sliders or playback dashboard unless that is the actual requested investigation. Defaults length=1.2 m, pivotPercent=100/6 %, loadForce=100 N. Preserve unrelated settings and lifted pose. For a longer crowbar at fixed physical load arm, change both length and pivotPercent=100*oldLoadArm/newLength; merely scaling length at fixed percentage preserves mechanical advantage. At most two independent levers may compare geometry. Pivot at either end is invalid; real strength or dynamic motion is unsupported.",
      commands: ["LEVER_SET_PIVOT", "LEVER_LIFT"],
      observations: [],
      appearance: "appearance/physics-lever",
    },
    ...earthRequirements,
    ...mathAnalysisRequirements,
    ...physicsMechanicsRequirements,
    ...thermalOpticsRequirements,
    ...Object.fromEntries(
      collectiveKinds.map((kind, i) => [
        collectiveModels[i].ref,
        {
          topic: {
            fishing: "Overfishing a shared fishing lake",
            crowd: "Obstacle effects on exit speed",
            voting: "Alternate voting systems",
            selection:
              "Natural selection: evolution through survival and reproduction",
          }[kind],
          selectionKey: {
            fishing: "overfishing",
            crowd: "exit-obstacles",
            voting: "voting",
            selection: "natural-selection",
          }[kind],
          selectionGroup: "collective-learning",
          guidance: `${collectiveModels[i].description} Scene first, one primary action, one essential choice, one short caption. Use independent controls/collective-${kind}-action and ${kind === "crowd" ? "no initial choice" : `controls/collective-${kind}-choice`} and displays/collective-${kind}-caption. Connect scene value to each control/caption, and their event outputs to corresponding model commands. Do not add generic slider/readout/playback dashboards. ${collectiveModels[i].assumptions.join(" ")} ${collectiveEditGuidance[kind]}`,
          commands: [
            ...["RUN", "PAUSE", "RESTART", "COMPLETE"].map((op) =>
              command(kind, op),
            ),
            ...(kind === "crowd" ? [command(kind, "SET_placement")] : []),
            ...(kind === "crowd"
              ? []
              : [
                  command(
                    kind,
                    `SET_${kind === "fishing" ? "arrangement" : kind === "voting" ? "rule" : "habitat"}`,
                  ),
                ]),
          ],
          observations: [],
          appearance: `appearance/collective-${kind}`,
          dependencies: [
            `controls/collective-${kind}-action`,
            ...(kind === "crowd" ? [] : [`controls/collective-${kind}-choice`]),
            `displays/collective-${kind}-caption`,
          ],
        },
      ]),
    ),
    ...Object.fromEntries(
      cycleKinds.map((kind, i) => [
        cycleModels[i].ref,
        {
          topic: `${kind} cycle`,
          selectionKey: `${kind}-cycle`,
          guidance: `${cycleModels[i].description} Keep the opening to its scene, one primary action, one short caption and a quiet activity entry. Use the independent cycle action/activity/caption components; no generic metric dashboard.`,
          commands: [
            cycleCommand(kind, "ADVANCE"),
            cycleCommand(kind, "ACTIVITY"),
            cycleCommand(kind, "RESTART"),
          ],
          observations: ["scene"],
          appearance: `appearance/cycle-${kind}`,
          dependencies: [
            `controls/cycle-${kind}-action`,
            `controls/cycle-${kind}-activity`,
            `displays/cycle-${kind}-caption`,
          ],
        },
      ]),
    ),
    ...Object.fromEntries(
      scienceSpecs.map((spec) => [
        `prefabs/science/${spec.name}`,
        {
          topic: scienceTopics[spec.kind],
          selectionKey: spec.slug,
          guidance: `${spec.question} ${spec.invitation} ${spec.assumptions.join(" ")} Add a stage action, supported condition controls, attached scene, and separate observations.`,
          commands: [
            scienceCommand(spec.kind, "STEP"),
            ...(spec.kind === "immune"
              ? [scienceCommand(spec.kind, "EXPOSE")]
              : spec.kind === "invasive"
                ? [
                    scienceCommand(spec.kind, "INTRODUCE"),
                    scienceCommand(spec.kind, "REMOVE"),
                  ]
                : []),
            ...spec.settings
              .filter((f) => !f.advanced)
              .slice(0, 2)
              .map((f) =>
                scienceCommand(spec.kind, `SET_${f.key.toUpperCase()}`),
              ),
          ],
          observations: ["summary", "explanation", "inspection"],
          appearance: `appearance/science-${spec.kind}`,
        },
      ]),
    ),
    "models/SpringMass": {
      topic: "How springs work: stiffness, mass and damping",
      selectionKey: "spring",
      guidance:
        "For follow-up changes: a stronger spring means increase stiffness; less bouncing means increase damping while preserving stiffness, mass and amplitude. Stiffness changes frequency but does not dissipate energy. Damping dissipates energy and makes bouncing decay. At fixed mass quadrupling stiffness doubles frequency. For initial construction use a spring visual, stiffness slider and release button, without a measurement dashboard.",
      commands: ["set:stiffness", "RELEASE"],
      observations: [],
      appearance: "appearance/SpringMass",
    },
    "prefabs/physical-systems/Pendulum": {
      topic: "Pendulum simulation",
      guidance:
        "Explore how length changes swing time at a fixed starting angle, then try larger starting angles up to 90°. Nonlinear period increases with amplitude; T≈2π√(L/g) is only the small-angle limit. Compare successive settings on the same pendulum. The drawing uses a fixed metre scale; changing length must visibly change the rod length.",
      selectionKey: "pendulum",
      commands: ["PEND_SET_LENGTH", "PEND_SET_AMPLITUDE", "PHYS_PLAY"],
      observations: ["period"],
      appearance: "appearance/physical-pendulum",
    },
    "prefabs/dynamic-systems/RingTraffic": {
      topic: "Traffic jam simulation",
      guidance:
        "Compare an undisturbed run and a braking run after reset with the same settings. Headway changes following behavior; congestion depends on density and parameters. Braking is a temporary disturbance, not an accident.",
      selectionKey: "traffic",
      commands: ["TRAFFIC_BRAKE", "TRAFFIC_SET_HEADWAY", "TRAFFIC_SET_PLAYING"],
      observations: ["averageSpeed"],
      appearance: "appearance/dynamic-traffic",
    },
    "prefabs/physical-systems/ResistiveCircuit": {
      topic: "Circuit bulbs in series and parallel",
      selectionKey: "circuit",
      commands: ["CIRC_SET_BULBS", "CIRC_SET_TOPOLOGY"],
      observations: ["bulbPower"],
      appearance: "appearance/physical-circuit",
    },
    "models/EclipseGeometry": {
      topic: "Solar and lunar eclipse geometry",
      selectionKey: "eclipse",
      commands: ["set:moonAngle", "set:moonOffset", "set:moonDistance"],
      observations: ["event"],
      appearance: "appearance/EclipseGeometry",
    },
    "models/SinusoidalSignal": {
      topic: "Sound pressure signal",
      instanceNoun: "Signal",
      selectionKey: "signal",
      commands: ["set:phase", "set:amplitude", "set:frequency"],
      observations: [],
      minimumInstances: 2,
      dependencies: ["data/SignalSuperposition"],
    },
    "data/SignalSuperposition": {
      topic: "Noise cancelling headphones",
      selectionKey: "headphones",
      commands: [],
      observations: ["residualPeak"],
      appearance: "appearance/SignalSuperposition",
      dependencies: ["models/SinusoidalSignal"],
    },
  };
export function applyExplorationTeaching(
  definitions: Map<string, PublicDefinition>,
) {
  for (const [id, requirements] of Object.entries(compositionRequirements)) {
    const d = definitions.get(id);
    if (!d) throw new Error(`Missing exploration model ${id}`);
    for (const command of requirements.commands)
      if (!d.commands[command])
        throw new Error(`Missing exploration command ${id}.${command}`);
    for (const output of requirements.observations)
      if (!d.outputs[output])
        throw new Error(`Missing exploration output ${id}.${output}`);
    if (requirements.appearance && !definitions.has(requirements.appearance))
      throw new Error(`Missing exploration appearance ${id}`);
  }
}
