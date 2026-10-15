import type { ActionResult } from "../../creation-and-editing/runtime-engine/commands";
import { ActionButton } from "./ActionButton";
import { NumberField } from "./NumberField";
export function IntegerStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => ActionResult;
}) {
  return (
    <fieldset className="math-input math-stepper" aria-label={label}>
      <ActionButton
        disabled={value <= min}
        onCommand={() => onChange(value - 1)}
      >
        Decrease {label.toLowerCase()}
      </ActionButton>
      <NumberField
        label={label}
        value={value}
        min={min}
        max={max}
        step={1}
        integer
        onChange={onChange}
      />
      <ActionButton
        disabled={value >= max}
        onCommand={() => onChange(value + 1)}
      >
        Increase {label.toLowerCase()}
      </ActionButton>
    </fieldset>
  );
}
