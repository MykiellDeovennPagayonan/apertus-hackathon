/** Reaction amounts use the domain's carrier units. Weights count elemental atoms. */
export interface Reaction {
  process: string;
  amount: number;
  from: Record<string, number>;
  to: Record<string, number>;
}
export interface Flux extends Reaction {
  amount: number;
}
export interface Budget {
  stores: Record<string, number>;
  weights: Record<string, number>;
  initialTotal: number;
  inputs: number;
  exports: number;
}
export const total = (
  stores: Record<string, number>,
  weights: Record<string, number>,
) => Object.entries(stores).reduce((n, [k, v]) => n + v * weights[k], 0);
export function audit(b: Budget) {
  for (const [key, value] of Object.entries(b.stores))
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      !Number.isFinite(b.weights[key]) ||
      b.weights[key] <= 0
    )
      throw new Error(`Invalid elemental store: ${key}`);
  const expected = b.initialTotal + b.inputs - b.exports;
  if (
    Math.abs(total(b.stores, b.weights) - expected) >
    1e-9 * Math.max(1, expected)
  )
    throw new Error("Elemental budget does not balance");
}
/** Simultaneous withdrawals: donor competition scales whole reaction extents, not products. */
export function transfer(
  stores: Record<string, number>,
  weights: Record<string, number>,
  reactions: Reaction[],
) {
  const demand: Record<string, number> = {};
  for (const r of reactions) {
    if (!Number.isFinite(r.amount) || r.amount < 0)
      throw new Error("Invalid reaction extent");
    for (const side of [r.from, r.to])
      for (const [key, coefficient] of Object.entries(side))
        if (
          !(key in stores) ||
          !Number.isFinite(coefficient) ||
          coefficient <= 0
        )
          throw new Error("Invalid reaction carrier");
    if (Math.abs(total(r.from, weights) - total(r.to, weights)) > 1e-10)
      throw new Error("Reaction must conserve the element");
    for (const [key, coefficient] of Object.entries(r.from))
      demand[key] = (demand[key] ?? 0) + r.amount * coefficient;
  }
  const next = { ...stores };
  const fluxes = reactions.map((r) => {
    const scale = Math.min(
      1,
      ...Object.keys(r.from).map((k) =>
        demand[k] ? stores[k] / demand[k] : 1,
      ),
    );
    const amount = r.amount * scale;
    for (const [key, coefficient] of Object.entries(r.from))
      next[key] -= coefficient * amount;
    for (const [key, coefficient] of Object.entries(r.to))
      next[key] += coefficient * amount;
    return { ...r, amount };
  });
  for (const key of Object.keys(next)) {
    if (next[key] < -1e-9) throw new Error("Transfer overdraw");
    if (next[key] < 0) next[key] = 0; // floating point roundoff only
  }
  return { stores: next, fluxes: fluxes.filter((f) => f.amount > 1e-12) };
}
export const move = (
  process: string,
  from: string,
  to: string,
  amount: number,
): Reaction => ({ process, from: { [from]: 1 }, to: { [to]: 1 }, amount });
