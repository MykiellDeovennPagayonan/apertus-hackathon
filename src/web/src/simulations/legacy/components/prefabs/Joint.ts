import type { Joint as JointData } from "../traits/MemberEndpoints";
export function Joint(id: string, x: number, y: number): JointData {
  return { id, x, y };
}
