import type { InputHTMLAttributes } from "react";
import type { ActionResult } from "../../creation-and-editing/runtime-engine/commands";

type RangeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: number;
  onChange: (value: number) => ActionResult;
  onResult?: (result: ActionResult) => void;
};

/** Controlled range input: acceptance and feedback belong to the command owner. */
export function RangeInput({ onChange, onResult, ...props }: RangeInputProps) {
  return (
    <input
      {...props}
      type="range"
      onChange={(event) => {
        const result = onChange(Number(event.target.value));
        onResult?.(result);
      }}
    />
  );
}
