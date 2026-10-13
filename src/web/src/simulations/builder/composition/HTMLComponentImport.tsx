"use client";
import "../../creation-and-editing/simulation/recipe/imported-component.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { schemaDefault } from "../../registry/contracts/defaults";
import {
  hasArray,
  ImportedValueForm,
} from "../../legacy/components/controls/ImportedValueForm";
import type { CompositeRecipe } from "../../creation-and-editing/authoring-engine/document";
import {
  type Diagnostic,
  declarationsSchema,
  defaults,
  diagnostic,
  inputValues,
  inspectSource,
  type VerificationReport,
} from "../../creation-and-editing/runtime-engine/imported/contract";
import { htmlRecipe } from "../../creation-and-editing/authoring-engine/compatibility/importedRecipe";
import { ComponentRunner } from "../../creation-and-editing/runtime-engine/imported/runner";
import { repairBrief, verifyComponent } from "../../creation-and-editing/validator/imported";
import type { ComponentCatalog } from "./useComponentCatalog";

export function HTMLComponentImport({
  source,
  catalog,
  onReveal,
}: {
  source: string;
  catalog: ComponentCatalog;
  onReveal: (recipe: CompositeRecipe) => void;
}) {
  const manifest = useMemo(() => inspectSource(source), [source]);
  const [inputs, setInputs] = useState(() => defaults(manifest.inputs));
  const [settings, setSettings] = useState(() => defaults(manifest.settings));
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [outputs, setOutputs] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [width, setWidth] = useState(640);
  const frame = useRef<HTMLDivElement>(null);
  const runner = useRef<ComponentRunner | null>(null);
  const previewTime = useRef(0);
  const [revision, setRevision] = useState(0);
  let needsInputs = "";
  try {
    inputValues(manifest, inputs);
  } catch (e) {
    needsInputs = diagnostic(e).message;
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: Revision explicitly restarts verification; width changes use resize requests.
  useEffect(() => {
    previewTime.current = 0;
    setReport(null);
    setError("");
    setOutputs({});
    const host = frame.current;
    if (!host || needsInputs) return;
    const abort = new AbortController();
    const diagnostics: Diagnostic[] = [];
    const context = {
      settings,
      inputs: inputValues(manifest, inputs),
      viewport: {
        width: host.clientWidth,
        height: 360,
        pixelRatio: window.devicePixelRatio,
      },
    };
    const createRunner = () =>
      new ComponentRunner(
        host,
        source,
        manifest,
        (value) => {
          if (!abort.signal.aborted) setOutputs(value);
        },
        (d) => {
          if (abort.signal.aborted) return;
          d.reproduction = {
            request: d.reproduction ?? null,
            settings: settings as never,
            inputs: context.inputs as never,
          };
          diagnostics.push(d);
          setError(d.message);
          setReport((previous) =>
            previous
              ? { ...previous, status: "failed", diagnostics: [...diagnostics] }
              : previous,
          );
        },
      );
    const instance = createRunner();
    runner.current = instance;
    verifyComponent(
      source,
      instance,
      context,
      abort.signal,
      diagnostics,
      () => {
        const fresh = createRunner();
        runner.current = fresh;
        return fresh;
      },
    ).then((result) => {
      if (!abort.signal.aborted)
        setReport({ ...result, diagnostics: [...result.diagnostics] });
    });
    return () => {
      abort.abort();
      runner.current?.close();
      runner.current = null;
    };
  }, [source, manifest, inputs, settings, revision, needsInputs]);
  useEffect(() => {
    if (!running || !manifest.clock) return;
    let cancelled = false;
    const advance = async () => {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (cancelled) break;
        previewTime.current += 0.05;
        try {
          await runner.current?.request("step", {
            time: previewTime.current,
            delta: 0.05,
          });
        } catch {
          setRunning(false);
          break;
        }
      }
    };
    void advance();
    return () => {
      cancelled = true;
    };
  }, [running, manifest.clock]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setError("Copied instructions.");
    } catch {
      setError(
        "Clipboard unavailable. Select and copy the report in Technical details.",
      );
    }
  };
  return (
    <section
      className="html-component-import"
      aria-label="Preview imported HTML component"
    >
      <h4>{manifest.name}</h4>
      <p>{manifest.description}</p>
      {needsInputs && <output>{needsInputs}</output>}
      {!!Object.keys(manifest.inputs).length && (
        <ImportedValueForm
          schema={declarationsSchema(manifest.inputs)}
          initial={{
            ...(hasArray(declarationsSchema(manifest.inputs))
              ? {}
              : (schemaDefault(declarationsSchema(manifest.inputs)) as object)),
            ...inputs,
          }}
          label="Preview inputs"
          submitLabel="Apply inputs"
          onSubmit={(value) => {
            setRunning(false);
            setReport(null);
            setInputs(value as Record<string, unknown>);
            return { accepted: true };
          }}
        />
      )}
      <div
        ref={frame}
        data-frame-title={`Preview ${manifest.name}`}
        style={{ width: "100%", maxWidth: width, height: 360, border: 0 }}
      />
      <div className="catalog-inline-actions">
        <button
          type="button"
          onClick={() => {
            const next = width === 640 ? 320 : 640;
            setWidth(next);
            runner.current
              ?.request("resize", {
                width: next,
                height: 360,
                pixelRatio: window.devicePixelRatio,
              })
              .catch(() => {});
          }}
        >
          {width === 640 ? "Try narrow size" : "Try normal size"}
        </button>
        {manifest.clock && (
          <button
            type="button"
            disabled={report?.status !== "passed"}
            onClick={() => setRunning(!running)}
          >
            {running ? "Pause" : "Run preview"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setRevision((value) => value + 1);
          }}
        >
          Restart checks
        </button>
      </div>
      {error && <output>{error}</output>}
      <output aria-live="polite">
        {needsInputs
          ? "Supply inputs to begin."
          : !report
            ? "Checking component…"
            : report.status === "passed"
              ? "Technical checks passed. Try the component before saving."
              : "Component needs fixing. Your file is retained."}
      </output>
      {report?.status === "failed" && (
        <button type="button" onClick={() => void copy(repairBrief(report))}>
          Copy fixes for AI
        </button>
      )}
      {!!Object.keys(manifest.settings).length && (
        <details>
          <summary>Component settings</summary>
          <ImportedValueForm
            schema={declarationsSchema(manifest.settings)}
            initial={settings}
            label="Settings"
            submitLabel="Apply settings"
            onSubmit={(value) => {
              setRunning(false);
              setReport(null);
              setSettings(value as Record<string, unknown>);
              return { accepted: true };
            }}
          />
        </details>
      )}
      {!!Object.keys(manifest.actions).length && (
        <details>
          <summary>Try actions</summary>
          {Object.entries(manifest.actions).map(([name, action]) => (
            <ImportedValueForm
              key={name}
              schema={action.arguments}
              initial={
                hasArray(action.arguments)
                  ? {}
                  : schemaDefault(action.arguments)
              }
              label={action.description}
              submitLabel={name}
              onSubmit={(value) => {
                if (!runner.current || report?.status !== "passed")
                  return {
                    accepted: false,
                    error: "Finish technical checks before trying actions.",
                  };
                runner.current
                  .request("action", { name, arguments: value })
                  .then(() => {
                    setReport((previous) =>
                      previous
                        ? {
                            ...previous,
                            checks: previous.checks.map((check) =>
                              check.id === `manual-action:${name}`
                                ? { ...check, status: "passed" }
                                : check,
                            ),
                          }
                        : previous,
                    );
                  })
                  .catch(() => {});
                return { accepted: true };
              }}
            />
          ))}
        </details>
      )}
      <details>
        <summary>Outputs and technical details</summary>
        <pre>{JSON.stringify(outputs, null, 2)}</pre>
        <textarea
          aria-label="Verification report"
          readOnly
          rows={8}
          value={report ? repairBrief(report) : "Checks have not completed."}
        />
      </details>
      <button
        type="button"
        className="builder-primary"
        disabled={saving || report?.status !== "passed"}
        onClick={async () => {
          setRunning(false);
          setSaving(true);
          try {
            const recipe = htmlRecipe(source, inputs, settings);
            const result = await catalog.importRecipe(
              JSON.stringify(recipe),
              catalog.allRecipes.some((r) => r.id === recipe.id),
            );
            if (result.recipe) onReveal(result.recipe);
            else setError(result.error?.body ?? "Could not save component.");
          } catch (e) {
            setError(diagnostic(e).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Saving…" : "Save component to library"}
      </button>
    </section>
  );
}
