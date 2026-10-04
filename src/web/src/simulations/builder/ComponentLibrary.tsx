import { useEffect, useRef, useState } from "react";
import { canvasCatalog } from "./catalog";
import { type TemplateId, templates } from "./descriptors";
export type ComponentCategory = "all" | "object" | "control" | "result";

export function ComponentLibrary({
  open,
  category,
  template,
  hasObject,
  onClose,
  onAddObject,
  onAdd,
}: {
  open: boolean;
  category: ComponentCategory;
  template: TemplateId;
  hasObject: boolean;
  onClose: () => void;
  onAddObject: () => void;
  onAdd: (kind: "control" | "result", capability: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ComponentCategory>(category);
  useEffect(() => {
    if (open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setFilter(category);
      setSearch("");
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [open, category]);
  const t = templates[template];
  const object = canvasCatalog[template];
  const matches = (label: string) =>
    label.toLowerCase().includes(search.toLowerCase());
  const controls = Object.entries(t.controls).filter(([, cap]) =>
    matches(cap.label),
  );
  const results = Object.entries(t.outputs).filter(([, cap]) =>
    matches(cap.label),
  );
  const showObject = ["all", "object"].includes(filter);
  const showControls = ["all", "control"].includes(filter);
  const showResults = ["all", "result"].includes(filter);
  const count =
    (showObject && matches(object.object) ? 1 : 0) +
    (hasObject && showControls ? controls.length : 0) +
    (hasObject && showResults ? results.length : 0);
  return (
    <dialog
      ref={dialog}
      className="builder-component-dialog"
      aria-label="Add a component"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="builder-palette">
        <button
          className="inspector-close"
          type="button"
          aria-label="Close component library"
          onClick={onClose}
        >
          ×
        </button>
        <h2>
          {category === "control"
            ? "Add a learner control"
            : category === "result"
              ? "Add a result"
              : "Add a component"}
        </h2>
        <p className="field-help">
          Each choice adds one item. It appears in the lesson immediately.
        </p>
        <label>
          Search components
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div
          className="component-category-tabs"
          role="toolbar"
          aria-label="Component categories"
        >
          {(["all", "object", "control", "result"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {key === "all"
                ? "All"
                : key === "object"
                  ? "Objects"
                  : key === "control"
                    ? "Controls"
                    : "Results"}
            </button>
          ))}
        </div>
        {!hasObject && !showObject && (
          <div className="component-prerequisite">
            <p>
              Add {object.object.toLowerCase()} first to make its controls and
              measurements available.
            </p>
            <button type="button" onClick={() => setFilter("object")}>
              Choose an object
            </button>
          </div>
        )}
        {showObject && matches(object.object) && (
          <section>
            <h3>Objects</h3>
            <p>{object.contents}</p>
            {hasObject ? (
              <p>
                {object.object} is already on the canvas. This model currently
                supports one instance.
              </p>
            ) : (
              <button
                className="component-choice"
                type="button"
                onClick={onAddObject}
              >
                + {object.object}
              </button>
            )}
          </section>
        )}
        {hasObject && showControls && (
          <section>
            <h3>Controls</h3>
            <p className="field-help">What can the learner change?</p>
            {controls.map(([key, cap]) => (
              <button
                className="component-choice"
                type="button"
                key={key}
                aria-label={`+ ${cap.label}`}
                onClick={() => onAdd("control", key)}
              >
                + {cap.label}
                <small>
                  {cap.widget === "button"
                    ? "Action button"
                    : cap.widget === "toggle"
                      ? "Toggle"
                      : cap.widget === "select"
                        ? "Dropdown"
                        : cap.widget === "number"
                          ? "Number input"
                          : "Slider"}
                  {cap.unit && cap.unit !== "1" ? ` · ${cap.unit}` : ""}
                </small>
              </button>
            ))}
          </section>
        )}
        {hasObject && showResults && (
          <section>
            <h3>Results</h3>
            <p className="field-help">What should the learner observe?</p>
            {results.map(([key, cap]) => (
              <button
                className="component-choice"
                type="button"
                key={key}
                aria-label={`Show ${cap.label}`}
                onClick={() => onAdd("result", key)}
              >
                Show {cap.label}
                <small>
                  Read-only measurement
                  {cap.unit && cap.unit !== "1" ? ` · ${cap.unit}` : ""}
                </small>
              </button>
            ))}
          </section>
        )}
        {!count && hasObject && (
          <output>
            No matching components. Try another search or category.
          </output>
        )}
      </div>
    </dialog>
  );
}
