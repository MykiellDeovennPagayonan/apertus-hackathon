export interface WildfireState {
  coverage: number;
  wind: number;
  moisture: number;
  custom?: number;
  patches?: number[];
}
export const WILDFIRE_MAP = { rows: 10, columns: 16 } as const;
const ROWS = WILDFIRE_MAP.rows,
  COLS = WILDFIRE_MAP.columns;
/** Fixed fuel variation shared by both runs; no randomness or viewport dependence. */
const fuelAt = (row: number, col: number) =>
  0.8 + ((row * 7 + col * 11) % 9) / 20;
export function treatmentPatches(state: WildfireState): number[] {
  if (state.custom === 1) return [...(state.patches ?? [])];
  const width = Math.round((state.coverage / 100) * 6),
    start = 7 - Math.floor(width / 2);
  return Array.from({ length: ROWS * COLS }, (_, i) => i).filter((i) => {
    const col = i % COLS;
    return width > 0 && col >= start && col < start + width;
  });
}
function landscape(state: WildfireState, treated: boolean) {
  const width = treated ? Math.round((state.coverage / 100) * 6) : 0;
  const intensity = Array.from({ length: ROWS }, () =>
    Array<number>(COLS).fill(0),
  );
  const selected = new Set(treatmentPatches(state));
  const treatment = (row: number, col: number) =>
    treated && selected.has(row * COLS + col);
  const dryness = 1 - state.moisture / 125;
  const weather = 0.45 + state.wind / 100;
  intensity[5][0] = weather * dryness * fuelAt(5, 0);
  // Monotone downwind spread. Neighboring patches share heat; severe weather sustains ember crossing.
  for (let col = 1; col < COLS; col++)
    for (let row = 0; row < ROWS; row++) {
      const incoming = Math.max(
        ...[row - 1, row, row + 1]
          .filter((r) => r >= 0 && r < ROWS)
          .map((r) => intensity[r][col - 1]),
      );
      if (incoming < 0.25) continue;
      const retained = treatment(row, col) ? 0.15 + state.wind / 180 : 0.92;
      const local =
        weather *
        dryness *
        fuelAt(row, col) *
        (treatment(row, col) ? 0.18 : 0.28);
      const next = incoming * retained + local;
      intensity[row][col] = next >= 0.25 ? Math.min(1.8, next) : 0;
    }
  let burned = 0,
    peak = 0;
  const grid = intensity.map((values, row) =>
    values
      .map((n, col) => {
        if (n >= 0.25) burned++;
        peak = Math.max(peak, n);
        // Codes preserve treatment as well as fire severity; adapter patterns provide redundant meaning.
        return n < 0.25
          ? treatment(row, col)
            ? "t"
            : "u"
          : treatment(row, col)
            ? n >= 0.8
              ? "H"
              : "L"
            : n >= 0.8
              ? "h"
              : "l";
      })
      .join(""),
  );
  return {
    grid,
    area: Math.round((burned / (ROWS * COLS)) * 100),
    peak: Math.round(peak * 100),
    reached: intensity.some((row) => row[COLS - 1] >= 0.25),
    width,
  };
}
export function wildfireMeasure(state: WildfireState) {
  const selected = new Set(treatmentPatches(state));
  const untreated = landscape(state, false),
    treated = landscape(state, true);
  const reduction = untreated.area
    ? Math.round((1 - treated.area / untreated.area) * 100)
    : 0;
  return {
    scene: {
      untreated,
      treated,
      wind: state.wind,
      moisture: state.moisture,
      treatment: Array.from({ length: ROWS * COLS }, (_, patch) =>
        selected.has(patch) ? "1" : "0",
      ).join(""),
      custom: state.custom === 1,
    },
    untreatedArea: untreated.area,
    treatedArea: treated.area,
    reduction,
    untreatedPeak: untreated.peak,
    treatedPeak: treated.peak,
    community: `Community: untreated ${untreated.reached ? "reached" : "not reached"}; treated ${treated.reached ? "reached" : "not reached"}.`,
    conclusion: (
      state.custom === 1
        ? !state.patches?.length
        : state.coverage === 0
    )
      ? "No fuel treatment: the two maps match because ignition, vegetation, wind and moisture are identical. Treat connected patches to interrupt the fuel path."
      : treated.reached
        ? "Fire crosses the treated patches in this run. Wind carries heat through remaining fuel; treatment can reduce severity without guaranteeing containment."
        : "Less fuel weakens the fire across the treated patches. The treated community is not reached here; treatment reduces severity but cannot guarantee containment.",
  };
}
