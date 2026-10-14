import type { Member as MemberData } from "../traits/MemberEndpoints";
export function Member(
  id: string,
  a: string,
  b: string,
  kind: MemberData["kind"],
): MemberData {
  if (a === b) throw new Error(`${id}: endpoints must differ`);
  return { id, a, b, kind, present: true };
}
