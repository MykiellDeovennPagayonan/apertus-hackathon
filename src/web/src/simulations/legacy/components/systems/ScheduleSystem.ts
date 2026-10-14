/** Pick the latest eligible departure without changing the authored schedule. */
export function latestDeparture<T extends { at: number }>(
  steps: readonly T[],
  time: number,
): T | undefined {
  return [...steps].reverse().find((step) => step.at <= time);
}
/** Premade routines use ordered predicates; authored trips use explicit departures. */
export function firstScheduleRule<T extends { observation: string }>(
  rules: readonly T[],
  observations: Record<string, boolean>,
): T | undefined {
  return rules.find((rule) => observations[rule.observation]);
}
export function dayHour(time: number) {
  return ((time % 24) + 24) % 24;
}
