import { operations } from "../../runtime/capabilities";
import {
  type CompositionDefinition,
  immutable,
} from "../../runtime/definition";
import { learningPolicies } from "../resources/LearningPolicies";
export const GasPressureExperiment: CompositionDefinition = immutable({
  id: "GasPressureExperiment",
  demo: "gas",
  version: 1,
  plane: "xy",
  units: "mmol, K, L, kPa",
  rendering: "svg",
  layout: "scene-and-controls",
  defaults: { ...learningPolicies.gas },
  viewSettings: { width: 640, height: 320 },
  measurements: ["pressureKPa"],
  components: {
    resources: [],
    traits: ["GasState", "GasMetrics"],
    behaviors: [],
    systems: ["IdealGasSystem", "GasParticleIllustrationSystem"],
    visuals: ["GasContainerVisual", "GasParticleVisual"],
    views: ["SVGWorldView", "PressureReadout"],
    controls: ["ParameterSlider", "ActionButton"],
    prefabs: ["GasContainer", "GasSample"],
    compositions: ["GasPressureExperiment"],
  },
  systems: ["IdealGasSystem", "GasParticleIllustrationSystem"],
  instances: [
    {
      id: "gas/container",
      prefab: "GasContainer",
      parameters: { ...learningPolicies.gas },
    },
  ],
  actions: Object.keys(operations.gas),
  assumptions: [
    "Equilibrium ideal gas: P = nRT/V. Volume changes hold temperature fixed; transient compression is not simulated.",
    "Fixed-depth schematic; 40 representative dots per mmol, not individual molecules. Motion illustrates wall interactions and does not calculate pressure.",
  ],
});
