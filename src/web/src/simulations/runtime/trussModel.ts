import { buildTruss, type Truss } from "../components/prefabs/TrussAssembly";
import { HeuristicBridgeResponseSystem } from "../components/systems/HeuristicBridgeResponseSystem";
import type { Joint, Member } from "../components/traits/MemberEndpoints";
export function bridgeResponseFromParts(
  settings: { spanScale: number; dense: boolean },
  joints: Joint[],
  members: Member[],
  load: { id: string; position: number; magnitude: number },
  id: string,
  label: string,
) {
  const expected = buildTruss(settings.spanScale, settings.dense, id);
  // Match normalized generated topology by geometry, never by incidental serialized ID spelling.
  const jointMap = new Map<string, string>();
  if (
    joints.length !== expected.joints.length ||
    members.length !== expected.members.length
  )
    throw new Error(
      `${label}: unsupported topology; regenerate the truss instead of adding/removing joints or members`,
    );
  for (const j of expected.joints) {
    const matches = joints.filter((a) => a.x === j.x && a.y === j.y);
    if (matches.length !== 1)
      throw new Error(`${label}: unsupported joint geometry`);
    jointMap.set(j.id, matches[0].id);
  }
  const matched = new Set<string>();
  let removed: string | null = null;
  for (const e of expected.members) {
    const matches = members.filter(
      (m) =>
        m.a === jointMap.get(e.a) &&
        m.b === jointMap.get(e.b) &&
        m.kind === e.kind,
    );
    if (matches.length !== 1 || matched.has(matches[0].id))
      throw new Error(`${label}: unsupported member endpoints`);
    const m = matches[0];
    matched.add(m.id);
    if (!m.present) {
      if (removed || !e.id.endsWith(`/diag${Math.floor(expected.panels / 2)}`))
        throw new Error(`${label}: only the middle diagonal can be removed`);
      removed = m.id;
    }
  }
  const truss: Truss = {
    ...expected,
    joints,
    members,
    load: {
      ...expected.load,
      id: load.id,
      position: load.position,
      magnitude: load.magnitude,
    },
  };
  const response = HeuristicBridgeResponseSystem(
    truss,
    load.position,
    load.magnitude,
    removed,
    settings.dense,
    settings.spanScale,
  );

  return { truss, response, removed };
}
