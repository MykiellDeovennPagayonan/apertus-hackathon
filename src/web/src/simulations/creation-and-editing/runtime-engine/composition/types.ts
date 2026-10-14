import type {
  SceneObject,
  ScheduleStep,
} from "../../../legacy/components/traits/SceneObjects";
export type SceneControl = {
  id: string;
  target: string;
  property: string;
  label: string;
  widget: "slider" | "number" | "toggle" | "button";
  binding?: "property" | "action";
  fixed?: { factor?: number };
  unit?: string;
  min: number;
  max: number;
  step: number;
  slot: "primary" | "details";
};
export type Measurement = {
  id: string;
  target: string;
  other: string;
  output: string;
  unit?: string;
  label: string;
  precision: number;
  slot: "primary" | "details";
};
export interface CompositionScene {
  version: 1 | 2;
  workspace?: SceneWorkspace;
  kind: "cartesian" | "town" | "physical" | "diagram";
  canvas: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    grid: boolean;
    snap: number;
    /** Presentation chrome is opt-in so a canvas begins as content, not a card. */
    backgroundColor?: string;
    borderColor?: string;
    showNavigation?: boolean;
    showAbout?: boolean;
  };
  clock?: {
    start: number;
    speed: number;
    playing: boolean;
    secondsPerHour: number;
  };
  objects: SceneObject[];
  controls: SceneControl[];
  measurements: Measurement[];
}

export type CanvasComponent = {
  id: string;
  label: string;
  kind: CompositionScene["kind"];
  settings: CompositionScene["canvas"];
  clock?: CompositionScene["clock"];
};
export type TripComponent = ScheduleStep & {
  label: string;
  person: string;
};
export type SceneWorkspace = {
  version: 1 | 2;
  canvases: CanvasComponent[];
  placements: Record<string, string>;
  trips: TripComponent[];
  arrangement: "side-by-side" | "stacked";
};
