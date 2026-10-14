import { matchesAny } from "../../simulations/legacy/components/controls/promptMatchers";
import type { DemoType } from "../../simulations/legacy/runtime/types";

export function resolveExperimentPrompt(prompt: string): DemoType | null {
  const p = prompt.toLowerCase();
  if (/fraction.*number.?line|number.?line.*fraction/.test(p))
    return "fraction-number-line";
  if (/fraction|equivalent.*parts/.test(p)) return "fraction-builder";
  if (/equal groups|baskets|multiplication|division|share.*equally/.test(p))
    return "equal-groups";
  if (/addition|subtraction|add.*circles|subtract.*circles/.test(p))
    return "arithmetic";
  if (/count.*circles|counting|count.*objects/.test(p)) return "counting";

  if (
    matchesAny(p, [
      "projectile",
      "launch angle",
      "throw a ball",
      "trajectory",
      "launch",
      "ball being launched",
      "how far a ball",
    ])
  ) {
    return "projectile";
  }

  if (
    matchesAny(p, [
      "bridge",
      "truss",
      "support weight",
      "supports weight",
      "triangles",
      "forces move",
      "carries weight",
    ])
  ) {
    return "bridge";
  }

  if (
    matchesAny(p, [
      "town",
      "citizens",
      "people move",
      "village",
      "small town",
      "market",
      "city",
    ])
  ) {
    return "town";
  }

  return null;
}
