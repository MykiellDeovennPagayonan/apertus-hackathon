"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { FractionBuilderScene } from "../components/views/FractionBuilderScene";
import { LineGraph } from "../components/views/math-foundations/AssemblyView";
import { GasContainerVisual } from "../components/visuals/GasContainerVisual";
import { GasParticleVisual } from "../components/visuals/GasParticleVisual";
import { useAssemblyStore } from "../runtime/assemblySession";
import { useGasStore } from "../runtime/gasSession";
import { useMathStore } from "../runtime/mathSession";
import { resolveRecipe } from "../runtime/resolver";
import {
  activateSession,
  dispatchCommand,
  disposeSession,
} from "../runtime/session";
import { useTownStore } from "../runtime/townSession";
import { templates } from "./descriptors";
import {
  type ControlRecord,
  type ExperimentDocument,
  requireRecipe,
} from "./document";
import "./builder.css";
import { CompositionLesson } from "./composition/CompositionLesson";
import "./composition/composition.css";
const TownView = dynamic(() => import("../components/views/ThreeWorldView"), {
  ssr: false,
  loading: () => <p>Loading town…</p>,
});

/** This owner remains mounted when preview size or editor visibility changes. */
export function LessonSession(props: {
  document: ExperimentDocument;
  onSelect?: (id: string) => void;
}) {
  return props.document.scene ? (
    <CompositionLesson {...props} />
  ) : (
    <LegacyLessonSession {...props} />
  );
}
function LegacyLessonSession({
  document: doc,
  onSelect,
}: {
  document: ExperimentDocument;
  onSelect?: (id: string) => void;
}) {
  const recipeText = JSON.stringify(doc.recipe);
  const [activeRecipe, setActiveRecipe] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (recipeText === "null") {
      disposeSession();
      setActiveRecipe("");
      return;
    }
    try {
      const recipe = JSON.parse(recipeText);
      const resolved = resolveRecipe(recipe);
      activateSession(resolved.demo, resolved, recipe);
      setActiveRecipe(recipeText);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview activation failed");
    }
  }, [recipeText]);
  useEffect(() => () => disposeSession(), []);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {!doc.recipe && (
        <section className="builder-empty" aria-label="Empty canvas">
          <div
            className={`empty-canvas-art empty-canvas-art--${doc.template}`}
            aria-hidden="true"
          />
          <h2>Your canvas is ready</h2>
          <p>
            Add your first object. Then choose the controls and results your
            learner needs.
          </p>
          {onSelect && (
            <button type="button" onClick={() => onSelect("add-object")}>
              Add your first component
            </button>
          )}
        </section>
      )}
      {doc.recipe && activeRecipe === recipeText && (
        <AuthoredLesson document={doc} onSelect={onSelect} />
      )}
    </>
  );
}

