import type { CommandRule } from "../../runtime/types";

export const bridgeCommands: CommandRule[] = [
  {
    pattern:
      /(?:move|put|shift).*(?:weight|load|truck).*left|(?:weight|load|truck).*left|move.*left/i,
    action: { type: "MOVE_LOAD", value: 0.2 },
    confirmation: "Load moved to the left side.",
  },
  {
    pattern: /move.*right|truck.*right/i,
    action: { type: "MOVE_LOAD", value: 0.8 },
    confirmation: "Load moved to the right side.",
  },
  {
    pattern: /move.*center|move.*middle.*(load|weight|truck)|center.*load/i,
    action: { type: "MOVE_LOAD", value: 0.5 },
    confirmation: "Load centered.",
  },
  {
    pattern: /twice as long|double|longer|extend/i,
    action: { type: "DOUBLE_LENGTH" },
    confirmation: "Bridge extended to twice the span.",
  },
  {
    pattern: /normal length|shorter|original length/i,
    action: { type: "NORMAL_LENGTH" },
    confirmation: "Bridge back to normal span.",
  },
  {
    pattern: /remove.*member|remove.*middle|delete/i,
    action: { type: "REMOVE_MIDDLE" },
    confirmation: "Middle member removed — watch the stress redistribute.",
  },
  {
    pattern: /more triangle|add.*triangle|denser|more truss/i,
    action: { type: "MORE_TRIANGLES" },
    confirmation: "Truss density increased.",
  },
  {
    pattern: /heavier|more weight|bigger truck/i,
    action: { type: "SET_LOAD", value: 22 },
    confirmation: "Heavier truck placed on the bridge.",
  },
  {
    pattern: /lighter/i,
    action: { type: "SET_LOAD", value: 6 },
    confirmation: "Lighter load applied.",
  },
  {
    pattern: /rebuild|reset|start over/i,
    action: { type: "REBUILD" },
    confirmation: "Bridge rebuilt.",
  },
];
