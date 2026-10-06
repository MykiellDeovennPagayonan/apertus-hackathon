import { FractionBar } from "../prefabs/MathBoards";
import type { FractionObject } from "../traits/SceneObjects";
import { updateFractionBar } from "./FractionBuilderSystem";
export function fractionValue(o: FractionObject) {
  return { n: o.shaded.filter(Boolean).length, d: o.shaded.length };
}
/** Delegate operations to the existing exact fraction system, staging before mutation. */
export function fractionAction(
  o: FractionObject,
  action: string,
  value: unknown,
) {
  const bar = FractionBar(o.id, fractionValue(o).n, o.shaded.length);
  bar.shaded = [...o.shaded];
  o.shaded = [...updateFractionBar(bar, { type: action, value }).shaded];
}
