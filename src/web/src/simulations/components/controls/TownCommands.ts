import type { CommandRule } from "../../runtime/types";

export const townCommands: CommandRule[] = [
  {
    pattern: /night|dark|evening/i,
    action: { type: "SET_TIME", value: 20 },
    confirmation: "Time set to night — citizens head home.",
  },
  {
    pattern: /morning|sunrise/i,
    action: { type: "SET_TIME", value: 7 },
    confirmation: "Time set to morning.",
  },
  {
    pattern: /noon|midday|lunch/i,
    action: { type: "SET_TIME", value: 12 },
    confirmation: "Time set to midday.",
  },
  {
    pattern: /close.*road|block.*road|roadblock/i,
    action: { type: "CLOSE_ROAD" },
    confirmation: "Main road closed — routes recalculated.",
  },
  {
    pattern: /open.*road|reopen/i,
    action: { type: "OPEN_ROAD" },
    confirmation: "Main road reopened.",
  },
  {
    pattern: /market.*school|move.*market/i,
    action: { type: "MOVE_MARKET" },
    confirmation: "Market relocated near the school.",
  },
  {
    pattern: /market.*busy|busy.*market|more shoppers/i,
    action: { type: "MARKET_BUSY" },
    confirmation: "The market is now busy.",
  },
  {
    pattern: /speed up|faster|fast forward/i,
    action: { type: "SET_SPEED", value: 4 },
    confirmation: "Time sped up (4×).",
  },
  {
    pattern: /slow down|slower|normal speed/i,
    action: { type: "SET_SPEED", value: 1 },
    confirmation: "Time back to normal speed.",
  },
];
