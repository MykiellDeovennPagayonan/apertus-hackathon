export interface FishingConfig {
  initialStock: number;
  arrangement: number;
  visibility: number;
  policy: number;
  quota: boolean;
}
export interface FishingDay {
  day: number;
  opening: number;
  births: number;
  requests: number[];
  catches: number[];
  closing: number;
}
export interface FishingState extends FishingConfig {
  day: number;
  stock: number;
  playing: boolean;
  remaining: number;
  elapsed: number;
  catches: number[];
  total: number[];
  history: FishingDay[];
}
export const fishingDefaults: FishingConfig = {
  initialStock: 2000,
  arrangement: 0,
  visibility: 1,
  policy: 0,
  quota: false,
};
export function initializeFishing(c: FishingConfig): FishingState {
  return {
    ...c,
    day: 0,
    stock: c.initialStock,
    playing: false,
    remaining: 0,
    elapsed: 0,
    catches: [0, 0, 0, 0, 0],
    total: [0, 0, 0, 0, 0],
    history: [],
  };
}
export function allocateFish(
  available: number,
  requests: number[],
  day: number,
): number[] {
  const sum = requests.reduce((a, b) => a + b, 0);
  if (sum <= available) return [...requests];
  const exact = requests.map((r) => (available * r) / sum),
    catches = exact.map(Math.floor);
  const order = exact
    .map((n, i) => ({
      i,
      remainder: n - catches[i],
      tie: (i - (day % 5) + 5) % 5,
    }))
    .sort((a, b) => b.remainder - a.remainder || a.tie - b.tie);
  const left = available - catches.reduce((a, b) => a + b, 0);
  for (const { i } of order.slice(0, left)) catches[i]++;
  return catches;
}
export function fishingDay(s: FishingState): FishingState {
  if (s.day >= 365 || s.stock === 0) return { ...s, playing: false };
  const births = Math.floor(s.stock / 100);
  let requests =
    s.arrangement === 0
      ? [4, 4, 4, 4, 4]
      : s.arrangement === 1
        ? [8, 4, 4, 4, 4]
        : [8, 8, 8, 8, 8];
  if (s.policy === 1 && s.day && s.visibility === 1)
    requests = requests.map((r, i) =>
      i === 0 ? r : Math.max(...s.history[s.history.length - 1].catches),
    );
  if (s.policy === 2)
    requests = Array.from(
      { length: 5 },
      (_, i) =>
        Math.floor(births / 5) +
        ((i - (s.day % 5) + 5) % 5 < births % 5 ? 1 : 0),
    );
  if (s.quota) requests = requests.map((r) => Math.min(r, 4));
  const catches = allocateFish(s.stock + births, requests, s.day),
    stock = s.stock + births - catches.reduce((a, b) => a + b, 0);
  const day = s.day + 1;
  return {
    ...s,
    day,
    stock,
    catches,
    total: s.total.map((n, i) => n + catches[i]),
    history: [
      ...s.history,
      { day, opening: s.stock, births, requests, catches, closing: stock },
    ],
    playing: s.playing && day < 365 && stock > 0,
  };
}
export function fishingCaption(s: FishingState): string {
  const last = s.history.at(-1);
  const policy = s.quota
    ? "An enforced cap allows at most four each. "
    : s.policy === 2
      ? "They voluntarily share today's renewal; negotiation is assumed. "
      : "";
  if (!last && policy)
    return (
      policy +
      `The lake currently replaces ${Math.floor(s.stock / 100)} fish a day.`
    );
  if (!last)
    return s.stock === 2000
      ? "At 2,000 fish, the lake replaces 20 a day. Four each keeps the starting population steady."
      : `At ${s.stock.toLocaleString()} fish, the lake replaces ${Math.floor(s.stock / 100)} a day. The five fishermen share that supply.`;
  if (!s.stock)
    return "The lake is empty. There are no fish left to reproduce.";
  const caught = last.catches.reduce((a, b) => a + b, 0);
  return (
    policy +
    (caught > last.births
      ? `They caught ${caught} fish; the lake replaced ${last.births}. Fewer fish means fewer births tomorrow.`
      : caught === last.births
        ? `The lake replaced the ${caught} fish they caught. The population stayed steady today.`
        : `They left more fish than they took. The population can recover under this rule.`)
  );
}
