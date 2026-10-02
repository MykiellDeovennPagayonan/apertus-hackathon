export const BridgeStyles = Object.freeze({
  medium: 0.4,
  high: 0.66,
  lowColor: "var(--text-dim)",
  mediumColor: "var(--warn)",
  highColor: "var(--danger)",
  selectedColor: "var(--accent)",
  tensionDash: "12 3",
  deckWidth: 8,
  memberWidth: 6,
  selectedWidth: 9,
  sagScale: 14,
});
export function responseLevel(score: number) {
  return score > BridgeStyles.high
    ? "high"
    : score > BridgeStyles.medium
      ? "medium"
      : "low";
}
