export interface RatioState {
  numerator: number;
  denominator: number;
}
export interface RectangleDimensions {
  width: number;
  height: number;
}
export interface CoordinatePoint {
  id: string;
  x: number;
  y: number;
}
export interface RandomTrialState {
  preset: "coin" | "die";
  seed: number;
  trials: number;
}
