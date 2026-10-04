"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getExperimentContext } from "../runtime/session";
import { useTownStore } from "../runtime/townSession";
import { ComponentDialog } from "./ComponentDialog";
import { type ComponentCategory, ComponentLibrary } from "./ComponentLibrary";
import { ConnectionWorkspace } from "./ConnectionWorkspace";
import { canvasCatalog } from "./catalog";
import CompositionBuilder from "./composition/CompositionBuilder";
import { composeLegacy } from "./composition/migration";
import { upgradeWorkspace } from "./composition/workspace";
import { templates } from "./descriptors";
import {
  addObject,
  type ControlRecord,
  controlFor,
  createBlankDocument,
  createDocument,
  deleteBlock,
  type ExperimentDocument,
  initialParameters,
  isRunnableDocument,
  parseDocument,
  type ResultRecord,
  removeObject,
  requireRecipe,
  requireRecord,
  resultFor,
  serializeDocument,
  setInitial,
  validateDocument,
  validateRunnableDocument,
} from "./document";
import { describeEdit, type HistoryEntry, isTextEditing } from "./history";
import { LessonSession } from "./Lesson";
import { LessonSettings } from "./LessonSettings";
import Setup from "./Setup";
import "./builder.css";
import {
  DRAFT_KEY as DRAFT,
  readLibrary,
  type SavedExperiment as Saved,
  saveEntry,
} from "./storage";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
export default function Builder() {
  const [sessionRevision, setSessionRevision] = useState(0);
  const [doc, setDoc] = useState<ExperimentDocument | null>(null);
  const [valid, setValid] = useState<ExperimentDocument | null>(null);
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Connections");
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    document: ExperimentDocument;
    valid: ExperimentDocument;
    selected?: string;
    saveId?: string;
    recovery?: string;
  } | null>(null);
  const [libraryCategory, setLibraryCategory] =
    useState<ComponentCategory>("all");
  const openLibrary = (category: ComponentCategory = "all") => {
    setSelected("");
    setLibraryCategory(category);
    setLibraryOpen(true);
  };
  const editingGroup = useRef<string | null>(null);
  const fileMenu = useRef<HTMLDetailsElement>(null);
  const [startingOpen, setStartingOpen] = useState(false);
  useEffect(() => {
    if (selected !== "object") setStartingOpen(false);
  }, [selected]);
  useEffect(() => {
    const closeOutside = (e: PointerEvent) => {
      if (e.target instanceof Node && !fileMenu.current?.contains(e.target))
        fileMenu.current?.removeAttribute("open");
    };
    const closeEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") fileMenu.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const storageBusy = useRef(false);
  const [recovery, setRecovery] = useState("");
  const [presentationWires, setPresentationWires] = useState(false);
  const [port, setPort] = useState<string | null>(null);
  const [playingSaved, setPlayingSaved] = useState(false);
  const open = useCallback(
    (next: ExperimentDocument, id: string | null = null, recovered = "") => {
      fileMenu.current?.removeAttribute("open");
      const convertedTown =
        next.template === "town" && Boolean(next.recipe) && !next.scene;
      editingGroup.current = null;
      setRecovery(recovered);
      next = composeLegacy(next);
      if (next.scene) upgradeWorkspace(next.scene);
      validateDocument(next);
      setSessionRevision((revision) => revision + 1);
      setDoc(next);
      setValid(next);
      setPast([]);
      setFuture([]);
      setSelected("");
      setTab("Connections");
      setExpanded(false);
      setPlayingSaved(false);
      setLibraryOpen(false);
      setError("");
      setSaveId(id);
      setNotice(
        convertedTown
          ? "Town example converted to editable pieces. Residents now use explicit departure schedules and navigation across authored ground; the original saved copy stays intact until you save."
          : "",
      );
      setPort(null);
    },
    [],
  );
  useEffect(() => {
    try {
      const entries = readLibrary();
      if (!Array.isArray(entries))
        throw new Error("Saved library is unreadable");
      const usable = entries.filter((entry) => {
        try {
          validateDocument(entry.document);
          return typeof entry.id === "string";
        } catch {
          return false;
        }
      });
      setSaved(usable);
      if (usable.length !== entries.length)
        setNotice(
          "Some saved experiments use unsupported or invalid documents. Their stored copies have been preserved.",
        );
      const params = new URLSearchParams(location.search);
      const lesson = params.get("lesson");
      const entry = usable.find((e) => e.id === lesson);
      if (lesson && !entry)
        throw new Error(
          "This saved lesson is unavailable on this device. Import its experiment JSON to open it here.",
        );
      if (entry) {
        validateRunnableDocument(entry.document);
        open(entry.document, entry.id);
        setPlayingSaved(true);
        setExpanded(true);
      } else if (params.has("remix")) {
        const source = sessionStorage.getItem("apertus-builder-remix");
        if (source) {
          open(parseDocument(source));
          window.history.replaceState(null, "", location.pathname);
        } else
          throw new Error(
            "No remix recipe was supplied. Choose a template or import a recipe.",
          );
      } else {
        const raw = localStorage.getItem(DRAFT);
        if (raw) {
          const draft = JSON.parse(raw);
          validateDocument(draft.valid);
          setPendingDraft(draft);
        }
      }
    } catch (e) {
      setError(message(e));
    }
    setReady(true);
  }, [open]);
  useEffect(() => {
    if (!ready || !doc || !valid || playingSaved) return;
    try {
      localStorage.setItem(
        DRAFT,
        JSON.stringify({ document: doc, valid, selected, saveId, recovery }),
      );
    } catch {
      setNotice(
        "Draft could not be stored locally. Export your experiment to keep a copy.",
      );
    }
  }, [doc, valid, ready, selected, saveId, playingSaved, recovery]);
  const activateEdit = (next: ExperimentDocument) => {
    setDoc(next);
    try {
      validateDocument(next);
      setValid(next);
      setError("");
    } catch (e) {
      setError(message(e));
    }
  };
  const edit = (
    change: (next: ExperimentDocument) => void,
    group: string | null = null,
    action?: string,
  ) => {
    if (!doc) return false;
    try {
      const next = structuredClone(doc);
      change(next);
      if (JSON.stringify(next) === JSON.stringify(doc)) return false;
      if (!group || editingGroup.current !== group)
        setPast((p) => [
          ...p.slice(-99),
          {
            id: crypto.randomUUID(),
            document: doc,
            label: action ?? describeEdit(doc, next),
          },
        ]);
      editingGroup.current = group;
      setFuture([]);
      activateEdit(next);
      setNotice("");
      return true;
    } catch (e) {
      setNotice(message(e));
      return false;
    }
  };
  const undo = () => {
    editingGroup.current = null;
    if (!doc || !past.length) return;
    const entry = past[past.length - 1];
    setFuture((f) => [
      { id: entry.id, document: doc, label: entry.label },
      ...f,
    ]);
    activateEdit({
      ...entry.document,
      editor: { ...entry.document.editor, zoom: doc.editor.zoom },
    });
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    editingGroup.current = null;
    if (!doc || !future.length) return;
    setPast((p) => [
      ...p.slice(-99),
      { id: future[0].id, document: doc, label: future[0].label },
    ]);
    activateEdit({
      ...future[0].document,
      editor: { ...future[0].document.editor, zoom: doc.editor.zoom },
    });
    setFuture((f) => f.slice(1));
  };
  const keyboardHistory = useRef({ undo, redo, enabled: false });
  keyboardHistory.current = {
    undo,
    redo,
    enabled: Boolean(doc) && !playingSaved && !expanded,
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !keyboardHistory.current.enabled ||
        isTextEditing(event.target) ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      )
        return;
      const value = event.key.toLowerCase();
      if (value === "z" || value === "y") {
        event.preventDefault();
        if (value === "y" || event.shiftKey) keyboardHistory.current.redo();
        else keyboardHistory.current.undo();
      }
    };
    const endEditGroup = () => {
      editingGroup.current = null;
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerup", endEditGroup);
    window.addEventListener("focusout", endEditGroup);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerup", endEditGroup);
      window.removeEventListener("focusout", endEditGroup);
    };
  }, []);
  const history = (
    <details className="builder-action-history">
      <summary>Action history ({past.length})</summary>
      <div>
        <p>
          {past.length || future.length
            ? "Undo: Ctrl/⌘ Z · Redo: Ctrl/⌘ Shift Z or Ctrl Y"
            : "Your editing actions appear here."}
        </p>
        <ol>
          {past.map((entry) => (
            <li key={entry.id}>{entry.label}</li>
          ))}
          {future.map((entry) => (
            <li key={entry.id} className="is-undone">
              {entry.label} (undone)
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
  const add = (kind: "control" | "result", capability: string) => {
    const id = `${kind}-${crypto.randomUUID()}`;
    edit((d) => {
      if (kind === "control")
        d.presentation.controls.push(controlFor(d, capability, id));
      else d.presentation.results.push(resultFor(d, capability, id));
    });
    setSelected(id);
    setLibraryOpen(false);
  };
  const save = async () => {
    if (!doc || storageBusy.current) return;
    storageBusy.current = true;
    setSaving(true);
    try {
      const id = saveId ?? crypto.randomUUID();
      const entries = await saveEntry(
        { id, document: doc },
        saved.find((entry) => entry.id === id),
      );
      setSaved(
        entries.filter((entry) => {
          try {
            validateDocument(entry.document);
            return typeof entry.id === "string";
          } catch {
            return false;
          }
        }),
      );
      setSaveId(id);
      setNotice("Saved on this device.");
    } catch (e) {
      setNotice(message(e));
    } finally {
      storageBusy.current = false;
      setSaving(false);
    }
  };
  const download = () => {
    if (!doc) return;
    try {
      const url = URL.createObjectURL(
        new Blob([serializeDocument(doc)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "experiment.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setNotice(message(e));
    }
  };
  const importText = (text: string) => {
    try {
      open(parseDocument(text));
      setRecovery("");
    } catch (e) {
      setRecovery(text);
      setNotice(message(e));
    }
  };
  const importField = (
    <label className="builder-import">
      Import experiment or recipe
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              importText(await file.text());
            } catch (error) {
              setNotice(message(error));
            }
          }
          e.target.value = "";
        }}
      />
    </label>
  );
  const library = saved.length > 0 && (
    <section className="builder-library">
      <h2>Saved on this device</h2>
      {saved.map((entry) => (
        <div key={entry.id}>
          <button
            type="button"
            onClick={() => open(entry.document, entry.id, entry.recovery)}
          >
            Open {entry.document.lesson.title || "Untitled experiment"}
          </button>{" "}
          {isRunnableDocument(entry.document) && (
            <a href={`/experiments/builder?lesson=${entry.id}`}>Try lesson ↗</a>
          )}
        </div>
      ))}
    </section>
  );
  // Preserve a recoverable copy before starting over or replacing the canvas.
  const preserveCurrentDraft = async () => {
    if (!doc || !valid) return true;
    if (storageBusy.current) return false;
    storageBusy.current = true;
    try {
      // A recovery copy never overwrites an explicitly saved lesson.
      const backup: Saved = {
        id: crypto.randomUUID(),
        document: valid,
        recovery: error ? JSON.stringify(doc, null, 2) : recovery,
      };
      await saveEntry(backup);
      setSaved((previous) => [...previous, backup]);
      return true;
    } catch (e) {
      setNotice(`Your draft could not be preserved. ${message(e)}`);
      return false;
    } finally {
      storageBusy.current = false;
    }
  };
  if (!ready) return <p>Opening builder…</p>;
  const resumeDraft = () => {
    if (!pendingDraft) return;
    open(pendingDraft.valid, pendingDraft.saveId ?? null);
    setRecovery(pendingDraft.recovery ?? "");
    try {
      validateDocument(pendingDraft.document);
      const recovered = composeLegacy(pendingDraft.document);
      if (recovered.scene) upgradeWorkspace(recovered.scene);
      validateDocument(recovered);
      setDoc(recovered);
      setValid(recovered);
    } catch {
      setRecovery(JSON.stringify(pendingDraft.document, null, 2));
      setNotice(
        "Recovered your last valid draft. The incomplete copy is available for repair.",
      );
    }
    setSelected(pendingDraft.selected ?? "");
  };
  if (!doc || !valid || setupOpen)
    return (
      <Setup
        initial={setupOpen && doc ? doc : undefined}
        onCancel={setupOpen ? () => setSetupOpen(false) : undefined}
        feedback={(error || notice) && <p role="alert">{error || notice}</p>}
        onTemplate={(id) => open(createDocument(id))}
        onCreate={async (canvas, layout) => {
          if (setupOpen && doc && canvas === doc.template) {
            edit((d) => {
              d.presentation.layout = layout;
            });
          } else {
            if (setupOpen && !(await preserveCurrentDraft())) return;
            open(createBlankDocument(canvas, layout));
          }
          setSetupOpen(false);
        }}
      >
        {!setupOpen && pendingDraft && (
          <section className="setup-resume">
            <h2>Your unfinished experiment</h2>
            <p>
              {pendingDraft.document.lesson?.title || "Untitled experiment"}
            </p>
            <button type="button" onClick={resumeDraft}>
              Continue draft
            </button>
          </section>
        )}
        <details className="setup-secondary">
          <summary>Open or import an experiment</summary>
          {importField}
          {library}
        </details>
        {recovery && (
          <section>
            <textarea
              aria-label="Recover imported document"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
            />
            <button type="button" onClick={() => importText(recovery)}>
              Retry import
            </button>
          </section>
        )}
      </Setup>
    );
  const setWorkspaceZoom = (zoom: number) => {
    if (!Number.isFinite(zoom) || zoom < 0.2 || zoom > 2) return;
    // Camera navigation is editor metadata, not a lesson edit or an undo step.
    setDoc((current) =>
      current ? { ...current, editor: { ...current.editor, zoom } } : current,
    );
    setValid((current) =>
      current ? { ...current, editor: { ...current.editor, zoom } } : current,
    );
  };
  if (doc.scene && valid.scene)
    return (
      <CompositionBuilder
        key={`${sessionRevision}/${doc.template}`}
        doc={doc}
        valid={valid}
        edit={edit}
        undo={undo}
        redo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        history={history}
        onSave={save}
        saving={saving}
        error={error}
        notice={notice}
        onSetup={() => setSetupOpen(true)}
        onZoom={setWorkspaceZoom}
        expanded={expanded}
        onExpanded={(value) => {
          setExpanded(value);
          if (playingSaved && !value) {
            setPlayingSaved(false);
            window.history.replaceState(null, "", location.pathname);
          }
        }}
        fileMenu={
          <details className="builder-file-menu" ref={fileMenu}>
            <summary>Experiment</summary>
            <div>
              <button
                type="button"
                onClick={async () => {
                  if (!(await preserveCurrentDraft())) return;
                  setDoc(null);
                  setValid(null);
                  setPendingDraft({
                    document: doc,
                    valid,
                    saveId: saveId ?? undefined,
                  });
                  setSelected("");
                }}
              >
                New experiment
              </button>
              <button
                type="button"
                onClick={download}
                disabled={Boolean(error)}
              >
                Export JSON
              </button>
              {importField}
              {library}
              {recovery && (
                <>
                  <textarea
                    aria-label="Recover imported document"
                    value={recovery}
                    onChange={(e) => setRecovery(e.target.value)}
                  />
                  <button type="button" onClick={() => importText(recovery)}>
                    Retry import
                  </button>
                </>
              )}
            </div>
          </details>
        }
      />
    );
  const t = templates[doc.template];
  const controls = doc.presentation.controls;
  const results = doc.presentation.results;
  const control = controls.find((c) => c.id === selected);
  const result = results.find((r) => r.id === selected);
  const updateControl = (change: Partial<ControlRecord>) =>
    edit((d) =>
      Object.assign(
        requireRecord(d.presentation.controls.find((c) => c.id === selected)),
        change,
      ),
    );
  const updateResult = (change: Partial<ResultRecord>) =>
    edit((d) =>
      Object.assign(
        requireRecord(d.presentation.results.find((r) => r.id === selected)),
        change,
      ),
    );
  const parameter = (key: string, value: unknown) => {
    edit((d) => setInitial(d, key, value));
    setNotice("Starting configuration changed; the valid preview restarts.");
  };
  const starts = initialParameters(valid);
  const capture = () => {
    const current = getExperimentContext()?.instances[0]?.parameters;
    if (!current) return;
    if (doc.template === "town")
      current.playing = useTownStore.getState().playing;
    edit((d) => {
      if (d.template === "fractions") setInitial(d, "bars", current.bars);
      else
        for (const cap of Object.values(templates[d.template].controls))
          if (cap.parameter && Object.hasOwn(current, cap.parameter))
            setInitial(d, cap.parameter, current[cap.parameter]);
    });
    setNotice(
      "Copied supported editable parameters into starting values. The preview restarts if configuration changed.",
    );
  };
  const connect = (target: string) => {
    if (!port) return;
    const source = controls.find((c) => c.id === port);
    if (source && target.startsWith("action:"))
      edit((d) => {
        const old = requireRecord(
          d.presentation.controls.find((c) => c.id === port),
        );
        d.presentation.controls[d.presentation.controls.indexOf(old)] =
          controlFor(d, target.slice(7), old.id);
      });
    else if (port.startsWith("output:") && results.some((r) => r.id === target))
      edit((d) =>
        Object.assign(
          requireRecord(d.presentation.results.find((r) => r.id === target)),
          resultFor(d, port.slice(7), target),
        ),
      );
    else {
      setNotice(
        "Incompatible connection. Actions accept controls; read-only data outputs connect to results. Choose a compatible destination below.",
      );
      return;
    }
    setNotice("Connection updated.");
    setPort(null);
  };
  const order = (direction: number) =>
    edit((d) => {
      const list = control ? d.presentation.controls : d.presentation.results;
      const index = list.findIndex((c) => c.id === selected);
      const to = index + direction;
      if (to >= 0 && to < list.length)
        [list[index], list[to]] = [list[to], list[index]];
    });
  const inspector = (
    <section
      key={selected}
      className="builder-inspector"
      aria-label="Selected block settings"
    >
      <button
        className="inspector-close"
        type="button"
        onClick={() => setSelected("")}
        aria-label="Close settings"
      >
        ×
      </button>
      {selected === "controls" && (
        <>
          <h2>Controls</h2>
          {controls.length ? (
            controls.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
              >
                {c.label}
              </button>
            ))
          ) : (
            <p>
              No controls yet. Add an object, then choose a learner control.
            </p>
          )}
          <button type="button" onClick={() => openLibrary("control")}>
            Add control
          </button>
        </>
      )}
      {selected === "results" && (
        <>
          <h2>Results</h2>
          {results.length ? (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
              >
                {r.label}
              </button>
            ))
          ) : (
            <p>No results yet. Choose a measurement after adding an object.</p>
          )}
          <button type="button" onClick={() => openLibrary("result")}>
            Add result
          </button>
        </>
      )}
      {!["controls", "results"].includes(selected) && (
        <h2>
          {control?.label ??
            result?.label ??
            (selected === "object"
              ? canvasCatalog[doc.template].object
              : selected === "view" || selected === "layout"
                ? "Canvas settings"
                : "Lesson")}
        </h2>
      )}
      {selected === "lesson" && (
        <LessonSettings
          lesson={doc.lesson}
          example={t.instruction}
          onChange={(field, value) =>
            edit((d) => {
              d.lesson[field] = value;
            }, `lesson:${field}`)
          }
          onEndEdit={() => {
            editingGroup.current = null;
          }}
        />
      )}
      {selected === "object" && !doc.recipe && (
        <>
          <p>Your canvas has no object yet.</p>
          <button type="button" onClick={() => openLibrary("object")}>
            Add an object
          </button>
        </>
      )}
      {selected === "object" && doc.recipe && (
        <>
          <p>{canvasCatalog[doc.template].contents}</p>
          <h3>Learner controls</h3>
          <div className="object-additions">
            {Object.entries(t.controls).map(([key, cap]) => (
              <button
                type="button"
                key={key}
                onClick={() => add("control", key)}
              >
                Add {cap.label}
              </button>
            ))}
          </div>
          <h3>Measurements</h3>
          <div className="object-additions">
            {Object.entries(t.outputs).map(([key, output]) => (
              <button
                type="button"
                key={key}
                onClick={() => add("result", key)}
              >
                Show {output.label}
              </button>
            ))}
          </div>
          <details
            open={startingOpen}
            onToggle={(e) => setStartingOpen(e.currentTarget.open)}
          >
            <summary>Starting values</summary>
            <p className="field-help">
              These values define the beginning of the lesson. Changing them
              restarts the preview.
            </p>
            {Object.entries(t.controls)
              .filter(([, cap]) => cap.parameter)
              .map(([key, cap]) => (
                <div key={key}>
                  <label htmlFor={`initial-${key}`}>
                    Initial {cap.label}
                    {cap.widget === "toggle" ? (
                      <input
                        id={`initial-${key}`}
                        type="checkbox"
                        checked={Boolean(
                          doc.recipe?.parameters[
                            requireRecord(cap.parameter)
                          ] ??
                            (doc.template === "line"
                              ? requireRecord(
                                  doc.recipe?.assembly?.instances[0],
                                ).parameters[requireRecord(cap.parameter)]
                              : starts[requireRecord(cap.parameter)]),
                        )}
                        onChange={(e) =>
                          parameter(
                            requireRecord(cap.parameter),
                            e.target.checked,
                          )
                        }
                      />
                    ) : cap.choices ? (
                      <select
                        id={`initial-${key}`}
                        value={Number(
                          doc.recipe?.parameters[
                            requireRecord(cap.parameter)
                          ] ??
                            (doc.template === "line"
                              ? requireRecord(
                                  doc.recipe?.assembly?.instances[0],
                                ).parameters[requireRecord(cap.parameter)]
                              : starts[requireRecord(cap.parameter)]),
                        )}
                        onChange={(e) =>
                          parameter(
                            requireRecord(cap.parameter),
                            Number(e.target.value),
                          )
                        }
                      >
                        {cap.choices.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`initial-${key}`}
                        type="number"
                        min={cap.min}
                        max={cap.max}
                        step={cap.step}
                        value={Number(
                          doc.recipe?.parameters[
                            requireRecord(cap.parameter)
                          ] ??
                            (doc.template === "line"
                              ? requireRecord(
                                  doc.recipe?.assembly?.instances[0],
                                ).parameters[requireRecord(cap.parameter)]
                              : starts[requireRecord(cap.parameter)]),
                        )}
                        onChange={(e) =>
                          parameter(
                            requireRecord(cap.parameter),
                            Number(e.target.value),
                          )
                        }
                      />
                    )}
                  </label>
                </div>
              ))}
            {doc.template === "fractions" &&
              (["A", "B"] as const).map((name, i) => (
                <fieldset key={name}>
                  <legend>Starting bar {name}</legend>
                  {["n", "d"].map((key) => (
                    <label key={key}>
                      {key === "n" ? "Shaded parts" : "Total parts"}
                      <input
                        type="number"
                        min={key === "n" ? 0 : 1}
                        max={12}
                        value={Number(
                          ((doc.recipe?.parameters.bars as
                            | Record<string, number>[]
                            | undefined) ??
                            (starts.bars as Record<string, number>[]))[i][key],
                        )}
                        onChange={(e) =>
                          edit((d) => {
                            const bars = structuredClone(
                              (requireRecipe(d).parameters.bars ??
                                starts.bars) as Record<string, number>[],
                            );
                            bars[i][key] = Number(e.target.value);
                            setInitial(d, "bars", bars);
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
          </details>
          <details>
            <summary>Remove object</summary>
            <p>
              This also removes its connected controls and results. You can undo
              this change.
            </p>
            <button
              type="button"
              onClick={() => {
                edit(removeObject);
                setSelected("");
              }}
            >
              Remove object and connections
            </button>
          </details>
        </>
      )}
      {(selected === "view" || selected === "layout") && (
        <>
          <label>
            Learner layout
            <select
              value={doc.presentation.layout}
              onChange={(e) =>
                edit((d) => {
                  d.presentation.layout = e.target
                    .value as ExperimentDocument["presentation"]["layout"];
                })
              }
            >
              {doc.template === "town" ? (
                <option value="floating">▣ Full scene + floating panel</option>
              ) : (
                <>
                  <option value="right">▥ Scene + right panel</option>
                  <option value="bottom">▤ Scene + bottom panel</option>
                </>
              )}
            </select>
          </label>
          <p>Renderer: {t.group}. Block positions affect only the editor.</p>
          {doc.template === "gas" && (
            <label>
              <input
                type="checkbox"
                checked={doc.presentation.particles}
                onChange={(e) =>
                  edit((d) => {
                    d.presentation.particles = e.target.checked;
                  })
                }
              />
              Show representative particles
            </label>
          )}
          {doc.template === "fractions" && (
            <label>
              <input
                type="checkbox"
                checked={doc.presentation.directShading}
                onChange={(e) =>
                  edit((d) => {
                    d.presentation.directShading = e.target.checked;
                  })
                }
              />
              Allow direct shading
            </label>
          )}
          {doc.template === "town" && (
            <label>
              Starting camera
              <select
                value={doc.presentation.camera}
                onChange={(e) =>
                  edit((d) => {
                    d.presentation.camera = e.target.value as
                      | "overview"
                      | "close";
                  })
                }
              >
                <option value="overview">Town overview</option>
                <option value="close">Closer view</option>
              </select>
            </label>
          )}
          {doc.template === "town" && (
            <p>
              Orbit and zoom in the scene. Reset camera restores the authored
              camera preset without changing model time.
            </p>
          )}
        </>
      )}
      {control && (
        <>
          <label>
            Label
            <input
              value={control.label}
              onChange={(e) => updateControl({ label: e.target.value })}
            />
          </label>
          <details>
            <summary>Connection</summary>
            <label>
              Action connection
              <select
                aria-label="Action connection"
                value={control.capability}
                onChange={(e) =>
                  edit((d) => {
                    d.presentation.controls[
                      d.presentation.controls.findIndex(
                        (c) => c.id === selected,
                      )
                    ] = controlFor(d, e.target.value, selected);
                  })
                }
              >
                {Object.entries(t.controls).map(([key, cap]) => (
                  <option key={key} value={key}>
                    {cap.label}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Target: {t.name} ·{" "}
              {t.controls[control.capability].parameter
                ? `Reads accepted ${t.controls[control.capability].label.toLowerCase()}`
                : "Validated button action"}
            </p>
          </details>
          {control.min !== undefined && (
            <>
              <label>
                Widget
                <select
                  value={control.widget}
                  onChange={(e) =>
                    updateControl({
                      widget: e.target.value as ControlRecord["widget"],
                    })
                  }
                >
                  <option value="slider">Slider</option>
                  <option value="number">Numeric input</option>
                </select>
              </label>
              <details>
                <summary>Range and starting value</summary>
                {(["min", "max", "step"] as const).map((key) => (
                  <label key={key}>
                    {key === "min"
                      ? "Minimum"
                      : key === "max"
                        ? "Maximum"
                        : "Step"}
                    <input
                      type="number"
                      step="any"
                      value={control[key]}
                      onChange={(e) =>
                        updateControl({ [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
                <p>
                  Start:{" "}
                  {String(
                    initialParameters(valid)[
                      requireRecord(t.controls[control.capability].parameter)
                    ],
                  )}{" "}
                  {t.controls[control.capability].unit}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelected("object");
                    setStartingOpen(true);
                  }}
                >
                  Edit starting values
                </button>
              </details>
            </>
          )}
          {control.fixed !== undefined && (
            <>
              <label>
                Bar
                <select
                  value={(control.fixed as { bar: number }).bar}
                  onChange={(e) =>
                    updateControl({
                      fixed: {
                        ...(control.fixed as object),
                        bar: Number(e.target.value),
                      },
                    })
                  }
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                </select>
              </label>
              <label>
                Split factor
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={(control.fixed as { factor: number }).factor}
                  onChange={(e) =>
                    updateControl({
                      fixed: {
                        ...(control.fixed as object),
                        factor: Number(e.target.value),
                      },
                      label: `Split ${(control.fixed as { bar: number }).bar === 0 ? "A" : "B"} ×${e.target.value}`,
                    })
                  }
                />
              </label>
            </>
          )}
        </>
      )}
      {result && (
        <>
          <label>
            Label
            <input
              value={result.label}
              onChange={(e) => updateResult({ label: e.target.value })}
            />
          </label>
          <label>
            Data connection
            <select
              aria-label="Data connection"
              value={result.output}
              onChange={(e) =>
                edit((d) =>
                  Object.assign(
                    requireRecord(
                      d.presentation.results.find((r) => r.id === selected),
                    ),
                    resultFor(d, e.target.value, selected),
                  ),
                )
              }
            >
              {Object.entries(t.outputs).map(([key, cap]) => (
                <option value={key} key={key}>
                  {cap.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Decimal places
            <input
              type="number"
              min={0}
              max={6}
              value={result.precision}
              onChange={(e) =>
                updateResult({ precision: Number(e.target.value) })
              }
            />
          </label>
          <p>Read-only · Unit: {result.unit || "none"}</p>
        </>
      )}
      {(control || result) && (
        <>
          <label>
            Placement
            <select
              aria-label="Placement"
              value={(control ?? result)?.slot}
              onChange={(e) =>
                control
                  ? updateControl({
                      slot: e.target.value as "primary" | "details",
                    })
                  : updateResult({
                      slot: e.target.value as "primary" | "details",
                    })
              }
            >
              <option value="primary">Main panel</option>
              <option value="details">More settings</option>
            </select>
          </label>
          <div>
            <button type="button" onClick={() => order(-1)}>
              Move earlier
            </button>
            <button type="button" onClick={() => order(1)}>
              Move later
            </button>
          </div>
          <button
            type="button"
            aria-label="Delete block and its connections"
            onClick={() => {
              edit((d) => deleteBlock(d, selected));
              setSelected("");
            }}
          >
            Remove component
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
  return (
    <main
      className={`manual-builder ${expanded ? "manual-builder--expanded" : ""}`}
      data-tab={tab}
      data-inspector={false}
    >
      <header className="builder-toolbar">
        <Link href="/experiments">← Experiments</Link>
        <h1>{doc.lesson.title || "Untitled experiment"}</h1>
        {!expanded && (
          <>
            <button
              className="builder-desktop-action"
              type="button"
              onClick={() => setSetupOpen(true)}
            >
              Back to setup
            </button>
            <button
              className="builder-desktop-action"
              type="button"
              onClick={undo}
              disabled={!past.length}
            >
              Undo
            </button>
            <button
              className="builder-desktop-action"
              type="button"
              onClick={redo}
              disabled={!future.length}
            >
              Redo
            </button>
            <button
              type="button"
              onClick={save}
              disabled={Boolean(error) || saving}
              aria-busy={saving}
              aria-label={
                doc.recipe &&
                doc.lesson.title &&
                doc.lesson.instruction &&
                controls.some((c) => c.capability === "reset")
                  ? "Save experiment"
                  : "Save draft"
              }
            >
              <span className="builder-wide-label">
                {doc.recipe &&
                doc.lesson.title &&
                doc.lesson.instruction &&
                controls.some((c) => c.capability === "reset")
                  ? "Save experiment"
                  : "Save draft"}
              </span>
              <span className="builder-small-label">Save</span>
            </button>
            {history}
            <details className="builder-file-menu" ref={fileMenu}>
              <summary aria-label="Experiment menu">
                <span className="builder-wide-label">Experiment</span>
                <span className="builder-small-label">More</span>
              </summary>
              <div>
                <div className="builder-mobile-actions">
                  <button type="button" onClick={() => setSetupOpen(true)}>
                    Back to setup
                  </button>
                  <button type="button" onClick={undo} disabled={!past.length}>
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!future.length}
                  >
                    Redo
                  </button>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await preserveCurrentDraft())) return;
                    setError("");
                    setNotice("");
                    setRecovery("");
                    setDoc(null);
                    setValid(null);
                    setPendingDraft({
                      document: doc,
                      valid,
                      selected,
                      saveId: saveId ?? undefined,
                      recovery,
                    });
                    setSelected("");
                    setPort(null);
                  }}
                >
                  New experiment
                </button>

                <button
                  type="button"
                  onClick={download}
                  disabled={Boolean(error)}
                >
                  Export JSON
                </button>
                {importField}
                {library}
              </div>
            </details>
          </>
        )}
        <button
          className="builder-primary"
          type="button"
          onClick={() => {
            if (!expanded) {
              try {
                validateRunnableDocument(doc);
              } catch (e) {
                setNotice(message(e));
                setSelected(
                  !doc.recipe
                    ? ""
                    : !doc.lesson.title || !doc.lesson.instruction
                      ? "lesson"
                      : "controls",
                );
                return;
              }
            }
            setExpanded(!expanded);
            if (playingSaved) {
              setPlayingSaved(false);
              window.history.replaceState(null, "", location.pathname);
            }
          }}
        >
          {expanded ? "Return to builder" : "Try lesson ↗"}
        </button>
      </header>
      {(notice || error) && (
        <output className="builder-notice">
          {error ? `Preview shows the last valid version. ${error}` : notice}
        </output>
      )}
      {!expanded && (
        <nav className="builder-tabs" aria-label="Builder panels">
          {["Connections", "Build"].map((name) => (
            <button
              type="button"
              aria-pressed={tab === name}
              key={name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            aria-label="+ Add component"
            onClick={(event) => {
              event.currentTarget.focus();
              openLibrary();
            }}
          >
            <span className="builder-wide-label">+ Add component</span>
            <span className="builder-small-label">+ Add</span>
          </button>
          <div className="builder-settings-nav">
            <button
              type="button"
              aria-pressed={selected === "lesson"}
              onClick={() => setSelected(selected === "lesson" ? "" : "lesson")}
            >
              Lesson
            </button>
            <button
              type="button"
              aria-pressed={selected === "view"}
              onClick={() => setSelected(selected === "view" ? "" : "view")}
            >
              Layout
            </button>
            <button
              type="button"
              aria-pressed={selected === "controls"}
              onClick={() =>
                setSelected(selected === "controls" ? "" : "controls")
              }
            >
              Controls ({controls.length})
            </button>
            <button
              type="button"
              aria-pressed={selected === "results"}
              onClick={() =>
                setSelected(selected === "results" ? "" : "results")
              }
            >
              Results ({results.length})
            </button>
          </div>
          <details className="builder-mobile-settings">
            <summary>Settings</summary>
            <div>
              <button
                type="button"
                onClick={(e) => {
                  setSelected("lesson");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Lesson
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setSelected("view");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Layout
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setSelected("controls");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Controls ({controls.length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setSelected("results");
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                Results ({results.length})
              </button>
            </div>
          </details>
        </nav>
      )}
      <ComponentLibrary
        open={libraryOpen}
        category={libraryCategory}
        template={doc.template}
        hasObject={Boolean(doc.recipe)}
        onClose={() => setLibraryOpen(false)}
        onAddObject={() => {
          edit(addObject);
          setLibraryOpen(false);
          setSelected("object");
          setNotice(
            `Added ${canvasCatalog[doc.template].object.toLowerCase()}. Choose controls and results individually.`,
          );
        }}
        onAdd={add}
      />
      <div className="builder-layout">
        <ConnectionWorkspace
          doc={doc}
          selected={selected}
          setSelected={setSelected}
          presentationWires={presentationWires}
          setPresentationWires={setPresentationWires}
          port={port}
          setPort={setPort}
          connect={connect}
          onAdd={(kind) => openLibrary(kind)}
          active={tab === "Connections" && !expanded}
          onZoom={setWorkspaceZoom}
          edit={edit}
        />
        <div className="builder-preview-column">
          <section className="builder-preview" aria-label="Live preview">
            <header>
              <strong>{expanded ? "Try lesson" : "Live preview"}</strong>
              <button
                type="button"
                aria-pressed={!mobile}
                onClick={() => setMobile(false)}
              >
                Desktop
              </button>
              <button
                type="button"
                aria-pressed={mobile}
                onClick={() => setMobile(true)}
              >
                Mobile
              </button>
            </header>
            <div
              className={`builder-preview-surface ${mobile ? "is-mobile" : ""}`}
            >
              <LessonSession
                document={valid}
                onSelect={
                  expanded
                    ? undefined
                    : (id) => {
                        if (id === "add-object") openLibrary("object");
                        else if (id === "add-control") openLibrary("control");
                        else if (id === "add-result") openLibrary("result");
                        else {
                          setSelected(id);
                          setTab("Build");
                        }
                      }
                }
              />
            </div>
            {!expanded && doc.recipe && (
              <button type="button" onClick={capture}>
                Use current settings as starting values
              </button>
            )}
          </section>
        </div>
        <ComponentDialog
          open={!expanded && Boolean(selected)}
          title={
            control?.label ??
            result?.label ??
            (selected === "object"
              ? canvasCatalog[doc.template].object
              : selected === "view" || selected === "layout"
                ? "Canvas settings"
                : "Lesson settings")
          }
          onClose={() => setSelected("")}
        >
          {inspector}
        </ComponentDialog>
      </div>
      {!expanded && recovery && (
        <section className="builder-recovery">
          <h2>Recover incomplete draft</h2>
          <textarea
            aria-label="Incomplete draft JSON"
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
          />
          <button type="button" onClick={() => importText(recovery)}>
            Validate and open draft
          </button>
          <button type="button" onClick={() => setRecovery("")}>
            Dismiss recovered copy
          </button>
        </section>
      )}
    </main>
  );
}
