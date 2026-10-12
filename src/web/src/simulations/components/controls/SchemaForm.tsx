"use client";

import { useId, useState } from "react";
import { requireValue } from "../../runtime/authoring/requireValue";
import type { ActionResult } from "../../runtime/commands";
import {
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import { NumberField } from "./NumberField";

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
  {
    label?: string;
    help?: string;
    choices?: Record<string, string>;
    step?: number;
    widget?: string;
    showNumber?: boolean;
    exactLabel?: boolean;
    limits?: boolean;
    compact?: boolean;
    hideUnit?: boolean;
    rangeLabels?: [string, string];
    rangeLabel?: string;
  }
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
  onValidityChange,
  commitOnBlur = false,
}: {
  commitOnBlur?: boolean;
  widget?: string;
  schema: ParameterSchema;
  value: unknown;
  onChange: (v: unknown) => ActionResult | undefined;
  label: string;
  id: string;
  path?: string;
  presentation?: FieldPresentation;
  errorId?: string;
  onValidityChange?: (id: string, valid: boolean) => void;
}) {
  widget = presentation[path]?.widget ?? widget;
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
              onValidityChange={onValidityChange}
              commitOnBlur={commitOnBlur}
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
              onValidityChange={onValidityChange}
              commitOnBlur={commitOnBlur}
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
    if (widget === "segmented")
      return (
        <fieldset className="catalog-choice">
          <legend>{label}</legend>
          <div className="catalog-choice-options">
            {choices.map((choice) => (
              <label key={JSON.stringify(choice)}>
                <input
                  type="radio"
                  name={id}
                  value={JSON.stringify(choice)}
                  checked={value === choice}
                  aria-describedby={errorId}
                  aria-invalid={!!errorId || undefined}
                  onChange={() => onChange(choice)}
                />
                <span>
                  {presentation[path]?.choices?.[String(choice)] ??
                    String(choice)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    return (
      <label className="catalog-field" htmlFor={id}>
        <span>{label}</span>
        <select
          id={id}
          aria-describedby={errorId}
          aria-invalid={!!errorId || undefined}
          value={JSON.stringify(value) ?? ""}
          onChange={(event) => onChange(JSON.parse(event.target.value))}
        >
          {value === undefined && (
            <option value="" disabled>
              Not set
            </option>
          )}
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
  if (candidateUnit && label.endsWith(` (${candidateUnit})`))
    label = label.slice(0, -candidateUnit.length - 3);
  const unit =
    candidateUnit &&
    !label.toLowerCase().split(/\s+/).includes(candidateUnit.toLowerCase())
      ? candidateUnit
      : undefined;
  if (numeric && (schema.type === "number" || schema.type === "integer"))
    return (
      <NumberField
        label={label}
        compact={presentation[path]?.compact}
        commitOnBlur={commitOnBlur}
        inputLabel={
          widget === "Slider" && presentation[path]?.exactLabel !== false
            ? `Exact ${label.toLowerCase()}`
            : label
        }
        rangeLabel={presentation[path]?.rangeLabel ?? label}
        value={Number(value ?? schema.minimum)}
        min={schema.minimum}
        max={schema.maximum}
        integer={schema.type === "integer"}
        step={
          presentation[path]?.step ?? (schema.type === "integer" ? 1 : "any")
        }
        presentation={widget === "Slider" ? "slider" : "field"}
        showNumber={presentation[path]?.showNumber !== false}
        unit={presentation[path]?.hideUnit ? undefined : unit}
        rangeLabels={presentation[path]?.rangeLabels}
        limits={widget === "Slider" && presentation[path]?.limits !== false}
        onValidityChange={(valid) => onValidityChange?.(id, valid)}
        onChange={(next) => {
          return onChange(next) ?? { accepted: true };
        }}
      />
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
        type="text"
        inputMode={
          numeric
            ? schema.type === "integer"
              ? "numeric"
              : "decimal"
            : undefined
        }
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
  const [discardRevision, setDiscardRevision] = useState(0);
  const [validity, setValidity] = useState<Record<string, boolean>>({});
  const fieldValidity = (field: string, valid: boolean) => {
    setValidity((previous) => ({ ...previous, [field]: valid }));
    if (mode === "submit" && !valid) {
      if (!dirty) setDraftOrigin(revision);
      setDirty(true);
    }
  };
  const invalid = Object.values(validity).some((valid) => !valid);
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
      const accepted = commit(next);
      if (accepted) setValue(next);
      return accepted
        ? ({ accepted: true } as const)
        : ({
            accepted: false,
            error: "Change was rejected. Review the values.",
          } as const);
    }
    setFeedback("");
    if (!dirty) setDraftOrigin(revision);
    setDirty(true);
    setValue(next);
    return { accepted: true } as const;
  };
  return (
    <form
      noValidate
      className={`catalog-form catalog-form--${isAction ? "action" : (widget?.split("/").at(-1)?.toLowerCase() ?? "form")}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid && commit(value)) setDirty(false);
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
              key={discardRevision}
              id={`${id}-field`}
              schema={schema}
              value={value}
              label={label}
              widget={widget}
              onChange={update}
              onValidityChange={fieldValidity}
              commitOnBlur={mode === "immediate"}
              errorId={
                feedbackTone === "error" && feedback
                  ? `${id}-feedback`
                  : undefined
              }
            />
          ) : singleValue ? (
            <Field
              key={discardRevision}
              id={`${id}-value`}
              widget={widget}
              path="value"
              presentation={presentation}
              onValidityChange={fieldValidity}
              commitOnBlur={mode === "immediate"}
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
                  key={`${key}/${discardRevision}`}
                  id={`${id}-${key}`}
                  widget={widget}
                  path={key}
                  presentation={presentation}
                  onValidityChange={fieldValidity}
                  commitOnBlur={mode === "immediate"}
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
              disabled={invalid}
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
            setValidity({});
            setDiscardRevision((previous) => previous + 1);
          }}
        >
          Discard edits
        </button>
      )}
    </form>
  );
}
