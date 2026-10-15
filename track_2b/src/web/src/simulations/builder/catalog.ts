import type { TemplateId } from "./descriptors";

/** Author-facing objects describe the exact unit added, independently of example names. */
export const canvasCatalog: Record<
  TemplateId,
  {
    title: string;
    description: string;
    object: string;
    contents: string;
  }
> = {
  gas: {
    title: "2D physical canvas",
    description: "Explore a physical model and its measurements.",
    object: "Canvases and gas containers",
    contents:
      "Independent gas containers, each with one sample. Connect controls and pressure measurements separately.",
  },
  fractions: {
    title: "2D diagram",
    description: "Compare quantities using an interactive diagram.",
    object: "Canvases and fraction bars",
    contents:
      "Independent fraction bars. Connect action buttons, readouts, and pair comparisons separately.",
  },
  line: {
    title: "Cartesian plane",
    description:
      "Add empty planes, then connect independent lines and squares.",
    object: "Planes, lines and squares",
    contents:
      "Independent lines and squares with editable geometry, styles, controls, and measurements.",
  },
  town: {
    title: "3D spatial scene",
    description:
      "Build a scene from ground, buildings, roads, and scheduled people.",
    object: "Scenes, ground, houses, people and trips",
    contents:
      "Independent ground, buildings, roads, and people with spawn settings and departure schedules.",
  },
};
