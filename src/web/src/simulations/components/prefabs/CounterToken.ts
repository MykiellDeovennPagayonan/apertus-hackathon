import type { CountableToken } from "../traits/MathBoards";
export function CounterToken(
  id: string,
  order: number,
  zone = 0,
): CountableToken {
  return {
    id,
    order,
    zone,
    ordinal: null,
    visual: {
      visual: "CounterTokenVisual",
      target: "svg",
      resources: ["MathAppearance"],
    },
  };
}
