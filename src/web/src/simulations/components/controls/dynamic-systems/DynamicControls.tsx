"use client";
import { type FormEvent, useId, useState } from "react";
import type { ActionResult } from "../../../runtime/commands";
import type { ModelInstance } from "../../../runtime/contribution";
import type { UIAction } from "../../../runtime/types";

export type DynamicDispatch = (command: UIAction) => ActionResult;

export function DynamicNumberControl({
  label,
  min,
  max,
  step = "any",
  initial,
  action,
  instance,
  dispatch,
  report,
}: {
  label: string;
  min: number;
  max: number;
  step?: number | "any";
  initial: number;
  action: string;
  instance: ModelInstance;
  dispatch: DynamicDispatch;
  report: (message: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(initial));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim() ? Number(draft) : Number.NaN;
    const result = dispatch({ type: action, target: instance.id, value });
    report(result.accepted ? "Change applied." : result.error);
  };
  return (
    <form className="dynamic-input" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          required
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">Apply</button>
      </div>
      <small>
        Range: {min}–{max}
      </small>
    </form>
  );
}
