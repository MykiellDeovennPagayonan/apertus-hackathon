import { random } from "./random";
export interface Voter {
  id: number;
  ranking: number[];
  approvals: number[];
}
export interface VotingConfig {
  groups: number[];
  candidateCount: number;
  ballots: { ranking: number[]; approvals: number[] }[];
  rule: number;
  seed: number;
}
export interface VotingRound {
  number: number;
  totals: number[];
  allocations: number[];
  eliminated: number;
  exhausted: number;
  winner: number;
  transfers: number[];
}
export interface VotingState extends VotingConfig {
  voters: Voter[];
  tieOrder: number[];
  rounds: VotingRound[];
  done: boolean;
}
export const votingDefaults: VotingConfig = {
  groups: [40, 35, 25],
  candidateCount: 3,
  ballots: [],
  rule: 0,
  seed: 17,
};
export function initializeVoting(c: VotingConfig): VotingState {
  const rankings = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 1, 0],
    ],
    approvals = [
      [0, 1],
      [1, 2],
      [2, 1],
    ];
  const voters: Voter[] = [];
  c.groups.forEach((n, g) => {
    for (let i = 0; i < n; i++)
      voters.push({
        id: voters.length,
        ranking: [...rankings[g], 3, 4].filter((v) => v < c.candidateCount),
        approvals: approvals[g].filter((v) => v < c.candidateCount),
      });
  });
  if (c.ballots.length) {
    voters.length = 0;
    c.ballots.forEach((v, id) => {
      if (
        [v.ranking, v.approvals].some(
          (b) =>
            new Set(b).size !== b.length ||
            b.some(
              (candidate) => candidate >= c.candidateCount || candidate < 0,
            ),
        )
      )
        throw new Error("Invalid ballot: candidates must be valid and unique.");
      voters.push({ id, ranking: [...v.ranking], approvals: [...v.approvals] });
    });
  }
  return {
    ...c,
    voters,
    tieOrder: Array.from({ length: c.candidateCount }, (_, i) => i).sort(
      (a, b) => random(c.seed, 0, a) - random(c.seed, 0, b),
    ),
    rounds: [],
    done: false,
  };
}
export function countRound(
  voters: readonly Voter[],
  rule: number,
  previous: readonly VotingRound[],
  tieOrder: number[],
): VotingRound {
  for (const v of voters) {
    for (const ballot of [v.ranking, v.approvals])
      if (
        new Set(ballot).size !== ballot.length ||
        ballot.some((c) => !tieOrder.includes(c))
      )
        throw new Error("Invalid ballot: candidates must be valid and unique.");
  }
  const gone = previous
    .filter((r) => r.eliminated >= 0)
    .map((r) => r.eliminated);
  const continuing = tieOrder.filter((c) => !gone.includes(c));
  const totals = Array(tieOrder.length).fill(0) as number[];
  const allocations = voters.map((v) =>
    rule === 2
      ? -1
      : rule === 0
        ? (v.ranking[0] ?? -1)
        : (v.ranking.find((c) => continuing.includes(c)) ?? -1),
  );
  if (rule === 2)
    for (const v of voters) for (const c of v.approvals) totals[c]++;
  else for (const c of allocations) if (c >= 0) totals[c]++;
  const active =
    rule === 2
      ? voters.filter((v) => v.approvals.length).length
      : allocations.filter((c) => c >= 0).length;
  let winner = -1,
    eliminated = -1;
  if (active) {
    if (rule !== 1)
      winner = tieOrder.reduce(
        (best, c) => (totals[c] > totals[best] ? c : best),
        tieOrder[0],
      );
    else {
      winner = continuing.find((c) => totals[c] > active / 2) ?? -1;
      if (winner < 0 && continuing.length <= 1) winner = continuing[0] ?? -1;
      if (winner < 0)
        eliminated = continuing.reduce(
          (best, c) => (totals[c] < totals[best] ? c : best),
          continuing[0],
        );
    }
  }
  const before = previous.at(-1)?.allocations;
  return {
    number: previous.length + 1,
    totals,
    allocations,
    eliminated,
    exhausted: voters.length - active,
    winner,
    transfers: before
      ? allocations.flatMap((c, i) => (c !== before[i] ? [i] : []))
      : [],
  };
}
export function votingRound(s: VotingState): VotingState {
  if (s.done) return s;
  const round = countRound(s.voters, s.rule, s.rounds, s.tieOrder);
  return {
    ...s,
    rounds: [...s.rounds, round],
    done: round.winner >= 0 || round.eliminated < 0,
  };
}
export function votingCaption(s: VotingState): string {
  const r = s.rounds.at(-1);
  if (!r)
    return "Same people, same preferences. Change the rule and watch how their ballots are counted.";
  if (s.done && r.winner < 0)
    return "No active ballots remain, so there is no winner.";
  const names = ["A", "B", "C", "D", "E"];
  const tied =
    r.winner >= 0
      ? r.totals.filter((n) => n === r.totals[r.winner]).length > 1
      : r.eliminated >= 0 &&
        s.tieOrder.filter(
          (c) =>
            !s.rounds.slice(0, -1).some((round) => round.eliminated === c) &&
            r.totals[c] === r.totals[r.eliminated],
        ).length > 1;
  const tieNote = tied
    ? " A tie was resolved using the order drawn before counting."
    : "";
  if (s.done)
    return `${names[r.winner]} wins with ${r.totals[r.winner]} ${s.rule === 2 ? "approvals" : "votes"}.${r.transfers.length ? ` ${r.transfers.length} ballots moved to their next remaining choice.` : ""}${tieNote}`;
  return `${names[r.eliminated]} has the fewest votes and is eliminated. Next, those ballots move to their next remaining choice.${tieNote}`;
}
