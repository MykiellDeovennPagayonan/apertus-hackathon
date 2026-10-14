import type { MathDemo } from "../components/traits/MathBoards";
export type DemoType =
  | "assembly"
  | "gas"
  | "projectile"
  | "bridge"
  | "town"
  | MathDemo
  | "ratio"
  | "area-perimeter"
  | "coordinates"
  | "probability";

export interface UIAction {
  type: string;
  value?: unknown;
  target?: string;
}

export interface CommandResult {
  handled: boolean;
  action?: UIAction;
  confirmation?: string;
}

export interface CommandRule {
  pattern: RegExp;
  action: UIAction;
  confirmation?: string;
}
