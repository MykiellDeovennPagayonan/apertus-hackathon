import { responseLevel } from "../resources/BridgeStyles";
import type { Member } from "../traits/MemberEndpoints";
import type { MemberResponse } from "../traits/MemberResponse";
export function MemberInspector({
  member,
  response,
}: {
  member: Member;
  response: MemberResponse;
}) {
  return (
    <div className="bridge-demo__inspector">
      <b>Member {member.id}</b>
      <span>Type: {member.kind}</span>
      <span>State: {response.classification}</span>
      <span>Relative load: {responseLevel(response.score)}</span>
      <span className="bridge-demo__disclaimer">
        Conceptual — not engineering analysis.
      </span>
    </div>
  );
}
