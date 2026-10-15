import {
  actions,
  isPairOutput,
  outputSpec,
  pairKind,
} from "../../registry/contracts/objects/composition";
import {
  type CompositionScene,
  type Measurement,
  outputs,
  properties,
  type SceneControl,
  validateScene,
} from "../../creation-and-editing/runtime-engine/composition/index";
import { templateForScene } from "../../creation-and-editing/runtime-engine/composition/runtimeState";
import { requireRecord } from "../document";
import { controlDefaults, targetChoices } from "../editor/workspaceCommands";

export function BindingSettings({
  binding,
  scene,
  changeScene,
  setSelected,
}: {
  binding: SceneControl | Measurement;
  scene: CompositionScene;
  changeScene: (
    change: (scene: CompositionScene) => void,
    group?: string,
  ) => void;
  setSelected: (id: string) => void;
}) {
  const control = "property" in binding;
  const button = control && binding.widget === "button";
  const pair = !control && isPairOutput(binding.output);
  const noun = !control && binding.output === "comparison" ? "bar" : "line";
  const update = (patch: object) =>
    changeScene((s) => {
      Object.assign(
        requireRecord(
          (control ? s.controls : s.measurements).find(
            (b) => b.id === binding.id,
          ),
        ),
        patch,
      );
      validateScene(s, templateForScene(s));
    });
  const choices = targetChoices(scene).filter((t) =>
    control
      ? button
        ? t.id.startsWith("canvas/") ||
          (!!t.object && Object.keys(actions(t.object)).length > 0)
        : !t.id.startsWith("canvas/") &&
          Object.values(properties(t.object)).some(
            (p) => !!p.toggle === (binding.widget === "toggle"),
          )
      : !t.id.startsWith("canvas/") &&
        (pair
          ? t.object?.kind === pairKind(binding.output)
          : Object.keys(outputs(t.object)).length > 0),
  );
  const target = choices.find((t) => t.id === binding.target);
  const caps = binding.target
    ? control
      ? button
        ? Object.entries(actions(target?.object)).map(([id, p]) => [
            id,
            p.label,
          ])
        : Object.entries(properties(target?.object))
            .filter(([, p]) => !!p.toggle === (binding.widget === "toggle"))
            .map(([id, p]) => [id, p.label])
      : Object.entries(outputs(target?.object)).filter(
          ([key]) => !isPairOutput(key),
        )
    : [];
  const choose = (id: string, key?: string) => {
    if (!id) {
      update({ target: "" });
      return;
    }
    const t = requireRecord(choices.find((v) => v.id === id));
    if (control)
      changeScene((s) => {
        const c = requireRecord(s.controls.find((v) => v.id === binding.id));
        const available = button
          ? actions(t.object)
          : Object.fromEntries(
              Object.entries(properties(t.object)).filter(
                ([, p]) => !!p.toggle === (c.widget === "toggle"),
              ),
            );
        controlDefaults(
          c,
          s,
          id,
          key ??
            (Object.hasOwn(available, c.property)
              ? c.property
              : Object.keys(available)[0]),
        );
        validateScene(s, templateForScene(s));
      });
    else {
      const output = pair
        ? binding.output
        : (key ??
          (Object.hasOwn(outputs(t.object), binding.output)
            ? binding.output
            : (Object.keys(outputs(t.object)).find((k) => !isPairOutput(k)) ??
              "")));
      update({
        target: id,
        output,
        other: pair ? binding.other : "",
        unit: outputSpec(t.object, output).unit,
      });
    }
  };
  return (
    <>
      <label>
        Label
        <input
          value={binding.label}
          maxLength={100}
          onChange={(e) => update({ label: e.target.value })}
        />
      </label>
      <p>Drag a wire in Connections, or choose the same connection here.</p>
      <label>
        {control
          ? button
            ? "Action target"
            : "Change component"
          : pair
            ? `First ${noun}`
            : "Observe component"}
        <select
          aria-label="Target object"
          value={binding.target}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Not connected</option>
          {choices.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {binding.target && !pair && (
        <label>
          {control
            ? button
              ? "Action"
              : "Editable property"
            : "Calculated output"}
          <select
            aria-label={
              control
                ? button
                  ? "Action"
                  : "Editable property"
                : "Calculated output"
            }
            value={control ? binding.property : binding.output}
            onChange={(e) => choose(binding.target, e.target.value)}
          >
            {caps.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {button && binding.property === "subdivide" && (
        <label>
          Subdivision factor
          <input
            aria-label="Subdivision factor"
            type="number"
            min={2}
            max={12}
            step={1}
            value={binding.fixed?.factor ?? 2}
            onChange={(e) =>
              update({ fixed: { factor: Number(e.target.value) } })
            }
          />
        </label>
      )}
      {pair && (
        <>
          <label>
            Second {noun}
            <select
              aria-label={noun === "line" ? "Other line" : "Other bar"}
              value={binding.other}
              onChange={(e) => update({ other: e.target.value })}
            >
              <option value="">Not connected</option>
              {scene.objects
                .filter(
                  (o) =>
                    o.kind === pairKind(binding.output) &&
                    o.id !== binding.target &&
                    (!scene.workspace?.placements[binding.target] ||
                      !scene.workspace?.placements[o.id] ||
                      scene.workspace.placements[o.id] ===
                        scene.workspace.placements[binding.target]),
                )
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          <p>
            {noun === "bar"
              ? "Compare exact fractions on one canvas. Each bar represents one equal whole; display size does not change its value."
              : "Two lines on one plane. Parallel lines have no intersection; coincident lines have infinitely many."}
          </p>
        </>
      )}
      <details>
        <summary>Appearance and learner placement</summary>
        {control && !button && binding.widget !== "toggle" && (
          <>
            <label>
              Widget
              <select
                aria-label="Widget"
                value={binding.widget}
                onChange={(e) => update({ widget: e.target.value })}
              >
                <option value="slider">Slider</option>
                <option value="number">Number input</option>
              </select>
            </label>
            {(["min", "max", "step"] as const).map((key) => (
              <label key={key}>
                {key === "min" ? "Minimum" : key === "max" ? "Maximum" : "Step"}
                <input
                  type="number"
                  step={0.01}
                  value={binding[key]}
                  onChange={(e) => update({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </>
        )}
        {!control && (
          <label>
            Decimal places
            <input
              type="number"
              min={0}
              max={6}
              step={1}
              value={binding.precision}
              onChange={(e) => update({ precision: Number(e.target.value) })}
            />
          </label>
        )}
        <label>
          Placement
          <select
            aria-label="Placement"
            value={binding.slot}
            onChange={(e) => update({ slot: e.target.value })}
          >
            <option value="primary">Main panel</option>
            <option value="details">More settings</option>
          </select>
        </label>
        <div className="composition-object-actions">
          {[-1, 1].map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() =>
                changeScene((s) => {
                  const list = control ? s.controls : s.measurements,
                    i = list.findIndex((b) => b.id === binding.id),
                    to = i + direction;
                  if (to >= 0 && to < list.length)
                    [list[i], list[to]] = [list[to], list[i]];
                })
              }
            >
              {direction < 0 ? "Move earlier" : "Move later"}
            </button>
          ))}
        </div>
      </details>
      <div className="composition-object-actions">
        <button
          type="button"
          onClick={() => {
            changeScene((s) => {
              s.controls = s.controls.filter((c) => c.id !== binding.id);
              s.measurements = s.measurements.filter(
                (m) => m.id !== binding.id,
              );
            });
            setSelected("");
          }}
        >
          Remove component
        </button>
      </div>
    </>
  );
}
