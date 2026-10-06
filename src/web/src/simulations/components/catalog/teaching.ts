import type { PublicDefinition } from "../../runtime/authoring/types";
export const arithmeticTeaching: PublicDefinition["teaching"] = {
  concepts: ["addition", "subtraction", "arithmetic", "whole numbers"],
  keywords: ["add", "sum", "subtract", "take away", "circles", "calculation"],
  interactions: [
    "change the two numbers",
    "press Add circles",
    "press Take away circles",
    "reset",
  ],
  observations: ["circles moving together or away", "calculation result"],
  limitations: [
    "Whole numbers and results from 0 to 20; subtraction cannot be negative.",
  ],
};
export const rectangleTeaching: PublicDefinition["teaching"] = {
  concepts: ["area", "perimeter", "rectangle", "dimensions"],
  keywords: [
    "rectangles",
    "width",
    "height",
    "side lengths",
    "metres",
    "square metres",
  ],
  interactions: [
    "change width",
    "change height",
    "compare independent rectangles",
    "reset",
  ],
  observations: [
    "area in m²",
    "perimeter in m",
    "proportional rectangle scene",
  ],
  limitations: [
    "Rectangles only. Equal perimeter at the start does not lock later exploration.",
  ],
};
export const bridgeTeaching: PublicDefinition["teaching"] = {
  concepts: ["truss bridge", "bridge load", "beam response", "support shares"],
  keywords: ["bridge", "truss", "beam", "member", "load", "supports", "tonne"],
  interactions: [
    "move the bridge load",
    "change load mass",
    "select a beam",
    "inspect beam response",
    "reset",
  ],
  observations: [
    "conceptual beam classification",
    "heuristic relative load score",
    "support load shares in tonnes",
  ],
  limitations: [
    "Exact engineering deflection in millimetres is unavailable. Response and illustrated sag are conceptual/heuristic, not engineering analysis.",
    "Friction and momentum are not simulated.",
  ],
};
