import { canvasCatalog } from "./catalog";
import { connectionGraph } from "./connections";
import { templates } from "./descriptors";
import {
  controlFor,
  deleteBlock,
  type ExperimentDocument,
  requireRecord,
  resultFor,
} from "./document";

export function ConnectionSettings({
  doc,
  selected,
  presentationWires,
  onSelect,
  onClose,
  onEdit,
  onAdd,
  onOpenSettings,
  error,
}: {
  doc: ExperimentDocument;
  selected: string;
  presentationWires: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onEdit: (change: (next: ExperimentDocument) => void) => void;
  onAdd: (kind: "control" | "result") => void;
  onOpenSettings: (id: string) => void;
  error: string;
}) {
  const t = templates[doc.template];
  const control = doc.presentation.controls.find(
    (item) => item.id === selected,
  );
  const result = doc.presentation.results.find((item) => item.id === selected);
  const { node } = connectionGraph(doc, presentationWires);
  const block = node(selected);
  const binding = control
    ? t.controls[control.capability].label
    : result
      ? t.outputs[result.output].label
      : "";
  return (
    <section
      className="builder-inspector connection-inspector"
      aria-label="Selected block settings"
    >
      <button
        type="button"
        className="inspector-close"
        aria-label="Close settings"
        onClick={onClose}
      >
        ×
      </button>
      <p className="connection-inspector-kind">
        {control
          ? "Learner control"
          : result
            ? "Read-only result"
            : selected === "object"
              ? "Model"
              : "Presentation"}
      </p>
      <h2>{block?.label ?? "Component settings"}</h2>
      {(control || result) && (
        <>
          <div className="connection-binding-summary">
            <span>
              {control ? control.label : canvasCatalog[doc.template].object}
            </span>
            <span aria-hidden="true">↓</span>
            <strong>{binding}</strong>
            <span>
              {control
                ? `on ${canvasCatalog[doc.template].object.toLowerCase()}`
                : `shown by ${result?.label}`}
            </span>
          </div>
          <label>
            {control ? "Changes on the model" : "Reads from the model"}
            <select
              value={control?.capability ?? result?.output}
              onChange={(event) =>
                onEdit((next) => {
                  if (control) {
                    const index = next.presentation.controls.findIndex(
                      (item) => item.id === selected,
                    );
                    const target = requireRecord(
                      next.presentation.controls[index],
                    );
                    next.presentation.controls[index] = {
                      ...controlFor(next, event.target.value, selected),
                      label:
                        target.label === t.controls[target.capability].label
                          ? t.controls[event.target.value].label
                          : target.label,
                      slot: target.slot,
                    };
                  } else {
                    const index = next.presentation.results.findIndex(
                      (item) => item.id === selected,
                    );
                    const target = requireRecord(
                      next.presentation.results[index],
                    );
                    next.presentation.results[index] = {
                      ...resultFor(next, event.target.value, selected),
                      label:
                        target.label === t.outputs[target.output].label
                          ? t.outputs[event.target.value].label
                          : target.label,
                      slot: target.slot,
                      precision: target.precision,
                    };
                  }
                })
              }
              aria-label={control ? "Action connection" : "Data connection"}
            >
              {Object.entries(control ? t.controls : t.outputs).map(
                ([key, capability]) => (
                  <option key={key} value={key}>
                    {capability.label}
                  </option>
                ),
              )}
            </select>
          </label>
          <p className="field-help">
            {control
              ? "The learner uses this control to request a validated change."
              : `This result observes the model. ${result?.unit && result.unit !== "1" ? `Unit: ${result.unit}.` : ""}`}
          </p>
          <button
            className="connection-edit-lesson"
            type="button"
            onClick={() => onOpenSettings(selected)}
          >
            Edit {control ? "control" : "result"} in lesson →
          </button>
        </>
      )}
      {selected === "object" && (
        <>
          <p className="field-help">{canvasCatalog[doc.template].contents}</p>
          <h3>Connected components</h3>
          <div className="connection-related-items">
            {[...doc.presentation.controls, ...doc.presentation.results].map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                >
                  <span>
                    {doc.presentation.controls.some(
                      (control) => control.id === item.id,
                    )
                      ? "↗"
                      : "◎"}
                  </span>
                  {item.label}
                  <span aria-hidden="true">→</span>
                </button>
              ),
            )}
          </div>
          {!doc.presentation.controls.length &&
            !doc.presentation.results.length && (
              <p className="field-help">
                Add a control to change the model, or a result to observe it.
              </p>
            )}
          <div className="connection-inspector-additions">
            <button type="button" onClick={() => onAdd("control")}>
              Add control
            </button>
            <button type="button" onClick={() => onAdd("result")}>
              Add result
            </button>
          </div>
          <button
            type="button"
            className="connection-edit-lesson"
            onClick={() => onOpenSettings("object")}
          >
            Edit starting values →
          </button>
        </>
      )}
      {!control && !result && selected !== "object" && (
        <>
          <p className="field-help">
            {selected === "view"
              ? "This scene displays the model's accepted state. It updates automatically when a control changes the model."
              : "These connections describe where content appears in the lesson."}
          </p>
          <button type="button" onClick={() => onOpenSettings(selected)}>
            Open lesson settings →
          </button>
        </>
      )}
      {block && (
        <details className="connection-position">
          <summary>Position on canvas</summary>
          <p className="field-help">
            Editor coordinates. Drag the card, or enter a position here.
          </p>
          <div>
            {(["x", "y"] as const).map((axis) => (
              <label key={axis}>
                {axis.toUpperCase()}
                <input
                  type="number"
                  min={0}
                  max={3000}
                  value={block[axis]}
                  onChange={(event) =>
                    onEdit((next) => {
                      next.editor.positions[selected] = {
                        x: block.x,
                        y: block.y,
                        [axis]: Number(event.target.value),
                      };
                    })
                  }
                />
              </label>
            ))}
          </div>
        </details>
      )}
      {(control || result) && (
        <button
          type="button"
          className="connection-remove"
          onClick={() => {
            onEdit((next) => deleteBlock(next, selected));
            onClose();
          }}
        >
          Remove {control ? "control" : "result"}
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
