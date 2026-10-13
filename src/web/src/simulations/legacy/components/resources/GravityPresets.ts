export const GRAVITIES: Record<string, number> = Object.freeze({
  Moon: 1.62,
  Earth: 9.81,
  Mars: 3.71,
  Jupiter: 24.79,
});

export const GravityPresets = Object.freeze(
  Object.entries(GRAVITIES).map(([label, value]) =>
    Object.freeze({ id: label.toLowerCase(), label, value, units: "m/s²" }),
  ),
);
