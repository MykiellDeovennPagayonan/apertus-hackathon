"use client";

import { useId, useState } from "react";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { ActionResult } from "../../runtime/commands";
import {
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import { formatDataNumber } from "../views/dataPresentation";

const fieldNames: Record<string, string> = {
  a: "First value",
  b: "Second value",
  d: "Denominator",
  n: "Numerator",
};

function fieldLabel(key: string) {
  return (
    fieldNames[key] ??
    key
      .replaceAll("_", " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

function usefulUnit(schema: ParameterSchema) {
  return "unit" in schema && schema.unit && schema.unit !== "1"
    ? schema.unit
    : undefined;
}

export type FieldPresentation = Record<
  string,
  { label?: string; help?: string; choices?: Record<string, string> }
>;

function Field({
  schema,
  value,
  onChange,
  label,
  widget,
  id,
  path = "",
  presentation = {},
  errorId,
}: {
  widget?: string;
  schema: ParameterSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  label: string;
  id: string;
  path?: string;
  presentation?: FieldPresentation;
  errorId?: string;
}) {
  const [numericDraft, setNumericDraft] = useState<string | null>(null);
  if (schema.type === "object") {
    const fields = Object.entries(schema.properties);
    if (!fields.length) return null;
    return (
      <fieldset className="catalog-field-group">
        <legend>{label}</legend>
        <div className="catalog-field-grid">
          {fields.map(([key, child]) => (
            <Field
              key={key}
              id={`${id}-${key}`}
              label={presentation[`${path}.${key}`]?.label ?? fieldLabel(key)}
              path={`${path}.${key}`}
              presentation={presentation}
              errorId={errorId}
              widget={widget}
              schema={child}
              value={(value as Record<string, unknown>)?.[key]}
              onChange={(next) =>
                onChange({
                  ...((value as Record<string, unknown>) ?? {}),
                  [key]: next,
                })
              }
            />
          ))}
        </div>
      </fieldset>
    );
  }
  if (schema.type === "array")
    return (
      <fieldset className="catalog-field-group">
        <legend>{label}</legend>
        <div className="catalog-field-grid">
          {(Array.isArray(value) ? value : []).map((item, index) => (
            <Field
              // biome-ignore lint/suspicious/noArrayIndexKey: Schema tuples have fixed positional argument identity.
              key={index}
              id={`${id}-${index}`}
              label={
                presentation[`${path}.${index}`]?.label ??
                `${label} ${index + 1}`
              }
              widget={widget}
              schema={schema.items}
              path={`${path}.${index}`}
              presentation={presentation}
              errorId={errorId}
              value={item}
              onChange={(next) =>
                onChange(
                  (value as unknown[]).map((current, itemIndex) =>
                    itemIndex === index ? next : current,
                  ),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    );
  if (schema.type === "boolean")
    return (
      <label className="catalog-toggle" htmlFor={id}>
        <span className="catalog-toggle-copy">
          <strong>{label}</strong>
          {schema.description && <small>{schema.description}</small>}
        </span>
        <input
          id={id}
          aria-describedby={errorId}
          aria-invalid={!!errorId || undefined}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  if (schema.type === "enum" || (schema.type === "string" && schema.enum)) {
    const choices =
      schema.type === "enum" ? schema.values : requireValue(schema.enum);
    return (
      <label className="catalog-field" htmlFor={id}>
        <span>{label}</span>
        <select
          id={id}
          aria-describedby={errorId}
          aria-invalid={!!errorId || undefined}
          value={JSON.stringify(value)}
          onChange={(event) => onChange(JSON.parse(event.target.value))}
        >
          {choices.map((choice) => (
            <option key={JSON.stringify(choice)} value={JSON.stringify(choice)}>
              {presentation[path]?.choices?.[String(choice)] ?? String(choice)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const numeric = schema.type === "number" || schema.type === "integer";
  const candidateUnit = usefulUnit(schema);
  const unit =
    candidateUnit &&
    !label.toLowerCase().split(/\s+/).includes(candidateUnit.toLowerCase())
      ? candidateUnit
      : undefined;
  if (numeric && widget === "Slider")
    return (
      <div className="catalog-slider">
        <div className="catalog-slider-heading">
          <label htmlFor={`${id}-range`}>{label}</label>
          <span className="catalog-current-value">
            {typeof value === "number"
              ? formatDataNumber(value)
              : String(value ?? "")}
            {unit && <small>{unit}</small>}
          </span>
        </div>
        <div className="catalog-slider-inputs">
          <input
            id={`${id}-range`}
            aria-describedby={errorId}
            aria-invalid={!!errorId || undefined}
            type="range"
            min={schema.minimum}
            max={schema.maximum}
            step={schema.type === "integer" ? 1 : "any"}
            value={String(value ?? schema.minimum)}
            onChange={(event) => {
              setNumericDraft(null);
              onChange(Number(event.target.value));
            }}
          />
          <label className="catalog-exact-value" htmlFor={`${id}-number`}>
            <span className="sr-only">Exact {label.toLowerCase()}</span>
            <input
              id={`${id}-number`}
              aria-describedby={errorId}
              aria-invalid={!!errorId || undefined}
              aria-label={`Exact ${label.toLowerCase()}`}
              type="number"
              min={schema.minimum}
              max={schema.maximum}
              step={schema.type === "integer" ? 1 : "any"}
              value={numericDraft ?? String(value ?? "")}
              onChange={(event) => {
                const raw = event.target.value;
                setNumericDraft(raw);
                onChange(raw.trim() ? Number(raw) : raw);
              }}
              onBlur={() => {
                if (numericDraft?.trim() && Number(numericDraft) === value)
                  setNumericDraft(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setNumericDraft(null);
                  onChange(value);
                }
              }}
            />
            {unit && <span>{unit}</span>}
          </label>
        </div>
      </div>
    );
  return (
    <label className="catalog-field" htmlFor={id}>
      <span>
        {label}
        {unit && <small>{unit}</small>}
      </span>
      <input
        id={id}
        aria-describedby={errorId}
        aria-invalid={!!errorId || undefined}
        aria-label={label}
        type={numeric ? "number" : "text"}
        min={numeric ? schema.minimum : undefined}
        max={numeric ? schema.maximum : undefined}
        step={schema.type === "integer" ? 1 : "any"}
        value={String(value ?? "")}
        onChange={(event) => {
          const raw = event.target.value;
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
  presentation = {},
  current: providedCurrent,
  currentForDraft,
  currentRevision,
  actionIntent = "secondary",
}: {
  widget?: string;
  actionIntent?: "primary" | "secondary" | "quiet";
  presentation?: FieldPresentation;
  schema: ParameterSchema;
  initial: unknown;
  current?: Record<string, unknown>;
  currentRevision?: string;
  currentForDraft?: (
    draft: Record<string, unknown>,
  ) => Record<string, unknown> | undefined;
  label: string;
  mode?: "submit" | "immediate";
  submitLabel?: string;
  onSubmit: (v: Record<string, unknown>) => ActionResult;
}) {
  const [draft, setValue] = useState(initial);
  const current =
    currentForDraft?.(draft as Record<string, unknown>) ?? providedCurrent;
  const revision = currentRevision ?? JSON.stringify(current);
  const [dirty, setDirty] = useState(false);
  const [draftOrigin, setDraftOrigin] = useState<string>();
  const value = current && !dirty ? current : draft;
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">(
    "success",
  );
  const id = useId();
  const isAction =
    schema.type === "object" && !Object.keys(schema.properties).length;
  const entries =
    schema.type === "object" ? Object.entries(schema.properties) : [];
  const singleValue = entries.length === 1 && entries[0][0] === "value";
  const commit = (next: unknown) => {
    try {
      validateValue(schema, next);
      const result = onSubmit(next as Record<string, unknown>);
      setFeedbackTone(result.accepted ? "success" : "error");
      setFeedback(
        result.accepted
          ? mode === "submit" && !isAction
            ? "Change applied."
            : ""
          : result.error,
      );
      return result.accepted;
    } catch (error) {
      setFeedbackTone("error");
      const message =
        error instanceof Error ? error.message : "Invalid argument";
      const separator = message.indexOf(": ");
      const path = message.slice(0, separator).replace(/^value\./, "");
      const friendlyLabel =
        presentation[path]?.label ??
        (singleValue && path === "value" ? label : undefined);
      setFeedback(
        separator > 0 && friendlyLabel
          ? `${friendlyLabel}: ${message.slice(separator + 2)}`
          : message,
      );
      return false;
    }
  };
  const update = (next: unknown) => {
    if (mode === "immediate") {
      if (commit(next)) setValue(next);
      return;
    }
    setFeedback("");
    if (!dirty) setDraftOrigin(revision);
    setDirty(true);
    setValue(next);
  };
  return (
    <form
      noValidate
      className={`catalog-form catalog-form--${isAction ? "action" : (widget?.split("/").at(-1)?.toLowerCase() ?? "form")}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (commit(value)) setDirty(false);
      }}
    >
      {isAction ? (
        <button
          className={`recipe-action recipe-action--${actionIntent}`}
          type="submit"
        >
          {submitLabel ?? label}
        </button>
      ) : (
        <>
          {!singleValue && schema.type === "object" && (
            <h4 className="catalog-form-title">{label}</h4>
          )}
          {schema.type !== "object" ? (
            <Field
              id={`${id}-field`}
              schema={schema}
              value={value}
              label={label}
              widget={widget}
              onChange={update}
              errorId={
                feedbackTone === "error" && feedback
                  ? `${id}-feedback`
                  : undefined
              }
            />
          ) : singleValue ? (
            <Field
              id={`${id}-value`}
              widget={widget}
              path="value"
              presentation={presentation}
              errorId={
                feedbackTone === "error" && feedback
                  ? `${id}-feedback`
                  : undefined
              }
              schema={entries[0][1]}
              value={(value as Record<string, unknown>)?.value}
              label={
                entries[0][1].type === "object" ||
                entries[0][1].type === "array"
                  ? (presentation.value?.label ?? label)
                  : label
              }
              onChange={(next) =>
                update({
                  ...((value as Record<string, unknown>) ?? {}),
                  value: next,
                })
              }
            />
          ) : (
            <div className="catalog-field-grid catalog-field-grid--root">
              {entries.map(([key, child]) => (
                <Field
                  key={key}
                  id={`${id}-${key}`}
                  widget={widget}
                  path={key}
                  presentation={presentation}
                  errorId={
                    feedbackTone === "error" && feedback
                      ? `${id}-feedback`
                      : undefined
                  }
                  schema={child}
                  value={(value as Record<string, unknown>)?.[key]}
                  label={presentation[key]?.label ?? fieldLabel(key)}
                  onChange={(next) =>
                    update({
                      ...((value as Record<string, unknown>) ?? {}),
                      [key]: next,
                    })
                  }
                />
              ))}
            </div>
          )}
          {mode === "submit" && (
            <button
              className="recipe-action recipe-action--primary"
              type="submit"
            >
              {submitLabel ?? "Apply changes"}
            </button>
          )}
          {presentation.value?.help && (
            <p className="catalog-help">{presentation.value.help}</p>
          )}
        </>
      )}
      {feedback && (
        <output
          id={`${id}-feedback`}
          className={`catalog-feedback catalog-feedback--${feedbackTone}`}
          aria-live="polite"
        >
          {feedback}
        </output>
      )}
      {dirty && current && draftOrigin !== revision && (
        <output className="catalog-help" aria-live="polite">
          The activity changed while you were editing. Your draft is kept;
          Discard edits restores the current values.
        </output>
      )}
      {dirty && current && (
        <button
          className="recipe-action recipe-action--quiet"
          type="button"
          onClick={() => {
            setDirty(false);
            setFeedback("");
          }}
        >
          Discard edits
        </button>
      )}
    </form>
  );
}
