import { dispatchCommand } from "../../runtime/session";
export function selectMember(id: string) {
  return dispatchCommand("bridge", { type: "SELECT_MEMBER", value: id });
}
export const SelectionControl = selectMember;
