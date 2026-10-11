import { mechanicsModels } from "./mechanics";
import type { LeverState } from "../../components/systems/physics/lever";
import {
  leverDefaults,
  leverMeasure,
  leverParameters,
  leverState,
} from "../../components/systems/physics/lever";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import { num, object, validateValue } from "../../runtime/parameterSchema";

const setter = (schema: ReturnType<typeof num>, description: string) => ({
  arguments: object({ value: schema }),
  description,
  timing: "live" as const,
  target: "instance" as const,
});
export const leverModel: DomainModel = {
  ref: "prefabs/physics/Lever",
  version: 1,
  name: "Crowbar and pivot",
  description:
    "Move a crowbar's fulcrum to trade required effort against travel. An ideal first-class lever has a load at the left end and downward effort at the right. Extend the effort arm while keeping the load arm fixed to reduce effort; changing total length at fixed pivot percentage alone preserves mechanical advantage.",
  tags: [
    "lever",
    "levers",
    "crowbar",
    "fulcrum",
    "pivot",
    "mechanical advantage",
    "torque",
    "lifting",
  ],
  assumptions: [
    "Massless rigid bar and frictionless fixed pivot; vertical forces, ideal static balance or a quasi-static 5° lift. No acceleration, strength, friction or elasticity model.",
    "Left load rises as the right effort end moves down; less force requires more travel. Input and output work match.",
  ],
  parameters: leverParameters,
  defaults: leverDefaults,
  presentation: "physics-lever",
  maximumInstances: 2,
  requiredObservations: [],
  outputs: Object.fromEntries(
    Object.entries({
      angle: ["deg", "Clockwise lift angle"],
      loadArm: ["m", "Load end's radial distance from pivot"],
      effortArm: ["m", "Effort end's radial distance from pivot"],
      loadMomentArm: ["m", "Perpendicular load lever arm"],
      effortMomentArm: ["m", "Perpendicular effort lever arm"],
      mechanicalAdvantage: ["1", "Effort arm divided by load arm"],
      effortForce: [
        "N",
        "Downward effort needed for ideal balance or slow lift",
      ],
      loadTorque: ["N·m", "Positive counterclockwise load torque"],
      effortTorque: ["N·m", "Negative clockwise effort torque"],
      loadTravel: ["m", "Load's upward vertical travel from horizontal"],
      effortTravel: [
        "m",
        "Effort end's downward vertical travel from horizontal",
      ],
      inputWork: ["J", "Ideal effort work during this lift"],
      outputWork: ["J", "Load's gained gravitational potential energy"],
    }).map(([key, [unit, description]]) => [key, { unit, description }]),
  ),
  actions: {
    LEVER_SET_PIVOT: setter(
      num(5, 95, "%"),
      "Set pivot position as a percentage of total bar length from the load end. Preserve load and length; pivot at either end is unsupported.",
    ),
    LEVER_SET_LENGTH: setter(
      num(0.4, 4, "m"),
      "Set total bar length in metres, retaining pivot percentage. To retain a physical load arm when changing length, also set pivotPercent=100*loadArm/newLength.",
    ),
    LEVER_SET_LOAD_FORCE: setter(
      num(1, 1000, "N"),
      "Set downward load force in newtons, preserving geometry.",
    ),
    LEVER_LIFT: {
      arguments: object({}),
      description:
        "Lift slightly or lower back: toggle horizontal and ideal quasi-static 5° poses",
      timing: "live",
      target: "instance",
    },
  },
  dependencies: {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: ["AssemblyScene"],
    controls: [],
    prefabs: [],
    compositions: [],
  },
  initialize: leverState,
  configuration: (s) => ({
    length: s.length,
    pivotPercent: s.pivotPercent,
    loadForce: s.loadForce,
    lifted: s.lifted,
  }),
  apply: (s, command, value) => {
    const action = leverModel.actions[command];
    if (!action) throw new Error("Unsupported lever action");
    validateValue(action.arguments, value === undefined ? {} : { value });
    if (command === "LEVER_LIFT")
      return leverState({ ...s, lifted: !s.lifted });
    const fields: Record<string, string> = {
      LEVER_SET_PIVOT: "pivotPercent",
      LEVER_SET_LENGTH: "length",
      LEVER_SET_LOAD_FORCE: "loadForce",
    };
    return leverState({ ...s, [fields[command]]: value });
  },
  measure: (s) => leverMeasure(s as LeverState),
};
export const physics: DomainContribution = {
  namespace: "physics",
  version: 1,
  models: [leverModel, ...mechanicsModels],
};
