"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type ExperimentDocument, requireRecord } from "../document";
import { CartesianScene } from "./CartesianScene";
import { DisplayScene } from "./DisplayScene";
import { canvasNames } from "./definitions";
import { measurementValue } from "./measurements";
import {
  type CompositionScene,
  propertyValue,
  type SceneObject,
  validateScene,
} from "./model";
import { authoredDisplayCommit } from "./runtimeState";
import { useSceneRuntime } from "./useSceneRuntime";
import { projectedScene } from "./workspace";

const TownScene = dynamic(() => import("./TownScene"), {
  ssr: false,
  loading: () => <p>Loading 3D scene…</p>,
});
type LessonProps = {
  document: ExperimentDocument;
  authoring?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onCommit?: (o: SceneObject) => void;
  onCapture?: (scene: CompositionScene, canvasId?: string) => void;
  hidden?: boolean;
  editor?: {
    canvasId: string;
    objectId: string;
    container: HTMLElement | null;
  };
};
export function CompositionLesson(props: LessonProps) {
  const scene = requireRecord(props.document.scene);
  if (!scene.workspace) return <SingleCompositionLesson {...props} />;
  return (
    <section
      className="composition-multi-lesson"
      hidden={props.hidden}
      aria-label={props.authoring ? "Live preview" : "Learner experiment"}
    >
      {props.document.lesson.instruction && (
        <p className="composition-instruction">
          {props.document.lesson.instruction}
        </p>
      )}
      {!scene.workspace.canvases.length && (
        <div className="composition-build-empty">
          <h2>Add a canvas to begin</h2>
          <p>
            In Connections, add a {canvasNames[scene.kind]}, then connect the
            pieces you want it to display.
          </p>
        </div>
      )}
      <div className={`composition-canvases is-${scene.workspace.arrangement}`}>
        {scene.workspace.canvases.map((canvas) => (
          <article
            className="composition-canvas-panel"
            key={canvas.id}
            aria-label={canvas.label}
          >
            <header>
              <h2>{canvas.label}</h2>
              {props.authoring && (
                <button
                  type="button"
                  onClick={() => props.onSelect?.(canvas.id)}
                >
                  Edit canvas
                </button>
              )}
            </header>
            <SingleCompositionLesson
              {...props}
              hidden={props.hidden}
              document={{
                ...props.document,
                scene: projectedScene(scene, canvas),
                lesson: { ...props.document.lesson, instruction: "" },
              }}
              onCapture={(current) => props.onCapture?.(current, canvas.id)}
              editorContainer={
                props.editor?.canvasId === canvas.id
                  ? props.editor.container
                  : null
              }
              editorObject={props.editor?.objectId}
            />
          </article>
        ))}
      </div>
      {props.document.lesson.explanation && (
        <details>
          <summary>Explanation</summary>
          <p>{props.document.lesson.explanation}</p>
        </details>
      )}
    </section>
  );
}
function SingleCompositionLesson({
  document: doc,
  authoring = false,
  selected: externalSelected = "",
  onSelect,
  onCommit,
  onCapture,
  hidden = false,
  editorContainer,
  editorObject = "",
}: {
  document: ExperimentDocument;
  authoring?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onCommit?: (o: SceneObject) => void;
  onCapture?: (scene: CompositionScene) => void;
  hidden?: boolean;
  editorContainer?: HTMLElement | null;
  editorObject?: string;
}) {
  const scene = requireRecord(doc.scene);
  const runtime = useSceneRuntime(scene, hidden && !editorContainer);
  const [selection, setSelection] = useState(""),
    [error, setError] = useState("");
  const selected =
    authoring && scene.objects.some((o) => o.id === externalSelected)
      ? externalSelected
      : selection;
  useEffect(() => {
    if (selection && !scene.objects.some((o) => o.id === selection))
      setSelection("");
  }, [scene.objects, selection]);
  const choose = (id: string) => {
    setSelection(id);
  };
  const change = (o: SceneObject) => {
    try {
      runtime.replace(o);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change rejected");
    }
  };
  const commit = (o: SceneObject) => {
    if (!authoring) return;
    o = authoredDisplayCommit(scene, o);
    try {
      validateScene(
        {
          ...scene,
          objects: scene.objects.map((item) => (item.id === o.id ? o : item)),
        },
        doc.template,
      );
      onCommit?.(o);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change rejected");
    }
  };
  const command = (
    target: string,
    property: string,
    value: number | boolean,
  ) => {
    try {
      runtime.command(target, property, value);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change rejected");
    }
  };
  const controls = (slot: "primary" | "details") =>
    scene.controls
      .filter((c) => c.slot === slot)
      .map((c) => {
        const o = runtime.scene.objects.find((o) => o.id === c.target);
        if (c.widget === "button")
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                try {
                  runtime.action(c.target, c.property, c.fixed ?? {});
                  setError("");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Action rejected");
                }
              }}
            >
              {c.label}
            </button>
          );
        const value =
          c.target === "clock"
            ? c.property === "time"
              ? runtime.time
              : c.property === "playing"
                ? runtime.playing
                : runtime.speed
            : o
              ? propertyValue(o, c.property)
              : 0;
        return (
          <label
            key={c.id}
            className="composition-learner-control"
            htmlFor={`learner-${c.id}`}
          >
            {c.label}
            {c.widget === "toggle" ? (
              <input
                aria-label={c.label}
                id={`learner-${c.id}`}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) =>
                  command(c.target, c.property, e.target.checked)
                }
              />
            ) : (
              <>
                <input
                  aria-label={c.label}
                  id={`learner-${c.id}`}
                  type={c.widget === "slider" ? "range" : "number"}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={Number(value)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (next < c.min || next > c.max || e.target.value === "") {
                      setError(
                        `${c.label}: enter a value between ${c.min} and ${c.max}`,
                      );
                      return;
                    }
                    command(c.target, c.property, next);
                  }}
                />
                <output>
                  {Number(Number(value).toFixed(3))}
                  {c.unit ? ` ${c.unit}` : null}
                </output>
              </>
            )}
          </label>
        );
      });
  const results = (slot: "primary" | "details") =>
    scene.measurements
      .filter((m) => m.slot === slot)
      .map((m) => {
        const value = measurementValue(
          m,
          runtime.scene,
          runtime.people,
          runtime.time,
        );
        return (
          <div key={m.id} className="composition-readout">
            <span>{m.label}</span>
            <output aria-label={m.label}>
              {typeof value === "number"
                ? Number(value.toFixed(m.precision))
                : value}
              {m.unit ? ` ${m.unit}` : null}
            </output>
          </div>
        );
      });
  return (
    <section
      className={`composition-lesson composition-lesson--${doc.presentation.layout}`}
      aria-label={authoring ? "Live preview" : "Learner experiment"}
      hidden={hidden}
    >
      {editorContainer &&
        createPortal(
          <section
            className="component-visual-editor"
            aria-label="Edit on connected canvas"
          >
            {scene.kind === "cartesian" ? (
              <CartesianScene
                scene={runtime.scene}
                selected={editorObject}
                authoring
                onSelect={setSelection}
                onChange={change}
                onCommit={commit}
              />
            ) : scene.kind === "physical" || scene.kind === "diagram" ? (
              <DisplayScene
                scene={runtime.scene}
                selected={editorObject}
                authoring
                active={!hidden || !!editorContainer}
                resetToken={runtime.resetToken}
                onSelect={setSelection}
                onChange={change}
                onCommit={commit}
                onPiece={(id, i) => {
                  try {
                    runtime.piece(id, i);
                    setError("");
                    return { accepted: true };
                  } catch (e) {
                    const error =
                      e instanceof Error ? e.message : "Shading rejected";
                    setError(error);
                    return { accepted: false, error };
                  }
                }}
              />
            ) : (
              <TownScene
                scene={runtime.scene}
                people={runtime.people}
                selected={editorObject}
                authoring
                onSelect={setSelection}
                onChange={change}
                onCommit={commit}
              />
            )}
            <p className="composition-interaction-help">
              Drag the selected object's handles to change its starting
              geometry. Sliders and dragging edit the same object.
            </p>
          </section>,
          editorContainer,
        )}
      {doc.lesson.instruction && (
        <p className="composition-instruction">{doc.lesson.instruction}</p>
      )}
      <div className="composition-lesson-body">
        <div className="composition-scene">
          {authoring && onSelect && (
            <button
              type="button"
              className="composition-edit-selection"
              style={{ visibility: selected ? "visible" : "hidden" }}
              disabled={!selected}
              aria-hidden={!selected}
              onClick={() => onSelect(selected)}
            >
              Edit selected component
            </button>
          )}
          {scene.kind === "cartesian" ? (
            <CartesianScene
              scene={runtime.scene}
              selected={selected}
              authoring={authoring}
              onSelect={choose}
              onChange={change}
              onCommit={commit}
            />
          ) : scene.kind === "physical" || scene.kind === "diagram" ? (
            <DisplayScene
              scene={runtime.scene}
              selected={selected}
              authoring={authoring}
              active={!hidden}
              resetToken={runtime.resetToken}
              onSelect={choose}
              onChange={change}
              onCommit={commit}
              onPiece={(id, i) => {
                try {
                  runtime.piece(id, i);
                  setError("");
                  return { accepted: true };
                } catch (e) {
                  const error =
                    e instanceof Error ? e.message : "Shading rejected";
                  setError(error);
                  return { accepted: false, error };
                }
              }}
            />
          ) : (
            <TownScene
              scene={runtime.scene}
              people={runtime.people}
              selected={selected}
              authoring={authoring}
              onSelect={choose}
              onChange={change}
              onCommit={commit}
            />
          )}
          {authoring && !editorContainer && (
            <p className="composition-interaction-help">
              {scene.kind === "cartesian"
                ? "Select a line or square to drag its handles. Arrow keys move point handles. Settings provide precise values. Drag the background to pan; Ctrl/⌘ + scroll zooms. Line width stays constant while the preview resizes."
                : scene.kind !== "town"
                  ? "Use the top edge to move an object, or its corner handle to resize it. Arrow keys also move handles. Drag the background to pan."
                  : "Drag buildings, roads, and people to place them. Drag empty space to orbit; scroll to zoom. Unspawned people appear as ghosts while editing."}
            </p>
          )}
        </div>
        <aside
          className="composition-learner-panel"
          data-empty={
            scene.kind !== "town" &&
            !scene.controls.length &&
            !scene.measurements.length
          }
          aria-label="Lesson controls and results"
        >
          {scene.kind === "town" && (
            <div className="composition-playback">
              <output aria-label="Simulation time">
                {Math.floor(runtime.time).toString().padStart(2, "0")}:
                {Math.floor((runtime.time % 1) * 60)
                  .toString()
                  .padStart(2, "0")}
              </output>
              <button
                type="button"
                onClick={() => command("clock", "playing", !runtime.playing)}
              >
                {runtime.playing ? "Pause" : "Play"}
              </button>
              <label>
                Time
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.05}
                  value={runtime.time}
                  onChange={(e) =>
                    command("clock", "time", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Playback speed
                <select
                  aria-label="Playback speed"
                  value={runtime.speed}
                  onChange={(e) =>
                    command("clock", "speed", Number(e.target.value))
                  }
                >
                  {[0.25, 0.5, 1, 2, 4, 8].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}×
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Times are departures. People wait after arrival. The scene
                repeats at midnight.
              </p>
            </div>
          )}
          {controls("primary")}
          {results("primary")}
          {(scene.controls.some((c) => c.slot === "details") ||
            scene.measurements.some((m) => m.slot === "details") ||
            doc.lesson.explanation) && (
            <details>
              <summary>More settings and explanation</summary>
              {controls("details")}
              {results("details")}
              {doc.lesson.explanation && <p>{doc.lesson.explanation}</p>}
            </details>
          )}
          <button
            type="button"
            onClick={() => {
              runtime.reset();
              setError("");
            }}
          >
            Reset experiment
          </button>
          {authoring && onCapture && (
            <button
              type="button"
              onClick={() => {
                const captured = structuredClone(runtime.scene);
                if (captured.clock) {
                  captured.clock.start = runtime.time;
                  captured.clock.playing = runtime.playing;
                  captured.clock.speed = runtime.speed;
                }
                onCapture(captured);
              }}
            >
              Use current settings as starting values
            </button>
          )}
          {runtime.people.some((person) => person.status === "no route") && (
            <output>
              No route for{" "}
              {runtime.people
                .filter((person) => person.status === "no route")
                .map(
                  (person) =>
                    scene.objects.find((o) => o.id === person.id)?.label,
                )
                .join(", ")}
              . Check spawn points, destinations, ground bounds, and obstacles.
            </output>
          )}
          {error && <p role="alert">{error}</p>}
        </aside>
      </div>
    </section>
  );
}
