import type { CompositionScene } from "./types";
export function blankScene(kind: CompositionScene["kind"]): CompositionScene {
  return {
    version: 2,
    kind,
    canvas:
      kind === "physical" || kind === "diagram"
        ? { xMin: 0, xMax: 100, yMin: 0, yMax: 75, grid: false, snap: 1 }
        : { xMin: -10, xMax: 10, yMin: -10, yMax: 10, grid: true, snap: 0.5 },
    ...(kind === "town" || kind === "cartesian"
      ? { clock: { start: 0, speed: 1, playing: false, secondsPerHour: 5 } }
      : {}),
    objects: [],
    controls: [],
    measurements: [],
  };
}
