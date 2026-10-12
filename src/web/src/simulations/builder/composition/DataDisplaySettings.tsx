"use client";

import { useId, useState } from "react";
import { publicDefinition } from "../../components/catalog";
import {
  type DataColumn,
  outputDataPresentation,
  presentData,
} from "../../components/views/dataPresentation";
import type {
  AuthoredDocument,
  ComponentInstance,
} from "../../runtime/authoring/types";
import type { ActionResult } from "../../runtime/commands";
import { validateValue } from "../../runtime/parameterSchema";

/** Authored display settings use a recoverable draft and one undoable apply operation. */
export function DataDisplaySettings({
  node,
  document,
  onApply,
}: {
  node: ComponentInstance;
  document: AuthoredDocument;
  onApply: (configuration: Record<string, unknown>) => ActionResult;
}) {
  const id = useId();
  const [draft, setDraft] = useState(structuredClone(node.configuration));
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  }>();
  const binding = document.connections.find(
    (c) => c.kind === "value" && c.to.node === node.id,
  );
  const source = [...document.nodes, ...document.resources].find(
    (n) => n.id === binding?.from.node,
  );
  const defaults = outputDataPresentation(
    source?.definition ?? "",
    binding?.from.port ?? "",
  );
  let resourceColumns: DataColumn[] = [];
  if (source?.definition === "resources/Dataset") {
    try {
      resourceColumns = presentData(
        JSON.parse(String(source.configuration.rows)),
      ).columns;
    } catch {
      /* Source validation owns invalid resources. */
    }
  }
  const columns =
    (draft.columns as DataColumn[] | undefined) ??
    defaults.columns ??
    resourceColumns;
  const kind = node.definition.split("/")[1];
  const chart = kind === "Chart",
    heatmap = kind === "Heatmap";
  const update = (key: string, value: unknown) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setFeedback(undefined);
  };
  const remove = (...keys: string[]) => {
    setDraft((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([key]) => !keys.includes(key)),
      ),
    );
    setFeedback(undefined);
  };
  const text = (key: string, label: string, help?: string) => (
    <label className="catalog-field" htmlFor={`${id}-${key}`}>
      <span>{label}</span>
      <input
        id={`${id}-${key}`}
        value={String(draft[key] ?? "")}
        aria-describedby={feedback?.error ? `${id}-feedback` : undefined}
        onChange={(e) => update(key, e.target.value)}
      />
      {help && <small>{help}</small>}
    </label>
  );
  return (
    <form
      className="catalog-form data-settings"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (
            String(draft.precision).trim() === "" ||
            !Number.isInteger(Number(draft.precision)) ||
            Number(draft.precision) < 0 ||
            Number(draft.precision) > 8
          )
            throw new Error("Enter a number of decimal places from 0 to 8.");
          const configuration = {
            ...draft,
            precision: Number(draft.precision),
          };
          if (
            Array.isArray(draft.series) &&
            (!draft.series.length ||
              draft.series.some((key) => !columns.some((c) => c.key === key)))
          )
            throw new Error(
              "Choose at least one existing numeric series, or choose series automatically.",
            );
          validateValue(
            publicDefinition(node).configuration,
            configuration,
          );
          if (
            columns.length &&
            (columns.some((c) => !c.key.trim() || !c.label.trim()) ||
              new Set(columns.map((c) => c.key)).size !== columns.length)
          )
            throw new Error(
              "Give each column a distinct data key and a readable heading.",
            );
          const result = onApply(configuration);
          setFeedback({
            message: result.accepted
              ? "Display settings applied."
              : result.error,
            error: !result.accepted,
          });
        } catch (error) {
          setFeedback({
            message:
              error instanceof Error
                ? error.message
                : "Check the display settings.",
            error: true,
          });
        }
      }}
    >
      {text("label", "Display title")}
      <label className="catalog-field" htmlFor={`${id}-precision`}>
        <span>Maximum decimal places</span>
        <input
          id={`${id}-precision`}
          type="number"
          aria-describedby={feedback?.error ? `${id}-feedback` : undefined}
          aria-invalid={
            (feedback?.error &&
              (!Number.isInteger(Number(draft.precision)) ||
                String(draft.precision).trim() === "" ||
                Number(draft.precision) < 0 ||
                Number(draft.precision) > 8)) ||
            undefined
          }
          min={0}
          max={8}
          step={1}
          value={String(draft.precision ?? 3)}
          onChange={(e) => update("precision", e.target.value)}
        />
        <small>
          Small nonzero values use scientific notation so they remain
          distinguishable from zero.
        </small>
      </label>
      {heatmap ? (
        <details>
          <summary>Grid labels and units</summary>
          <div className="catalog-field-grid">
            {text("rowLabel", "Row label")}
            {text("columnLabel", "Column label")}
            {text("valueLabel", "Cell value label")}
            {text("valueUnit", "Cell value unit")}
          </div>
          <p className="data-settings-help">
            Rows and columns use source order, starting at 1. These settings
            change the presentation, not the model.
          </p>
        </details>
      ) : (
        <details>
          <summary>Column headings and units</summary>
          <p className="data-settings-help">
            Each data key identifies a field in the source. Headings and units
            explain it to learners. Source columns are used until you customize
            them.
          </p>
          <div className="data-settings-columns">
            {columns.map((c, index) => (
              <fieldset
                // biome-ignore lint/suspicious/noArrayIndexKey: Each row is an explicitly ordered draft column.
                key={index}
                className="catalog-field-group"
              >
                <legend>Column {index + 1}</legend>
                <div className="catalog-field-grid">
                  {(
                    [
                      ["key", "Data key"],
                      ["label", "Heading"],
                      ["unit", "Unit"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      className="catalog-field"
                      key={key}
                      htmlFor={`${id}-${index}-${key}`}
                    >
                      <span>{label}</span>
                      <input
                        id={`${id}-${index}-${key}`}
                        value={String(c[key] ?? "")}
                        onChange={(e) =>
                          update(
                            "columns",
                            columns.map((col, i) =>
                              i === index
                                ? { ...col, [key]: e.target.value }
                                : col,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label
                    className="catalog-field"
                    htmlFor={`${id}-${index}-type`}
                  >
                    <span>Value type</span>
                    <select
                      id={`${id}-${index}-type`}
                      value={c.type ?? ""}
                      onChange={(e) =>
                        update(
                          "columns",
                          columns.map((col, i) =>
                            i === index
                              ? e.target.value
                                ? { ...col, type: e.target.value }
                                : Object.fromEntries(
                                    Object.entries(col).filter(
                                      ([key]) => key !== "type",
                                    ),
                                  )
                              : col,
                          ),
                        )
                      }
                    >
                      <option value="">From source</option>
                      <option value="number">Number</option>
                      <option value="string">Text</option>
                      <option value="boolean">Yes / No</option>
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="recipe-action recipe-action--quiet"
                  onClick={() =>
                    columns.length === 1
                      ? remove("columns", "series")
                      : update(
                          "columns",
                          columns.filter((_, i) => i !== index),
                        )
                  }
                >
                  Remove column {index + 1}
                </button>
              </fieldset>
            ))}
          </div>
          <div className="catalog-form-actions">
            <button
              type="button"
              className="recipe-action recipe-action--secondary"
              disabled={columns.length >= 32}
              onClick={() =>
                update("columns", [...columns, { key: "", label: "" }])
              }
            >
              Add column
            </button>
            <button
              type="button"
              className="recipe-action recipe-action--quiet"
              onClick={() => remove("columns", "series")}
            >
              Use source columns
            </button>
          </div>
        </details>
      )}
      {!heatmap && kind !== "DataTable" && (
        <details>
          <summary>Plot labels{chart ? " and series" : ""}</summary>
          <div className="catalog-field-grid">
            {chart &&
              text(
                "xKey",
                "Horizontal data key",
                "Leave blank to use time, x, or observation order.",
              )}
            {text("xLabel", "Horizontal axis label")}
            {text("xUnit", "Horizontal axis unit")}
            {text("yLabel", "Vertical axis label")}
            {text("yUnit", "Vertical axis unit")}
          </div>
          {chart && (
            <fieldset className="catalog-field-group">
              <legend>Series to plot</legend>
              <p className="data-settings-help">
                Choose up to six numeric columns with the same unit. The
                horizontal column is excluded automatically.
              </p>
              {columns
                .filter(
                  (c) =>
                    c.type === "number" &&
                    c.key !== (draft.xKey || defaults.xKey || "x"),
                )
                .map((c) => {
                  const selected =
                    (draft.series as string[] | undefined) ??
                    columns
                      .filter(
                        (v) =>
                          v.type === "number" &&
                          v.key !== (draft.xKey || defaults.xKey || "x") &&
                          v.key !== "id",
                      )
                      .map((v) => v.key);
                  return (
                    <label className="catalog-toggle" key={c.key}>
                      <span>{c.label}</span>
                      <input
                        type="checkbox"
                        checked={selected.includes(c.key)}
                        disabled={
                          !selected.includes(c.key) && selected.length >= 6
                        }
                        onChange={(e) =>
                          update(
                            "series",
                            e.target.checked
                              ? [...selected, c.key]
                              : selected.filter((key) => key !== c.key),
                          )
                        }
                      />
                    </label>
                  );
                })}
              <button
                type="button"
                className="recipe-action recipe-action--quiet"
                onClick={() => remove("series")}
              >
                Choose series automatically
              </button>
            </fieldset>
          )}
        </details>
      )}
      {feedback && (
        <p
          id={`${id}-feedback`}
          className={`catalog-feedback catalog-feedback--${feedback.error ? "error" : "success"}`}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
      <div className="catalog-form-actions">
        <button type="submit" className="recipe-action recipe-action--primary">
          Apply display settings
        </button>
        <button
          type="button"
          className="recipe-action recipe-action--quiet"
          onClick={() => {
            setDraft(structuredClone(node.configuration));
            setFeedback(undefined);
          }}
        >
          Discard edits
        </button>
      </div>
    </form>
  );
}
