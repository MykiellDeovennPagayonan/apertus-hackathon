import type { ActionResult } from "../../runtime/commands";
import { ActionButton } from "./ActionButton";
export function ToggleControl({
  value,
  onLabel,
  offLabel,
  onChange,
}: {
  value: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (value: boolean) => ActionResult;
}) {
  return (
    <ActionButton onCommand={() => onChange(!value)}>
      {value ? onLabel : offLabel}
    </ActionButton>
  );
}
