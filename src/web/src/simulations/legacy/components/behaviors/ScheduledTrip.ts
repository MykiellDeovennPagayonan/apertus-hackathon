import { num, object } from "../../../registry/contracts/parameterSchema";
import { optionalText, position, string } from "../../../registry/contracts/objects/objectFields";
/** Authored departures share a contract; execution belongs to ScheduledTripSystem. */
export const scheduledTripFields = {
  id: string,
  at: num(0, 23.99),
  target: optionalText,
  x: position,
  z: position,
};
export const scheduledTripSchema = object(scheduledTripFields);
export const ScheduledTrip = {
  id: "ScheduledTrip",
  timing: "departure",
  repeat: "daily",
  interruptsPrevious: true,
} as const;
