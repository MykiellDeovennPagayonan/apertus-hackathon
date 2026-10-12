"use client";
import { useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import {
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import { SchemaForm } from "./SchemaForm";

export function hasArray(schema: ParameterSchema): boolean {
  return (
    schema.type === "array" ||
    (schema.type === "object" &&
      Object.values(schema.properties).some(hasArray))
  );
}
/** Variable-length datasets use JSON; scalar fields keep the existing house controls. */
export function ImportedValueForm({
  schema,
  initial,
  label,
  submitLabel,
  onSubmit,
}: {
  schema: ParameterSchema;
  initial: unknown;
  label: string;
  submitLabel?: string;
  onSubmit: (value: unknown) => ActionResult;
}) {
  const [text, setText] = useState(() =>
    JSON.stringify(initial ?? {}, null, 2),
  );
  const [error, setError] = useState("");
  if (!hasArray(schema))
    return (
      <SchemaForm
        schema={schema}
        initial={initial}
        label={label}
        submitLabel={submitLabel}
        onSubmit={onSubmit}
      />
    );
  return (
    <form
      className="catalog-form"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          if (new TextEncoder().encode(text).length > 256 * 1024)
            throw new Error("Input data exceeds 256 KiB.");
          const value: unknown = JSON.parse(text);
          validateValue(schema, value, label);
          const result = onSubmit(value);
          setError(result.accepted ? "" : result.error);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Invalid input data");
        }
      }}
    >
      <label>
        {label}
        <textarea
          aria-label={label}
          rows={6}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <button type="submit">{submitLabel ?? "Apply values"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
