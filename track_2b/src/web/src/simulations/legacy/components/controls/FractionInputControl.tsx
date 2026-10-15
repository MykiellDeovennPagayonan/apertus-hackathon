import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import type { FractionValue } from "../traits/MathBoards";
import { IntegerStepper } from "../../../registry/controls/IntegerStepper";
import { OptionSelect } from "./OptionSelect";
export function FractionInputControl({
  label,
  value,
  onChange,
  proper = false,
}: {
  label: string;
  value: FractionValue;
  onChange: (fraction: FractionValue) => ActionResult;
  proper?: boolean;
}) {
  return (
    <fieldset className="math-fraction-input">
      <legend>{label}</legend>
      <IntegerStepper
        label={`${label} numerator`}
        min={0}
        max={proper ? value.d : 3 * value.d}
        value={value.n}
        onChange={(n) => onChange({ ...value, n })}
      />
      <OptionSelect
        label={`${label} denominator`}
        value={String(value.d)}
        options={(proper
          ? Array.from({ length: 12 }, (_, i) => i + 1)
          : [1, 2, 3, 4, 6, 12]
        ).map((d) => ({ id: String(d), label: String(d) }))}
        onChange={(v) =>
          onChange({
            n: proper ? 0 : Math.min(value.n, Number(v) * 3),
            d: Number(v),
          })
        }
      />
    </fieldset>
  );
}