/** Production learner renderer, shared by editing, Try lesson, and saved document playback. */
export function AuthoredLesson({
  document: doc,
  onSelect,
}: {
  document: ExperimentDocument;
  onSelect?: (id: string) => void;
}) {
  const surface = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!surface.current) return;
    const observer = new ResizeObserver((entries) =>
      setCompact(entries[0].contentRect.width < 700),
    );
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, []);
  const gas = useGasStore();
  const math = useMathStore();
  const assembly = useAssemblyStore();
  const town = useTownStore();
  const [feedback, setFeedback] = useState("");
  const [cameraVersion, setCameraVersion] = useState(0);
  const template = templates[doc.template];
  const assumptions = useMemo(
    () => resolveRecipe(requireRecipe(doc)).assumptions,
    [doc],
  );
  const demo =
    doc.template === "fractions"
      ? "fraction-builder"
      : doc.template === "line"
        ? "assembly"
        : doc.template;
  const parameters: Record<string, unknown> =
    doc.template === "gas"
      ? (gas.inputs as unknown as Record<string, unknown>)
      : doc.template === "town"
        ? { time: town.time, speed: town.speed, playing: town.playing }
        : doc.template === "line"
          ? (assembly.instances[0]?.state ?? {})
          : {};
  const outputs: Record<string, unknown> =
    doc.template === "gas"
      ? { ...gas.metrics }
      : doc.template === "town"
        ? {
            time: town.time,
            traveling: town.citizens.filter((c) => c.status === "traveling")
              .length,
          }
        : doc.template === "line"
          ? (assembly.instances[0]?.outputs ?? {})
          : math.board.demo === "fraction-builder"
            ? {
                relation: `${math.board.bars[0].value.n}/${math.board.bars[0].value.d} ${math.board.relation} ${math.board.bars[1].value.n}/${math.board.bars[1].value.d}`,
              }
            : {};
  const send = (c: ControlRecord, value?: unknown) => {
    const cap = template.controls[c.capability];
    if (
      typeof value === "number" &&
      c.min !== undefined &&
      (value < c.min || value > (c.max ?? c.min) || !Number.isFinite(value))
    ) {
      setFeedback(`${c.label}: enter a value from ${c.min} to ${c.max}.`);
      return;
    }
    const result = dispatchCommand(demo, {
      type: cap.action,
      target: c.target,
      ...(value !== undefined ? { value } : {}),
    });
    setFeedback(result.accepted ? "" : result.error);
  };
  const control = (c: ControlRecord) => {
    const cap = template.controls[c.capability];
    const value = parameters[cap.parameter ?? ""];
    return (
      <div className="authored-control" key={c.id}>
        {onSelect && (
          <button
            className="edit-component"
            type="button"
            aria-label={`Edit ${c.label}`}
            onClick={() => onSelect(c.id)}
          >
            Edit
          </button>
        )}
        {c.widget === "button" ? (
          <button type="button" onClick={() => send(c, c.fixed)}>
            {c.label}
          </button>
        ) : (
          <label htmlFor={`learner-${c.id}`}>
            {c.label}
            {c.widget === "slider" && (
              <output>
                {" "}
                {Number(value).toFixed(2)} {cap.unit}
              </output>
            )}
            {c.widget === "toggle" ? (
              <input
                id={`learner-${c.id}`}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => send(c, e.target.checked)}
              />
            ) : c.widget === "select" ? (
              <select
                id={`learner-${c.id}`}
                value={Number(value)}
                onChange={(e) => send(c, Number(e.target.value))}
              >
                {cap.choices?.map((v) => (
                  <option value={v} key={v}>
                    {v}
                    {cap.unit}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`learner-${c.id}`}
                aria-label={c.label}
                type={c.widget === "slider" ? "range" : "number"}
                min={c.min}
                max={c.max}
                step={c.step}
                value={Number(value ?? 0)}
                onChange={(e) => send(c, Number(e.target.value))}
              />
            )}
          </label>
        )}
      </div>
    );
  };
  const results = (slot: "primary" | "details") =>
    doc.presentation.results
      .filter((r) => r.slot === slot)
      .map((r) => (
        <output className="authored-result" aria-label={r.label} key={r.id}>
          {onSelect && (
            <button
              className="edit-component"
              type="button"
              aria-label={`Edit ${r.label}`}
              onClick={() => onSelect(r.id)}
            >
              Edit
            </button>
          )}
          <span>{r.label}</span>
          <strong>
            {doc.template === "town" && r.output === "time"
              ? `${String(Math.floor(Number(outputs.time)) % 24).padStart(2, "0")}:${String(Math.floor((Number(outputs.time) % 1) * 60)).padStart(2, "0")}`
              : typeof outputs[r.output] === "number"
                ? (outputs[r.output] as number).toFixed(r.precision)
                : String(outputs[r.output] ?? "—")}{" "}
            {r.unit === "1" || (doc.template === "town" && r.output === "time")
              ? ""
              : r.unit}
          </strong>
        </output>
      ));
  return (
    <article
      ref={surface}
      className={`authored-lesson authored-lesson--${doc.presentation.layout}`}
    >
      {doc.lesson.instruction ? (
        <div className="authored-instruction-row">
          <p className="authored-instruction">{doc.lesson.instruction}</p>
          {onSelect && (
            <button
              type="button"
              className="edit-component"
              onClick={() => onSelect("lesson")}
            >
              Edit instruction
            </button>
          )}
        </div>
      ) : (
        onSelect && (
          <button
            className="edit-component"
            type="button"
            onClick={() => onSelect("lesson")}
          >
            Add a short instruction
          </button>
        )
      )}
      <div className="authored-body">
        <div className="authored-scene">
          {onSelect && (
            <button
              className="inspect-object"
              type="button"
              onClick={() => onSelect("object")}
            >
              Edit object
            </button>
          )}
          {doc.template === "gas" && (
            <svg
              viewBox="0 0 600 290"
              role="img"
              aria-label="Gas container with representative particles"
            >
              <GasContainerVisual volume={gas.inputs.volume}>
                {doc.presentation.particles &&
                  gas.particles.map((p) => (
                    <GasParticleVisual
                      key={p.id}
                      particle={p}
                      volume={gas.inputs.volume}
                    />
                  ))}
              </GasContainerVisual>
            </svg>
          )}
          {doc.template === "fractions" &&
            math.board.demo === "fraction-builder" && (
              <FractionBuilderScene
                board={math.board}
                compact={compact}
                interactive={doc.presentation.directShading}
              />
            )}
          {doc.template === "line" && assembly.instances.length > 0 && (
            <LineGraph instances={assembly.instances} />
          )}
          {doc.template === "town" && (
            <>
              <div className="authored-town">
                <TownView
                  key={`${cameraVersion}-${doc.presentation.camera}`}
                  cameraPreset={doc.presentation.camera}
                />
              </div>
              <button
                type="button"
                onClick={() => setCameraVersion((v) => v + 1)}
              >
                Reset camera
              </button>
            </>
          )}
        </div>
        <section
          className="authored-panel"
          hidden={
            !onSelect &&
            !doc.presentation.controls.some((c) => c.slot === "primary") &&
            !doc.presentation.results.some((r) => r.slot === "primary")
          }
          aria-label="Lesson controls and results"
        >
          {!doc.presentation.controls.some((c) => c.slot === "primary") &&
            !doc.presentation.results.some((r) => r.slot === "primary") &&
            onSelect && (
              <div className="authored-panel-empty">
                <strong>What should your learner change or observe?</strong>
                <p>Choose a control or measurement for this panel.</p>
              </div>
            )}
          {results("primary")}
          {doc.presentation.controls
            .filter((c) => c.slot === "primary")
            .map(control)}
          {onSelect && (
            <div className="authored-additions">
              <button type="button" onClick={() => onSelect("add-control")}>
                Add control
              </button>
              <button type="button" onClick={() => onSelect("add-result")}>
                Add result
              </button>
            </div>
          )}
          <output className="lesson-feedback">{feedback}</output>
        </section>
      </div>
      {(doc.presentation.controls.some((c) => c.slot === "details") ||
        doc.presentation.results.some((r) => r.slot === "details")) && (
        <details className="authored-details">
          <summary>More settings</summary>
          <div className="authored-details-grid">
            {doc.presentation.controls
              .filter((c) => c.slot === "details")
              .map(control)}
            {results("details")}
          </div>
        </details>
      )}
      {(doc.lesson.explanation || assumptions.length > 0) && (
        <details className="authored-details">
          <summary>How this experiment works</summary>
          {doc.lesson.explanation && <p>{doc.lesson.explanation}</p>}
          {assumptions.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </details>
      )}
    </article>
  );
}
