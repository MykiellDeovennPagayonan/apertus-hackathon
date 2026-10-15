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
  const internalName = member.id.split("/").at(-1) ?? member.id;
  const name = internalName
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
  return (
    <div className="bridge-demo__inspector">
      <b>{name}</b>
      <span>Type: {member.kind}</span>
      <span>State: {response.classification}</span>
      <span>Relative load: {responseLevel(response.score)}</span>
      <span className="bridge-demo__disclaimer">
        Conceptual — not engineering analysis.
      </span>
    </div>
  );
}
