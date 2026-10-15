/** Illustrative displacement in display units; never structural deflection. */
export function bridgeDrop(
  normalizedX: number,
  loadPosition: number,
  sag: number,
) {
  return (
    sag *
    Math.sin(Math.PI * normalizedX) *
    Math.exp(-(((normalizedX - loadPosition) / 0.45) ** 2))
  );
}
