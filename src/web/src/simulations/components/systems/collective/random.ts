/** Stable keyed random draws: inspection, rendering and unrelated branches consume none. */
export function random(
  seed: number,
  step: number,
  id: number,
  event = 0,
): number {
  let x =
    (seed ^
      Math.imul(step + 1, 374761393) ^
      Math.imul(id + 1, 668265263) ^
      Math.imul(event + 1, 1274126177)) >>>
    0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export function sample<T>(
  items: readonly T[],
  count: number,
  seed: number,
  step: number,
  event: number,
): T[] {
  return items
    .map((value, id) => ({ value, rank: random(seed, step, id, event), id }))
    .sort((a, b) => a.rank - b.rank || a.id - b.id)
    .slice(0, count)
    .map((x) => x.value);
}
