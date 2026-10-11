import { random, sample } from "./random";
export const ROOM_WIDTH = 30,
  ROOM_HEIGHT = 20;
export interface Pedestrian {
  id: number;
  x: number;
  y: number;
  heading: number;
  wait: number;
  delay: number;
}
export interface CrowdConfig {
  count: number;
  seed: number;
  placement: number;
  friction: number;
  radius: number;
}
export interface CrowdLane {
  people: Pedestrian[];
  exited: number;
  ticks: number;
  finished: number;
  conflicts: number;
  blocked: number;
  field: number[];
  moves: number[][][];
}
export interface CrowdState extends CrowdConfig {
  lanes: CrowdLane[];
  playing: boolean;
  elapsed: number;
}
export const crowdDefaults: CrowdConfig = {
  count: 100,
  seed: 17,
  placement: 0,
  friction: 0.9,
  radius: 1.5,
};
export function obstacle(c: CrowdConfig): { x: number; y: number; r: number } {
  return {
    x: c.placement === 2 ? 17 : 15,
    y: c.placement === 1 ? 17 : 15,
    r: c.radius,
  };
}
export function blockedCell(
  x: number,
  y: number,
  c: CrowdConfig,
  withObstacle: boolean,
): boolean {
  if (x < 0 || x >= ROOM_WIDTH || y < 0 || y >= ROOM_HEIGHT) return true;
  const o = obstacle(c);
  return withObstacle && (x - o.x) ** 2 + (y - o.y) ** 2 <= o.r ** 2;
}
const directions = [
  [0, 1],
  [1, 0],
  [-1, 0],
  [0, -1],
];
export function floorField(c: CrowdConfig, withObstacle: boolean): number[] {
  const field = Array(ROOM_WIDTH * ROOM_HEIGHT).fill(-1) as number[];
  const queue: number[] = [];
  for (const x of [14, 15]) {
    const index = 19 * ROOM_WIDTH + x;
    if (!blockedCell(x, 19, c, withObstacle)) {
      field[index] = 0;
      queue.push(index);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const index = queue[i],
      x = index % ROOM_WIDTH,
      y = Math.floor(index / ROOM_WIDTH);
    for (const [dx, dy] of directions) {
      const nx = x + dx,
        ny = y + dy,
        j = ny * ROOM_WIDTH + nx;
      if (!blockedCell(nx, ny, c, withObstacle) && field[j] === -1) {
        field[j] = field[index] + 1;
        queue.push(j);
      }
    }
  }
  return field;
}
export function initializeCrowd(c: CrowdConfig): CrowdState {
  const cells = Array.from({ length: ROOM_WIDTH * 12 }, (_, i) => i);
  const people = sample(cells, c.count, c.seed, 0, 0).map((cell, id) => ({
    id,
    x: cell % ROOM_WIDTH,
    y: Math.floor(cell / ROOM_WIDTH),
    heading: 0,
    wait: 0,
    delay: 0,
  }));
  const lanes = [false, true].map((withObstacle) => ({
    people: structuredClone(people),
    exited: 0,
    ticks: 0,
    finished: 0,
    conflicts: 0,
    blocked: 0,
    field: floorField(c, withObstacle),
    moves: [],
  }));
  if (
    lanes.some((l) => l.people.some((p) => l.field[p.y * ROOM_WIDTH + p.x] < 0))
  )
    throw new Error(
      "The obstacle blocks a route to the exit. Choose a smaller radius.",
    );
  return { ...c, lanes, playing: false, elapsed: 0 };
}
export function crowdTick(
  l: CrowdLane,
  c: CrowdConfig,
  withObstacle: boolean,
): CrowdLane {
  if (!l.people.length || l.ticks >= 2000) return l;
  const tick = l.ticks + 1,
    occupied = new Set(l.people.map((p) => p.y * ROOM_WIDTH + p.x));
  const proposals = new Map<
    number,
    { person: Pedestrian; heading: number }[]
  >();
  const stays: Pedestrian[] = [];
  for (const p of l.people) {
    if (p.delay) {
      stays.push({ ...p, delay: p.delay - 1, wait: p.wait + 1 });
      continue;
    }
    // Boundary exit uses the same conflict rule as any other destination.
    const current = l.field[p.y * ROOM_WIDTH + p.x];
    if (current === 0) {
      const key = ROOM_WIDTH * ROOM_HEIGHT + p.x;
      const group = proposals.get(key) ?? [];
      group.push({ person: p, heading: 0 });
      proposals.set(key, group);
      continue;
    }
    const options = directions
      .flatMap(([dx, dy], heading) => {
        const x = p.x + dx,
          y = p.y + dy,
          key = y * ROOM_WIDTH + x;
        return !blockedCell(x, y, c, withObstacle) &&
          !occupied.has(key) &&
          l.field[key] >= 0 &&
          l.field[key] < current
          ? [
              {
                key,
                heading,
                score: l.field[key] + random(c.seed, tick, p.id, heading) * 0.2,
              },
            ]
          : [];
      })
      .sort((a, b) => a.score - b.score);
    if (!options.length) {
      stays.push({ ...p, wait: p.wait + 1 });
      continue;
    }
    const { key, heading } = options[0],
      group = proposals.get(key) ?? [];
    group.push({ person: p, heading });
    proposals.set(key, group);
  }
  let exited = l.exited,
    conflicts = l.conflicts,
    blocked = l.blocked;
  const people = [...stays],
    moves: number[][] = [];
  for (const [key, group] of proposals) {
    const k = group.length;
    if (k > 1) conflicts++;
    const jam =
      k > 1 && random(c.seed, tick, key, 10) < 1 - (1 - c.friction) ** (k - 1);
    const winner = jam ? -1 : Math.floor(random(c.seed, tick, key, 11) * k);
    group.forEach(({ person: p, heading }, i) => {
      if (i !== winner) {
        people.push({ ...p, wait: p.wait + 1 });
        blocked++;
        return;
      }
      if (key >= ROOM_WIDTH * ROOM_HEIGHT) {
        exited++;
        moves.push([p.id, -1, -1]);
        return;
      }
      const x = key % ROOM_WIDTH,
        y = Math.floor(key / ROOM_WIDTH);
      people.push({
        ...p,
        x,
        y,
        heading,
        wait: 0,
        delay: heading !== p.heading ? 1 : 0,
      });
      moves.push([p.id, x, y]);
    });
  }
  return {
    ...l,
    people: people.sort((a, b) => a.id - b.id),
    exited,
    ticks: tick,
    finished: people.length ? 0 : tick,
    conflicts,
    blocked,
    moves: [...l.moves, moves],
  };
}
export function advanceCrowd(s: CrowdState): CrowdState {
  const lanes = s.lanes.map((l, i) => crowdTick(l, s, i === 1));
  return {
    ...s,
    lanes,
    playing: s.playing && lanes.some((l) => l.people.length && l.ticks < 2000),
  };
}
export function crowdCaption(s: CrowdState): string {
  const [a, b] = s.lanes;
  if (!a.ticks)
    return "Same crowd, same doorway. The pillar changes how people approach and merge.";
  if (s.playing)
    return "Watch where people wait. The obstacle can ease a merge or create another bottleneck.";
  if (a.finished && b.finished)
    return b.finished < a.finished
      ? `With this placement, the obstacle finished ${a.finished - b.finished} model steps sooner. The effect depends on the crowd and layout.`
      : b.finished > a.finished
        ? `With this placement, the obstacle took ${b.finished - a.finished} extra model steps. Obstacles do not always help.`
        : "Both rooms finished at the same time in this run.";
  return a.ticks >= 2000 || b.ticks >= 2000
    ? "The time limit was reached with people still inside. This is an incomplete comparison."
    : "The comparison is paused. Resume to see both crowds reach the exit.";
}
