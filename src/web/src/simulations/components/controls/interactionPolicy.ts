import { mathGeometryLiveCommands } from "../../domains/math-geometry";
import { thermalOpticsLiveCommands } from "../catalog/physicsThermalOptics";
import { physicsMechanicsLiveCommands } from "../catalog/physicsMechanics";
/** Safe, absolute exploration setters. Additive/rebuilding actions stay explicit. */
export const liveExplorationCommands = new Set([
  ...physicsMechanicsLiveCommands,
  ...thermalOpticsLiveCommands,
  ...mathGeometryLiveCommands,
  "LEVER_SET_PIVOT",
  "LEVER_SET_LENGTH",
  "LEVER_SET_LOAD_FORCE",
  "NUTRIENT_SET_NITROGEN",
  "NUTRIENT_SET_PHOSPHORUS",
  "NUTRIENT_SET_POTASSIUM",
  "FIRE_SET_COVERAGE",
  "FIRE_SET_WIND",
  "FIRE_SET_MOISTURE",
  "WEB_SET_PRESSURE",
  "PRODUCTION_SET_SPECIALIZATION",
  "PRODUCTION_SET_DELAY",
  "PRODUCTION_SET_DISRUPTION",
  "PEND_SET_LENGTH",
  "PEND_SET_GRAVITY",
  "PEND_SET_AMPLITUDE",
  "TRAFFIC_SET_HEADWAY",
  "CIRC_SET_BULBS",
  "CIRC_SET_TOPOLOGY",
  "CIRC_SET_VOLTAGE",
  "CIRC_SET_RESISTANCE",
]);

export function isPlaybackCommand(command: string) {
  return (
    /SET_(RATE_)?PLAYING$/.test(command) ||
    command === "set:playing" ||
    command === "PHYS_PLAY"
  );
}
