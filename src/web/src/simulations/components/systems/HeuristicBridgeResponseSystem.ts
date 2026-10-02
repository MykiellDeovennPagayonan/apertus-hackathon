import type { Joint, Member } from "../traits/MemberEndpoints";

// Heuristic stress 0..1: proximity of member midpoint to load, scaled by tons.
export function memberStress(
  m: Member,
  joints: Joint[],
  loadPos: number,
  loadTons: number,
  damaged = false,
  dense = false,
  spanScale = 1,
) {
  const ja = joints.find((j) => j.id === m.a);
  const jb = joints.find((j) => j.id === m.b);
  if (!ja || !jb) throw new Error("Truss member references a missing joint");
  const mid = (ja.x + jb.x) / 2;
  const prox = Math.exp(-(((mid - loadPos) / 0.22) ** 2));
  const base = m.kind === "deck" || m.kind === "top" ? 0.25 : 0.12;
  return Math.min(
    1,
    (base + prox * (loadTons / 12)) *
      (damaged ? 1.45 : 1) *
      (dense ? 0.72 : 1) *
      Math.sqrt(spanScale),
  );
}

export function memberForceType(m: Member, joints: Joint[], loadPos: number) {
  const ja = joints.find((j) => j.id === m.a);
  const jb = joints.find((j) => j.id === m.b);
  if (!ja || !jb) throw new Error("Truss member references a missing joint");
  const mid = (ja.x + jb.x) / 2;
  if (m.kind === "top") return "compression";
  if (m.kind === "deck") return "tension";
  return mid < loadPos ? "compression" : "tension";
}

export function HeuristicBridgeResponseSystem(
  truss: import("../prefabs/TrussAssembly").Truss,
  loadPos: number,
  loadTons: number,
  removed: string | null,
  dense: boolean,
  spanScale: number,
) {
  const members = truss.members.filter((m) => m.present && m.id !== removed);
  const responses: Record<
    string,
    import("../traits/MemberResponse").MemberResponse
  > = {};
  for (const m of members)
    responses[m.id] = {
      score: memberStress(
        m,
        truss.joints,
        loadPos,
        loadTons,
        !!removed,
        dense,
        spanScale,
      ),
      classification: memberForceType(m, truss.joints, loadPos),
      model: "heuristic-bridge-v1",
    };
  return {
    members,
    responses,
    supportShares: [loadTons * (1 - loadPos), loadTons * loadPos],
  };
}
