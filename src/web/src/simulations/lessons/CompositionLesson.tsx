"use client";
import "./composition-lesson.css";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { canvasNames } from "../components/contracts/composition";
import { ActionButton } from "../components/controls/ActionButton";
import { BoundControl } from "../components/controls/BoundControl";
import { OptionSelect } from "../components/controls/OptionSelect";
import { ParameterSlider } from "../components/controls/ParameterSlider";
import { ToggleControl } from "../components/controls/ToggleControl";
import { clockProperties } from "../components/registry";
import {
  CompositionCanvas,
  type CompositionCanvasProps,
} from "../components/views/CompositionCanvas";
import {
  type CompositionScene,
  propertyValue,
  type SceneObject,
  validateScene,
} from "../runtime/composition/index";
import { projectedScene } from "../runtime/composition/projectCanvas";
import { useCanvasRuntime } from "../runtime/composition/useCanvasRuntime";
import { requireRecord } from "../runtime/records";
import { measurementValue } from "./measurements";
import type { CompositionLessonInput } from "./types";

export type LessonProps = {
  document: CompositionLessonInput;
  authoring?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onCommit?: (o: SceneObject) => void;
  renderCapture?: (
    capture: () => CompositionScene,
    canvasId?: string,
  ) => ReactNode;
  prepareCommit?: (scene: CompositionScene, object: SceneObject) => SceneObject;
  hidden?: boolean;
  editor?: {
    canvasId: string;
    objectId: string;
    active: boolean;
    render: (props: CompositionCanvasProps) => ReactNode;
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
              renderCapture={
                props.renderCapture
                  ? (capture) => props.renderCapture?.(capture, canvas.id)
                  : undefined
              }
              editor={
                props.editor?.canvasId === canvas.id ? props.editor : undefined
              }
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
  renderCapture,
  hidden = false,
  editor,
  prepareCommit,
}: {
  document: CompositionLessonInput;
  authoring?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onCommit?: (o: SceneObject) => void;
  renderCapture?: LessonProps["renderCapture"];
  hidden?: boolean;
  editor?: LessonProps["editor"];
  prepareCommit?: LessonProps["prepareCommit"];
}) {
  const scene = requireRecord(doc.scene);
  const runtime = useCanvasRuntime(scene, hidden && !editor?.active);
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
    o = prepareCommit?.(scene, o) ?? o;
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
      return { accepted: true } as const;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Change rejected";
      setError(error);
      return { accepted: false, error } as const;
    }
  };
  const piece = (id: string, index: number) => {
    try {
      runtime.piece(id, index);
      setError("");
      return { accepted: true } as const;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Shading rejected";
      setError(error);
      return { accepted: false, error } as const;
    }
  };
  const controls = (slot: "primary" | "details") =>
    scene.controls
      .filter((c) => c.slot === slot)
      .map((c) => {
        const o = runtime.scene.objects.find((o) => o.id === c.target);
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
          <BoundControl
            key={c.id}
            control={c}
            value={value}
            onChange={(value) => command(c.target, c.property, value)}
            onAction={() => {
              try {
                runtime.action(c.target, c.property, c.fixed ?? {});
                setError("");
                return { accepted: true };
              } catch (e) {
                const error =
                  e instanceof Error ? e.message : "Action rejected";
                setError(error);
                return { accepted: false, error };
              }
            }}
          />
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
      {editor?.active &&
        editor.render({
          scene: runtime.scene,
          people: runtime.people,
          selected: editor.objectId,
          authoring: true,
          active: !hidden || editor.active,
          resetToken: runtime.resetToken,
          onSelect: setSelection,
          onChange: change,
          onCommit: commit,
          onPiece: piece,
        })}
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
          <CompositionCanvas
            scene={runtime.scene}
            people={runtime.people}
            selected={selected}
            authoring={authoring}
            active={!hidden}
            resetToken={runtime.resetToken}
            onSelect={choose}
            onChange={change}
            onCommit={commit}
            onPiece={piece}
          />
          {authoring && !editor?.active && (
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
              <ToggleControl
                value={runtime.playing}
                onLabel="Pause"
                offLabel="Play"
                onChange={(value) => command("clock", "playing", value)}
              />
              <ParameterSlider
                label="Time"
                value={runtime.time}
                min={clockProperties.time.min}
                max={clockProperties.time.max}
                step={clockProperties.time.step}
                onChange={(value) => command("clock", "time", value)}
              />
              <OptionSelect
                label="Playback speed"
                value={String(runtime.speed)}
                options={[0.25, 0.5, 1, 2, 4, 8].map((speed) => ({
                  id: String(speed),
                  label: `${speed}×`,
                }))}
                onChange={(value) => command("clock", "speed", Number(value))}
              />
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
          <ActionButton
            onCommand={() => {
              runtime.reset();
              setError("");
              return { accepted: true };
            }}
          >
            Reset experiment
          </ActionButton>
          {authoring && renderCapture?.(runtime.capture)}
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
