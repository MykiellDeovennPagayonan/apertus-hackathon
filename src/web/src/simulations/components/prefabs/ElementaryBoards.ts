import type {
  RandomTrialState,
  RatioState,
  RectangleDimensions,
} from "../traits/ElementaryBoards";
export const RatioBoard = (id: string, parameters: RatioState) => ({
  id,
  ...parameters,
});
export const RectangleBoard = (
  id: string,
  parameters: RectangleDimensions,
) => ({ id, ...parameters });
export const CoordinatePoint = (
  id: string,
  parameters: { x: number; y: number },
) => ({ id, ...parameters });
export const RandomTrialBoard = (id: string, parameters: RandomTrialState) => ({
  id,
  ...parameters,
});
