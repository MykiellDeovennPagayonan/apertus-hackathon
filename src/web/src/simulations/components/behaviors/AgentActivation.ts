export type AgentActivation =
  | { kind: "request"; id: string }
  | { kind: "event"; id: string; eventType: string }
  | { kind: "interval"; id: string; time: number; interval: number }
  | { kind: "goal"; id: string; complete: boolean };

/** Declarative eligibility only. The scheduler owns reservations and deduplication. */
export function activationEligible(
  trigger: AgentActivation,
  lastTime = -Infinity,
) {
  switch (trigger.kind) {
    case "request":
      return true;
    case "event":
      return trigger.eventType.length > 0;
    case "interval":
      return (
        Number.isFinite(trigger.time) &&
        Number.isFinite(trigger.interval) &&
        trigger.interval > 0 &&
        trigger.time - lastTime >= trigger.interval
      );
    case "goal":
      return !trigger.complete;
  }
}
