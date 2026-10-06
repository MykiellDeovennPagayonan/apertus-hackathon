import type { DemoType } from "../../../simulations/runtime/types";

export const premadeExperiments: Record<
  Exclude<DemoType, "assembly">,
  {
    title: string;
    description: string;
    icon: string;
    parameters: Record<string, unknown>;
  }
> = {
  gas: {
    title: "Gas pressure",
    description: "Squeeze a gas and discover how volume changes pressure.",
    icon: "◌",
    parameters: {},
  },
  projectile: {
    title: "Projectile motion",
    description: "Compare two launch angles on the same flight diagram.",
    icon: "↗",
    parameters: { angles: [30, 60], speed: 20, gravityPreset: "Moon" },
  },
  bridge: {
    title: "Truss bridge",
    description: "Move a load and explore how a bridge responds.",
    icon: "△",
    parameters: { loadPos: 0.5, loadTons: 10 },
  },
  town: {
    title: "Living town",
    description: "Watch citizens follow their daily routines in 3D.",
    icon: "⌂",
    parameters: {},
  },
  counting: {
    title: "Counting circles",
    description: "Tap the circles and count them one by one.",
    icon: "●",
    parameters: { looping: false, task: { mode: "count", target: 5 } },
  },
  arithmetic: {
    title: "Addition & subtraction",
    description: "Explore sums and differences with circles.",
    icon: "+",
    parameters: {},
  },
  "equal-groups": {
    title: "Equal groups",
    description: "Share 14 objects across 3 groups and find the remainder.",
    icon: "×",
    parameters: {
      task: { mode: "share", total: 14, groups: 3, perGroup: 0 },
      looping: false,
    },
  },
  "fraction-builder": {
    title: "Fraction builder",
    description: "Build three quarters and compare parts of a whole.",
    icon: "½",
    parameters: {
      bars: [
        { n: 3, d: 4 },
        { n: 0, d: 4 },
      ],
    },
  },
  "fraction-number-line": {
    title: "Fraction number line",
    description: "Place, add, and subtract fractions on a number line.",
    icon: "↝",
    parameters: {},
  },
  ratio: {
    title: "Ratios & percentages",
    description: "See how parts of a whole become percentages.",
    icon: "%",
    parameters: {},
  },
  "area-perimeter": {
    title: "Area & perimeter",
    description: "Measure a 6 by 4 metre rectangle, then change its size.",
    icon: "▭",
    parameters: { width: 6, height: 4 },
  },
  coordinates: {
    title: "Coordinate plotting",
    description: "Drag a point and explore its position on a graph.",
    icon: "⌖",
    parameters: {},
  },
  probability: {
    title: "Probability trials",
    description: "Run coin and die trials and compare their frequencies.",
    icon: "⚄",
    parameters: {},
  },
};
