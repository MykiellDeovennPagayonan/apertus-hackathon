"use client";
import { type FormEvent, useId, useState } from "react";
import type { ActionResult } from "../../../runtime/commands";
import type { ModelInstance } from "../../../runtime/contribution";
import type { UIAction } from "../../../runtime/types";

export type ChemistryDispatch = (command: UIAction) => ActionResult;
export function ChemistryNumberControl({
  label,
  min,
  max,
  initial,
  action,
  instance,
  dispatch,
  report,
}: {
  label: string;
  min: number;
  max: number;
  initial: number;
  action: string;
  instance: ModelInstance;
  dispatch: ChemistryDispatch;
  report: (message: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(initial));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = dispatch({
      type: action,
      target: instance.id,
      value: draft.trim() ? Number(draft) : Number.NaN,
    });
    report(result.accepted ? "Change applied." : result.error);
  };
  return (
    <form onSubmit={submit} className="chem-input">
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step="any"
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit">Apply</button>
      </div>
      <small>
        Range: {min}–{max}
      </small>
    </form>
  );
}
export function ChemistryCoefficientControls({
  instance,
  dispatch,
  report,
}: {
  instance: ModelInstance;
  dispatch: ChemistryDispatch;
  report: (message: string) => void;
}) {
  const molecules = instance.outputs.molecules as {
    formula: string;
    count: number;
  }[];
  return (
    <div className="chem-coefficients">
      {molecules.map((m, index) => (
        <label key={m.formula}>
          Coefficient of {m.formula}
          <input
            type="number"
            min="1"
            max="12"
            step="1"
            value={m.count}
            onChange={(e) => {
              const values = molecules.map((sp) => sp.count);
              values[index] = e.target.value
                ? Number(e.target.value)
                : Number.NaN;
              const result = dispatch({
                type: "CHEM_SET_COEFFICIENTS",
                target: instance.id,
                value: values,
              });
              report(
                result.accepted
                  ? "Coefficients updated. Formulas stay the same."
                  : result.error,
              );
            }}
          />
        </label>
      ))}
    </div>
  );
}
