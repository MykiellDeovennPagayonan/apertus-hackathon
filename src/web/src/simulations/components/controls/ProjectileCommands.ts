import type { CommandRule } from "../../runtime/types";

export const projectileCommands: CommandRule[] = [
  {
    pattern: /moon|lunar/i,
    action: { type: "SET_GRAVITY", value: "Moon" },
    confirmation: "Gravity changed to Moon gravity (1.62 m/s²).",
  },
  {
    pattern: /mars/i,
    action: { type: "SET_GRAVITY", value: "Mars" },
    confirmation: "Gravity changed to Mars gravity (3.71 m/s²).",
  },
  {
    pattern: /jupiter/i,
    action: { type: "SET_GRAVITY", value: "Jupiter" },
    confirmation: "Gravity changed to Jupiter gravity (24.79 m/s²).",
  },
  {
    pattern: /earth|reset.*gravity|normal gravity/i,
    action: { type: "SET_GRAVITY", value: "Earth" },
    confirmation: "Gravity reset to Earth (9.81 m/s²).",
  },
  {
    pattern: /compare.*(\d{1,2})/i,
    action: { type: "COMPARE_ANGLE" },
    confirmation: "Compare mode enabled.",
  },
  {
    pattern: /clear compare|stop compar|single/i,
    action: { type: "CLEAR_COMPARE" },
    confirmation: "Compare mode cleared.",
  },
  {
    pattern: /velocity vector|show.*vector/i,
    action: { type: "SHOW_VECTORS" },
    confirmation: "Velocity vectors shown.",
  },
  {
    pattern: /hide.*vector|remove.*vector/i,
    action: { type: "HIDE_VECTORS" },
    confirmation: "Velocity vectors hidden.",
  },
  {
    pattern: /(\d{1,2})\s*(degree|deg|°)/i,
    action: { type: "SET_ANGLE" },
    confirmation: "Launch angle updated.",
  },
  {
    pattern: /launch|fire|replay|shoot/i,
    action: { type: "LAUNCH" },
    confirmation: "Relaunched.",
  },
];
