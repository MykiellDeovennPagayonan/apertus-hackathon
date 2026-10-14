import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import type { SceneControl } from "../../../creation-and-editing/runtime-engine/composition/types";
import { formatDataNumber } from "../../../registry/contracts/dataPresentation";
import { ActionButton } from "../../../registry/controls/ActionButton";
import { NumberField } from "../../../registry/controls/NumberField";
import { ParameterSlider } from "./ParameterSlider";
import { ToggleControl } from "./ToggleControl";
export function BoundControl({
  control: c,
  value,
  onChange,
  onAction,
}: {
  control: SceneControl;
  value: number | boolean;
  onChange: (value: number | boolean) => ActionResult;
  onAction: () => ActionResult;
}) {
  if (c.widget === "button")
    return <ActionButton onCommand={onAction}>{c.label}</ActionButton>;
  if (c.widget === "toggle")
    return (
      <ToggleControl
        value={Boolean(value)}
        label={c.label}
        mode="checkbox"
        onLabel={c.label}
        offLabel={c.label}
        onChange={onChange}
      />
    );
  if (typeof value !== "number" || !Number.isFinite(value))
    return (
      <div className="recipe-disconnected">
        <strong>{c.label}</strong>
        <p>This value is unavailable.</p>
      </div>
    );
  const display = `${formatDataNumber(value, 3)}${c.unit ? ` ${c.unit}` : ""}`;
  return (
    <div className="composition-learner-control">
      {c.widget === "slider" ? (
        <ParameterSlider
          label={c.label}
          value={Number(value)}
          min={c.min}
          max={c.max}
          step={c.step}
          onChange={onChange}
        />
      ) : (
        <NumberField
          label={c.label}
          value={Number(value)}
          min={c.min}
          max={c.max}
          step={c.step}
          integer={false}
          onChange={onChange}
        />
      )}
      <output>{display}</output>
    </div>
  );
}
