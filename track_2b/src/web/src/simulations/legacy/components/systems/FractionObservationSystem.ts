import type {
  ObservationContext,
  ObservationValue,
} from "../../../registry/contracts/objects/Observation";
import type { FractionObject } from "../traits/SceneObjects";
import { fractionValue } from "./ComposedFractionSystem";
import { compare } from "./fractionMath";
export function observeFraction(
  o: FractionObject,
  output: string,
  context: ObservationContext,
): ObservationValue {
  const value = fractionValue(o);
  if (output === "fraction") return `${value.n}/${value.d}`;
  if (output === "decimal") return value.n / value.d;
  const other = context.objects.find((v) => v.id === context.other);
  return other?.kind === "fraction-bar"
    ? {
        kind: "fraction-comparison",
        left: value,
        right: fractionValue(other),
        relation: compare(value, fractionValue(other)),
      }
    : "Choose another bar";
}
