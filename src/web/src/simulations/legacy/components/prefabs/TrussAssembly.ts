import type { Joint, Member } from "../traits/MemberEndpoints";
import { BridgeLoad } from "./BridgeLoad";
import { Joint as createJoint } from "./Joint";
import { Member as createMember } from "./Member";

// Build truss geometry. Panels counted on the base span; spanScale stretches x.
export function buildTruss(
  spanScale: number,
  dense: boolean,
  namespace = "bridge",
  loadPos = 0.5,
  loadTons = 10,
) {
  const panels = dense ? 8 : 5;
  const joints: Joint[] = [];
  const members: Member[] = [];

  for (let i = 0; i <= panels; i++) {
    joints.push(createJoint(`b${i}`, i / panels, 0));
    if (i > 0 && i < panels) joints.push(createJoint(`t${i}`, i / panels, -1));
  }

  for (let i = 0; i < panels; i++) {
    members.push({
      present: true,
      id: `deck${i}`,
      a: `b${i}`,
      b: `b${i + 1}`,
      kind: "deck",
    });
  }
  for (let i = 1; i < panels - 1; i++) {
    members.push({
      present: true,
      id: `top${i}`,
      a: `t${i}`,
      b: `t${i + 1}`,
      kind: "top",
    });
  }
  for (let i = 1; i < panels; i++) {
    members.push({
      present: true,
      id: `vert${i}`,
      a: `b${i}`,
      b: `t${i}`,
      kind: "vertical",
    });
  }
  members.push({
    present: true,
    id: "endL",
    a: "b0",
    b: "t1",
    kind: "diagonal",
  });
  members.push({
    present: true,
    id: "endR",
    a: `b${panels}`,
    b: `t${panels - 1}`,
    kind: "diagonal",
  });
  for (let i = 1; i < panels - 1; i++) {
    // alternate diagonals
    const a = i % 2 === 1 ? `t${i}` : `b${i}`;
    const b = i % 2 === 1 ? `b${i + 1}` : `t${i + 1}`;
    members.push({ present: true, id: `diag${i}`, a, b, kind: "diagonal" });
  }

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    members[i] = createMember(m.id, m.a, m.b, m.kind);
  }
  for (const j of joints) j.id = `${namespace}/${j.id}`;
  for (const m of members) {
    m.id = `${namespace}/${m.id}`;
    m.a = `${namespace}/${m.a}`;
    m.b = `${namespace}/${m.b}`;
  }
  const span = 1.6 * spanScale;
  const h = 0.28;
  return {
    joints,
    members,
    panels,
    span,
    height: h,
    id: namespace,
    load: BridgeLoad(`${namespace}/load`, namespace, loadPos, loadTons),
  };
}

export const TrussAssembly = buildTruss;
export type Truss = ReturnType<typeof buildTruss>;
