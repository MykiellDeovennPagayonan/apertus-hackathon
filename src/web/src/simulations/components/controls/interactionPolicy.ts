/** Safe, absolute exploration setters. Additive/rebuilding actions stay explicit. */
export const liveExplorationCommands = new Set([
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
