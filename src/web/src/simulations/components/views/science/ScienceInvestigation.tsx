"use client";

import { useId, useRef, useState } from "react";
import { scienceCommand, scienceSpec } from "../../../domains/science";
import type { ActionResult } from "../../../runtime/commands";
import { NumberField } from "../../controls/NumberField";
import type {
  ScienceKind,
  ScienceState,
} from "../../systems/science/contracts";
import { ScienceComparison } from "./ScienceComparison";

const investigationNames: Record<ScienceKind, string> = {
  cell: "Explore separation errors",
  immune: "Change the infection",
  genome: "Explore inheritance",
  pollination: "Compare flowering conditions",
  invasive: "Explore plant control",
  earth: "Follow mantle movement",
  plates: "Compare plate movement",
  volcano: "Compare eruptions",
  water: "Compare watersheds",
};
export function ScienceInvestigation({
  state: s,
  run,
  error,
  fields,
}: {
  state: ScienceState;
  run: (port: string, value?: unknown) => ActionResult;
  error: string;
  fields?: string[];
}) {
  const spec = scienceSpec(s.kind);
  const settings = spec.settings.filter(
    (f) => !fields || fields.includes(f.key),
  );
  const [key, setKey] = useState(settings[0]?.key ?? "");
  const field = settings.find((f) => f.key === key) ?? settings[0];
  const [pending, setPending] = useState<{ key: string; value: number } | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const send = (action: string, value?: unknown) =>
    run(scienceCommand(s.kind, action), value);
  const connected = (action: string, value?: unknown) => {
    const result = send(action, value);
    if (result.accepted) setPending(null);
    return result;
  };
  const change = (value: number): ActionResult => {
    if (!field) return { accepted: false, error: "Choose a condition." };
    if (field.restart) {
      setPending({ key: field.key, value });
      return { accepted: true };
    }
    return connected(`SET_${field.key.toUpperCase()}`, value);
  };
  const compare = () => {
    const baseline = s.baseline;
    if (!baseline?.snapshot) return;
    if (!connected("RESTART").accepted) return;
    // Restore the baseline's introduction site before advancing the changed habitat.
    if (
      s.kind === "invasive" &&
      baseline.snapshot.invasive &&
      baseline.snapshot.invasive.origin >= 0
    ) {
      if (
        !connected("SELECT", baseline.snapshot.invasive.origin).accepted ||
        !connected("INTRODUCE").accepted
      )
        return;
    }
    if (s.kind === "immune" && baseline.snapshot.immune?.exposure) {
      if (!connected("EXPOSE").accepted) return;
    }
    for (let i = 0; i < baseline.time; i++)
      if (!connected("STEP").accepted) break;
  };
  const value =
    field && pending?.key === field.key
      ? pending.value
      : field
        ? s.settings[field.key]
        : 0;
  return (
    <>
      <button
        type="button"
        className="science-secondary science-investigation-trigger"
        aria-haspopup="dialog"
        onClick={() => {
          setPending(null);
          send("PAUSE");
          dialog.current?.showModal();
        }}
      >
        {investigationNames[s.kind]}
      </button>
      <dialog
        ref={dialog}
        className="science-panel science-investigation"
        aria-labelledby={`${id}-title`}
        onClose={() => setPending(null)}
      >
        <div className="science-dialog-heading">
          <h2 id={`${id}-title`}>{investigationNames[s.kind]}</h2>
          <button type="button" onClick={() => dialog.current?.close()}>
            Done
          </button>
        </div>
        {settings.length > 1 && (
          <label className="science-choice">
            Change one condition
            <select
              aria-label="Change one condition"
              value={field?.key}
              onChange={(e) => {
                setKey(e.target.value);
                setPending(null);
              }}
            >
              {settings.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {field && (
          <div className="science-condition" key={field.key}>
            <p>{field.help}</p>
            {field.options ? (
              <label className="science-choice">
                {field.label}
                <select
                  aria-label={field.label}
                  value={value}
                  onChange={(e) => change(Number(e.target.value))}
                >
                  {field.options.map((option, i) => (
                    <option key={option} value={i}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <NumberField
                label={field.label}
                inputLabel={`Exact ${field.label.toLowerCase()}`}
                value={value}
                min={field.min}
                max={field.max}
                onChange={change}
                presentation="slider"
                commitOnBlur
                limits
              />
            )}
            {field.restart && (
              <button
                type="button"
                className="science-primary"
                disabled={!pending}
                onClick={() =>
                  connected(`SET_${field.key.toUpperCase()}`, value)
                }
              >
                Apply and restart
              </button>
            )}
          </div>
        )}
        <div className="science-investigation-actions">
          {s.kind === "earth" && (
            <button type="button" onClick={() => send("STEP")}>
              Advance mantle tracer
            </button>
          )}
          {s.kind === "invasive" && (
            <button
              type="button"
              disabled={!s.invasive?.effort}
              onClick={() => send("RESTORE")}
            >
              Restore native cover
            </button>
          )}
          <button
            type="button"
            disabled={!!pending}
            onClick={() => connected("RESTART")}
          >
            Restart this run
          </button>
          <button
            type="button"
            disabled={!s.time || !!pending}
            onClick={() => connected("BASELINE")}
          >
            Keep baseline and restart
          </button>
          {s.baseline && (
            <button
              type="button"
              className="science-primary"
              disabled={!!pending}
              onClick={compare}
            >
              Run to baseline
            </button>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        {s.baseline && <ScienceComparison state={s} />}
        <p className="science-subtle">
          Restart this run keeps the current conditions and seed. Keeping a
          baseline retains this result and starts a fresh run. Restart
          experiment restores the authored conditions and clears retained
          results.
        </p>
      </dialog>
    </>
  );
}
