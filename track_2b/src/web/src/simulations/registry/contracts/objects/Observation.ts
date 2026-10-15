import type { PersonSnapshot } from "../../../legacy/components/systems/ScheduledTripSystem";
import type { Point, SceneObject } from "../../../legacy/components/traits/SceneObjects";
export type ObservationValue =
  | string
  | number
  | Point
  | {
      kind: "line-equation";
      slope: number;
      intercept: number;
      vertical: boolean;
      x: number;
    }
  | {
      kind: "fraction-comparison";
      left: { n: number; d: number };
      right: { n: number; d: number };
      relation: string;
    };
export type ObservationContext = {
  objects: readonly SceneObject[];
  people: readonly PersonSnapshot[];
  time: number;
  other: string;
};
