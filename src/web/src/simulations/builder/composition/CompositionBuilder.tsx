"use client";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import type {
  CompositionScene,
  SceneObject,
} from "../../runtime/composition/index";
import { canvasFor } from "../../runtime/composition/projectCanvas";
import { ComponentDialog } from "../ComponentDialog";
import {
  type ExperimentDocument,
  isRunnableDocument,
  requireRecord,
  validateRunnableDocument,
} from "../document";
import { addSceneObject, removeSceneObject } from "../editor/objectCommands";
import { cleanEditor } from "../editor/selection";
import {
  addCanvas,
  pendingConnections,
  removeCanvas,
} from "../editor/workspaceCommands";
import { compositionGraph, connectPorts } from "../graph/deriveGraph";
import { BuilderPreview } from "../preview/BuilderPreview";
import { BindingSettings } from "./BindingSettings";
import { CanvasSettings } from "./CanvasSettings";
import { CompositionGraph } from "./CompositionGraph";
import {
  type ComponentChoice,
  CompositionLibrary,
  type LibraryRequest,
} from "./CompositionLibrary";
import { ObjectSettings } from "./ObjectSettings";
import { TripSettings } from "./TripSettings";
import "./composition.css";
type Edit = (
  change: (d: ExperimentDocument) => void,
  group?: string | null,
  action?: string,
) => boolean;
export default function CompositionBuilder({
  doc,
  valid,
  edit,
  undo,
  redo,
  canUndo,
  canRedo,
  history,
  onSave,
  saving,
  error,
  notice,
  fileMenu,
  onSetup,
  expanded,
  onExpanded,
  onZoom,
}: {
  doc: ExperimentDocument;
  valid: ExperimentDocument;
  edit: Edit;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: ReactNode;
  onSave: () => void;
  saving: boolean;
  error: string;
  notice: string;
  fileMenu: ReactNode;
  onSetup: () => void;
  expanded: boolean;
  onExpanded: (v: boolean) => void;
  onZoom: (zoom: number) => void;
}) {
  const scene = requireRecord(doc.scene),
    workspace = requireRecord(scene.workspace);
  const [selected, setSelected] = useState(""),
    [tab, setTab] = useState("Connections"),
    [mobile, setMobile] = useState(false);
  const [libraryRequest, setLibraryRequest] = useState<LibraryRequest | null>(
    null,
  );
  const [feedback, setFeedback] = useState("");
  const [reveal, setReveal] = useState<{
    id: string;
    sequence: number;
  }>();
  const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const o = scene.objects.find((o) => o.id === selected),
    c = scene.controls.find((c) => c.id === selected),
    m = scene.measurements.find((m) => m.id === selected);
  const canvas = workspace.canvases.find((c) => c.id === selected),
    trip = workspace.trips.find((t) => t.id === selected);
  const editorCanvas =
    canvas ??
    (o
      ? canvasFor(scene, o.id)
      : trip?.person
        ? canvasFor(scene, trip.person)
        : undefined);
  const changeScene = (change: (s: CompositionScene) => void, group?: string) =>
    edit((d) => {
      try {
        change(requireRecord(d.scene));
        cleanPositions(d);
        setFeedback("");
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Change rejected");
        throw e;
      }
    }, group);
  const replace = (object: SceneObject, group?: string) =>
    changeScene((s) => {
      // Runtime people contain compiled trip schedules. Keep the authored trip nodes authoritative.
      const existing = s.objects.find((o) => o.id === object.id);
      const next =
        object.kind === "person" && existing?.kind === "person"
          ? { ...object, schedule: existing.schedule }
          : object;
      if (object.kind === "person")
        for (const step of object.schedule) {
          const t = requireRecord(s.workspace).trips.find(
            (t) => t.id === step.id,
          );
          if (t)
            Object.assign(t, { target: step.target, x: step.x, z: step.z });
        }
      s.objects = s.objects.map((o) => (o.id === object.id ? next : o));
    }, group);
  const openLibrary = (category = "all", target?: string) => {
    setSelected("");
    setLibraryRequest({ category, target });
  };
  useEffect(() => {
    if (
      selected &&
      selected !== "lesson" &&
      ![
        ...scene.objects,
        ...scene.controls,
        ...scene.measurements,
        ...workspace.canvases,
        ...workspace.trips,
      ].some((item) => item.id === selected)
    )
      setSelected("");
  }, [scene, workspace, selected]);
  const cleanPositions = cleanEditor;
  const add = (choice: ComponentChoice) => {
    const id = `component-${crypto.randomUUID()}`;
    edit((d) => {
      const s = requireRecord(d.scene);
      if (choice === "canvas") addCanvas(s, id);
      else if (["slider", "number", "toggle", "button"].includes(choice))
        s.controls.push({
          id,
          target: "",
          property: "",
          binding: choice === "button" ? "action" : "property",
          label:
            choice === "button"
              ? "Action button"
              : choice === "number"
                ? "Number input"
                : choice === "toggle"
                  ? "Toggle"
                  : "Slider",
          widget: choice as "slider" | "number" | "toggle" | "button",
          min: 0,
          max: 10,
          step: 0.1,
          slot: "primary",
        });
      else if (
        choice === "readout" ||
        choice === "intersection" ||
        choice === "comparison"
      )
        s.measurements.push({
          id,
          target: "",
          other: "",
          output:
            choice === "intersection"
              ? "intersection"
              : choice === "comparison"
                ? "comparison"
                : "",
          label:
            choice === "intersection"
              ? "Intersection"
              : choice === "comparison"
                ? "Comparison"
                : "Readout",
          precision: 2,
          slot: "primary",
        });
      else if (choice === "trip") {
        const person = s.objects.find(
          (o) => o.id === libraryRequest?.target && o.kind === "person",
        );
        const times = requireRecord(s.workspace)
          .trips.filter((t) => t.person === person?.id)
          .map((t) => t.at);
        const at =
          person?.kind === "person"
            ? Math.min(
                23.99,
                Math.max(
                  person.spawnAt,
                  times.length ? Math.max(...times) + 0.25 : person.spawnAt,
                ),
              )
            : 8;
        requireRecord(s.workspace).trips.push({
          id,
          label: "Scheduled trip",
          person: "",
          at,
          target: "",
          x: 5,
          z: 0,
        });
      } else addSceneObject(s, choice as SceneObject["kind"], id);
      const graph = compositionGraph(d);
      const added = requireRecord(graph.node(id));
      let x = added.x,
        y = added.y;
      const height = (n: typeof added) =>
        96 +
        Math.max(n.inputs.length, n.outputs.length, 1) * 40 +
        (n.kind === "Object" ? 48 : 0);
      while (
        graph.blocks.some(
          (n) =>
            n.id !== id &&
            x < n.x + 278 &&
            x + 278 > n.x &&
            y < n.y + height(n) + 30 &&
            y + height(added) + 30 > n.y,
        )
      ) {
        y += height(added) + 60;
        if (y + height(added) > 2900) {
          y = 80;
          x += 330;
        }
      }
      d.editor.positions[id] = { x, y };
    });
    setLibraryRequest(null);
    setSelected("");
    setReveal({ id, sequence: (reveal?.sequence ?? 0) + 1 });
  };
  const remove = (change: (s: CompositionScene) => void) => {
    edit((d) => {
      change(requireRecord(d.scene));
      cleanPositions(d);
    });
    setSelected("");
  };
  const pending = pendingConnections(scene);
  return (
    <main
      className={`manual-builder composition-builder ${expanded ? "is-expanded" : ""}`}
      data-tab={tab}
    >
      <header className="builder-toolbar composition-toolbar">
        <Link href="/experiments">← Experiments</Link>
        <h1>{doc.lesson.title || "Untitled experiment"}</h1>
        {!expanded && (
          <>
            <button type="button" onClick={onSetup}>
              Back to setup
            </button>
            <button type="button" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
            <button type="button" disabled={!canRedo} onClick={redo}>
              Redo
            </button>
            <button type="button" disabled={!!error || saving} onClick={onSave}>
              {saving
                ? "Saving…"
                : isRunnableDocument(doc)
                  ? "Save experiment"
                  : "Save draft"}
            </button>
            {history}
            {fileMenu}
          </>
        )}
        <button
          type="button"
          className="builder-primary"
          onClick={() => {
            if (!expanded) {
              try {
                validateRunnableDocument(doc);
                setFeedback("");
              } catch (e) {
                setFeedback(
                  e instanceof Error ? e.message : "Complete the lesson first",
                );
                if (!doc.lesson.title || !doc.lesson.instruction)
                  setSelected("lesson");
                return;
              }
            }
            setSelected("");
            onExpanded(!expanded);
          }}
        >
          {expanded ? "Return to builder" : "Try lesson ↗"}
        </button>
      </header>
      {(error || notice || feedback) && (
        <output
          className="composition-notice"
          role={error || feedback ? "alert" : "status"}
        >
          {error
            ? `Preview shows the last valid draft. ${error}`
            : feedback || notice}
        </output>
      )}
      {!expanded && (
        <nav
          className="builder-tabs composition-tabs"
          aria-label="Builder panels"
        >
          {["Connections", "Build"].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tab === name}
              onClick={() => {
                setTab(name);
                setSelected("");
              }}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            data-composition-add
            onClick={() => openLibrary()}
          >
            + Add component
          </button>
          <details className="composition-view-menu">
            <summary>Lesson settings</summary>
            <div>
              <button type="button" onClick={() => setSelected("lesson")}>
                Title and layout
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobile(!mobile);
                  setTab("Build");
                }}
              >
                {mobile ? "Desktop preview" : "Mobile preview"}
              </button>
            </div>
          </details>
        </nav>
      )}
      <div className="composition-workspace">
        <CompositionGraph
          doc={doc}
          selected={selected}
          onSelect={setSelected}
          onAdd={openLibrary}
          edit={edit}
          onZoom={onZoom}
          active={!expanded && tab === "Connections"}
          reveal={reveal}
        />
        <div
          className={`composition-preview ${mobile ? "is-mobile" : ""}`}
          hidden={!expanded && tab !== "Build"}
        >
          {!expanded && pending.length > 0 && (
            <p className="composition-draft-hint">
              {pending.length} connection{pending.length === 1 ? "" : "s"} to
              complete. {pending[0]}.
            </p>
          )}
          <BuilderPreview
            document={valid}
            hidden={!expanded && tab !== "Build"}
            authoring={!expanded}
            selected={selected}
            onSelect={setSelected}
            onCommit={replace}
            editor={
              editorCanvas
                ? {
                    canvasId: editorCanvas.id,
                    objectId: o?.id ?? trip?.person ?? "",
                    container: editorContainer,
                  }
                : undefined
            }
            onCapture={(current, canvasId) =>
              changeScene((s) => {
                s.objects = s.objects.map((o) => {
                  const captured = current.objects.find(
                    (item) => item.id === o.id,
                  );
                  return captured
                    ? captured.kind === "person" && o.kind === "person"
                      ? { ...captured, schedule: o.schedule }
                      : captured
                    : o;
                });
                const canvas = requireRecord(s.workspace).canvases.find(
                  (c) => c.id === canvasId,
                );
                if (canvas && current.clock) canvas.clock = current.clock;
              })
            }
          />
        </div>
      </div>
      <ComponentDialog
        open={!expanded && !!selected}
        title={
          o?.label ??
          c?.label ??
          m?.label ??
          canvas?.label ??
          trip?.label ??
          "Lesson settings"
        }
        wide={!!editorCanvas}
        onClose={() => setSelected("")}
      >
        <div
          className={`composition-component-settings ${editorCanvas ? "has-visual" : ""}`}
        >
          <div className="composition-settings-fields">
            {(error || feedback) && <p role="alert">{error || feedback}</p>}
            {o && (
              <>
                <label>
                  Display on canvas
                  <select
                    aria-label="Display on canvas"
                    value={workspace.placements[o.id] ?? ""}
                    onChange={(e) => {
                      if (!e.target.value)
                        changeScene((s) => {
                          delete requireRecord(s.workspace).placements[o.id];
                        });
                      else
                        changeScene((s) =>
                          connectPorts(
                            s,
                            { node: o.id, port: "geometry" },
                            { node: e.target.value, port: "objects" },
                          ),
                        );
                    }}
                  >
                    <option value="">Not connected</option>
                    {workspace.canvases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <ObjectSettings
                  key={o.id}
                  object={o}
                  scene={scene}
                  onChange={replace}
                  onDelete={() => remove((s) => removeSceneObject(s, o.id))}
                  onDuplicate={() => {
                    const id = `component-${crypto.randomUUID()}`;
                    changeScene((s) => {
                      if (s.objects.length >= 64)
                        throw new Error("Use at most 64 objects");
                      const copy = structuredClone(o);
                      copy.id = id;
                      copy.label = `${o.label} copy`.slice(0, 100);
                      if (copy.kind === "person") copy.schedule = [];
                      s.objects.push(copy);
                    });
                    setSelected(id);
                  }}
                />
                <div className="composition-object-actions">
                  <button
                    type="button"
                    onClick={() => openLibrary("controls", o.id)}
                  >
                    Add learner control
                  </button>
                  <button
                    type="button"
                    onClick={() => openLibrary("results", o.id)}
                  >
                    Add result
                  </button>
                  {o.kind === "person" && (
                    <button
                      type="button"
                      onClick={() => openLibrary("behaviors", o.id)}
                    >
                      Add scheduled trip
                    </button>
                  )}
                </div>
              </>
            )}
            {(c || m) && (
              <BindingSettings
                key={selected}
                binding={c ?? requireRecord(m)}
                scene={scene}
                changeScene={changeScene}
                setSelected={(id) => {
                  setSelected(id);
                }}
              />
            )}
            {canvas && (
              <CanvasSettings
                canvas={canvas}
                update={(change, group) =>
                  changeScene(
                    (s) =>
                      change(
                        requireRecord(
                          requireRecord(s.workspace).canvases.find(
                            (c) => c.id === canvas.id,
                          ),
                        ),
                      ),
                    group,
                  )
                }
                onDelete={() => remove((s) => removeCanvas(s, canvas.id))}
                onDuplicate={() => {
                  const id = `component-${crypto.randomUUID()}`;
                  changeScene((s) => {
                    const copy = addCanvas(s, id);
                    copy.label = `${canvas.label} copy`.slice(0, 100);
                    copy.settings = structuredClone(canvas.settings);
                    if (canvas.clock)
                      copy.clock = structuredClone(canvas.clock);
                  });
                  setSelected(id);
                }}
              />
            )}
            {trip && (
              <TripSettings
                trip={trip}
                scene={scene}
                changeScene={changeScene}
                onDelete={() =>
                  remove((s) => {
                    requireRecord(s.workspace).trips = requireRecord(
                      s.workspace,
                    ).trips.filter((t) => t.id !== trip.id);
                  })
                }
              />
            )}
            {selected === "lesson" && (
              <>
                {(["title", "instruction", "explanation"] as const).map(
                  (key) => (
                    <label key={key}>
                      {key === "title"
                        ? "Title"
                        : key === "instruction"
                          ? "Short instruction"
                          : "Explanation"}
                      <textarea
                        value={doc.lesson[key]}
                        maxLength={key === "explanation" ? 10000 : 150}
                        onChange={(e) =>
                          edit((d) => {
                            d.lesson[key] = e.target.value;
                          }, `lesson/${key}`)
                        }
                      />
                    </label>
                  ),
                )}
                <label>
                  Canvas arrangement
                  <select
                    value={workspace.arrangement}
                    onChange={(e) =>
                      changeScene((s) => {
                        requireRecord(s.workspace).arrangement = e.target
                          .value as "side-by-side" | "stacked";
                      })
                    }
                  >
                    <option value="side-by-side">Side by side</option>
                    <option value="stacked">Stacked</option>
                  </select>
                </label>
                {scene.kind !== "town" && (
                  <label>
                    Controls and results
                    <select
                      value={doc.presentation.layout}
                      onChange={(e) =>
                        edit((d) => {
                          d.presentation.layout = e.target.value as
                            | "right"
                            | "bottom";
                        })
                      }
                    >
                      <option value="right">Beside each canvas</option>
                      <option value="bottom">Below each canvas</option>
                    </select>
                  </label>
                )}
              </>
            )}
          </div>
          {editorCanvas && (
            <div className="composition-settings-visual">
              <h3>{editorCanvas.label}</h3>
              <div ref={setEditorContainer} />
              <p className="composition-interaction-help">
                These are starting values for the experiment.
              </p>
            </div>
          )}
          {o && !editorCanvas && (
            <p className="composition-unconnected-help">
              Connect this object to a canvas to edit it visually. You can still
              change its parameters here.
            </p>
          )}
        </div>
      </ComponentDialog>
      <CompositionLibrary
        scene={scene}
        request={libraryRequest}
        onClose={() => setLibraryRequest(null)}
        onAdd={add}
      />
    </main>
  );
}
