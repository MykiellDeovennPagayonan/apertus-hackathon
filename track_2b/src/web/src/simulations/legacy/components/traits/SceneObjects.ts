export type Point = { x: number; y: number };
export type Base = { id: string; label: string; color: string };
export type LineObject = Base & {
  kind: "line";
  a: Point;
  b: Point;
  width: number;
  dashed: boolean;
  draggable: boolean;
};
export type SquareObject = Base & {
  kind: "square";
  center: Point;
  side: number;
  rotation: number;
  fill: boolean;
  opacity: number;
  width: number;
  draggable: boolean;
};
export type GroundObject = Base & {
  kind: "ground";
  width: number;
  depth: number;
};
export type BuildingObject = Base & {
  kind: "building";
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  entrance: "north" | "south" | "east" | "west";
  obstacle: boolean;
};
export type RoadObject = Base & {
  kind: "road";
  x: number;
  z: number;
  width: number;
  depth: number;
  closed: boolean;
};
export type Destination = { target: string; x: number; z: number };
export type ScheduleStep = Destination & { id: string; at: number };
export type PersonObject = Base & {
  kind: "person";
  x: number;
  z: number;
  spawnAt: number;
  speed: number;
  schedule: ScheduleStep[];
};
export type DisplayBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type GasObject = Base & {
  kind: "gas";
  display: DisplayBounds;
  inputs: import("./GasState").GasState;
  particles: boolean;
};
export type FractionObject = Base & {
  kind: "fraction-bar";
  display: DisplayBounds;
  shaded: boolean[];
  interactive: boolean;
};
export type SceneObject =
  | GasObject
  | FractionObject
  | LineObject
  | SquareObject
  | GroundObject
  | BuildingObject
  | RoadObject
  | PersonObject;
export type ObjectKind = SceneObject["kind"];
