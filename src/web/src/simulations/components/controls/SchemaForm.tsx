"use client";

import { useState } from "react";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { ActionResult } from "../../runtime/commands";
import {
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";

function Field({
  schema,
  value,
  onChange,
  label,
  widget,
}: {
  widget?: string;
  schema: ParameterSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  label: string;
}) {
  if (schema.type === "object")
    return (
      <fieldset>
        <legend>{label}</legend>
        {Object.entries(schema.properties).map(([key, s]) => (
          <Field
            key={key}
            label={key}
            widget={widget}
            schema={s}
            value={(value as Record<string, unknown>)?.[key]}
            onChange={(v) =>
              onChange({ ...(value as Record<string, unknown>), [key]: v })
            }
          />
        ))}
      </fieldset>
    );
  if (schema.type === "array")
    return (
      <fieldset>
        <legend>{label}</legend>
        {(Array.isArray(value) ? value : []).map((v, i) => (
          <Field
            // biome-ignore lint/suspicious/noArrayIndexKey: Schema tuples have fixed positional argument identity.
            key={i}
            label={`${label} ${i + 1}`}
            widget={widget}
            schema={schema.items}
            value={v}
            onChange={(next) =>
              onChange(
                (value as unknown[]).map((item, j) => (j === i ? next : item)),
              )
            }
          />
        ))}
      </fieldset>
    );
  if (schema.type === "boolean")
    return (
      <label>
        {label}
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  if (schema.type === "enum" || (schema.type === "string" && schema.enum)) {
    const choices =
      schema.type === "enum" ? schema.values : requireValue(schema.enum);
    return (
      <label>
        {label}
        <select
          value={JSON.stringify(value)}
          onChange={(e) => onChange(JSON.parse(e.target.value))}
        >
          {choices.map((v) => (
            <option key={JSON.stringify(v)} value={JSON.stringify(v)}>
              {String(v)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const numeric = schema.type === "number" || schema.type === "integer";
  return (
    <label>
      {label}
      {numeric && schema.unit ? ` (${schema.unit})` : ""}
      <input
        type={numeric ? (widget === "Slider" ? "range" : "number") : "text"}
        min={numeric ? schema.minimum : undefined}
        max={numeric ? schema.maximum : undefined}
        step={schema.type === "integer" ? 1 : "any"}
        value={String(value ?? "")}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(numeric && raw.trim() ? Number(raw) : raw);
        }}
      />
    </label>
  );
}
/** Drafts remain local. Explicit submit never runs additive actions on keystrokes. */
export function SchemaForm({
  schema,
  initial,
  label,
  mode = "submit",
  submitLabel,
  onSubmit,
  widget,
}: {
  widget?: string;
  schema: ParameterSchema;
  initial: unknown;
  label: string;
  mode?: "submit" | "immediate";
  submitLabel?: string;
  onSubmit: (v: Record<string, unknown>) => ActionResult;
}) {
  const [value, setValue] = useState(initial),
    [feedback, report] = useState("");
  const submit = (next: unknown) => {
    try {
      validateValue(schema, next);
      const result = onSubmit(next as Record<string, unknown>);
      report(result.accepted ? "Change applied." : result.error);
    } catch (e) {
      report(e instanceof Error ? e.message : "Invalid argument");
    }
  };
  return (
    <form
      className="catalog-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <Field
        widget={widget}
        schema={schema}
        value={value}
        label={label}
        onChange={(v) => {
          setValue(v);
          if (mode === "immediate") submit(v);
        }}
      />
      {mode === "submit" && (
        <button type="submit">
          {submitLabel ??
            (schema.type === "object" && !Object.keys(schema.properties).length
              ? label
              : "Apply")}
        </button>
      )}
      <output aria-live="polite">{feedback}</output>
    </form>
  );
}
