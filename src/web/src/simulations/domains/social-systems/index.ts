import {
  type ProductionState,
  productionMeasure,
} from "../../components/systems/social-systems/production";
import type { DomainContribution } from "../../runtime/contribution";
import { comparisonModel } from "../comparisonModel";

const production = comparisonModel({
  namespace: "social-systems",
  name: "Production",
  title: "Craft or assembly line?",
  presentation: "social-production",
  description:
    "Compare eight independent craft workers with eight serial specialists over the same eight-hour shift.",
  assumptions: [
    "Same item, eight workers and eight-hour shift. Craft takes 80 minutes per item; specialization shortens assembly tasks from 10 to 4.55 minutes.",
    "Stage four alone receives the delay and the interruption. One craft worker has the same interruption; other craft workers keep working. Queues are unbounded and unfinished work remains at shift end.",
    "Idle time is the share of total worker time not spent processing. Illustrative defect rates describe a quality tradeoff, not an industrial forecast. No product variety, learning or fatigue dynamics.",
  ],
  fields: {
    specialization: {
      initial: 80,
      max: 100,
      action: "PRODUCTION_SET_SPECIALIZATION",
      label: "Division of work",
    },
    delay: {
      initial: 0,
      max: 100,
      action: "PRODUCTION_SET_DELAY",
      label: "Slowest-stage delay",
    },
    disruption: {
      initial: 0,
      max: 100,
      action: "PRODUCTION_SET_DISRUPTION",
      label: "Temporary disruption",
    },
  },
  outputs: {
    scene: { unit: "1", description: "Production lanes snapshot" },
    craftCompleted: { unit: "items", description: "Craft completed" },
    assemblyCompleted: { unit: "items", description: "Assembly completed" },
    unfinished: { unit: "1", description: "Unfinished · craft / line" },
    idle: { unit: "1", description: "Idle time · craft / line" },
    defects: { unit: "1", description: "Defect rate · craft / line" },
    conclusion: { unit: "1", description: "Why output changes" },
  },
  measure: (s) => productionMeasure(s as unknown as ProductionState),
});
export const socialSystems: DomainContribution = {
  namespace: "social-systems",
  version: 1,
  models: [production],
};
