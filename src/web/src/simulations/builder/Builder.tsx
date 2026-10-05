"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import CompositionBuilder from "./composition/CompositionBuilder";
import {
  createDocument,
  type ExperimentDocument,
  isRunnableDocument,
  parseDocument,
  serializeDocument,
  validateDocument,
} from "./document";
import { createCanvasDocument } from "./document/canonical";
import { useDocumentHistory } from "./history/useDocumentHistory";
import {
  type DraftRecovery,
  editableDocument,
  persistDraft,
  readBuilderRecovery,
  usableEntries,
} from "./persistence/recovery";
import Setup from "./Setup";
import "./builder.css";
import {
  readLibrary,
  type SavedExperiment as Saved,
  saveEntry,
} from "./persistence/storage";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
export default function Builder() {
  const [sessionRevision, setSessionRevision] = useState(0);
  const [doc, setDoc] = useState<ExperimentDocument | null>(null);
  const [valid, setValid] = useState<ExperimentDocument | null>(null);
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftRecovery | null>(null);
  const fileMenu = useRef<HTMLDetailsElement>(null);
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
  const [playingSaved, setPlayingSaved] = useState(false);
  const { past, future, edit, undo, redo, resetHistory } = useDocumentHistory(
    doc,
    setDoc,
    setValid,
    setError,
    setNotice,
    expanded,
    playingSaved,
  );
  const open = useCallback(
    (next: ExperimentDocument, id: string | null = null, recovered = "") => {
      fileMenu.current?.removeAttribute("open");
      const convertedTown =
        next.template === "town" && Boolean(next.recipe) && !next.scene;
      resetHistory();
      setRecovery(recovered);
      next = editableDocument(next);
      setSessionRevision((revision) => revision + 1);
      setDoc(next);
      setValid(next);
      setSelected("");
      setExpanded(false);
      setPlayingSaved(false);
      setError("");
      setSaveId(id);
      setNotice(
        convertedTown
          ? "Town example converted to editable pieces. Residents now use explicit departure schedules and navigation across authored ground; the original saved copy stays intact until you save."
          : "",
      );
    },
    [resetHistory],
  );
  useEffect(() => {
    try {
      const entries = readLibrary();
      if (!Array.isArray(entries))
        throw new Error("Saved library is unreadable");
      const usable = usableEntries(entries);
      setSaved(usable);
      if (usable.length !== entries.length)
        setNotice(
          "Some saved experiments use unsupported or invalid documents. Their stored copies have been preserved.",
        );
      const recovered = readBuilderRecovery(entries);
      if (recovered.lesson) {
        open(recovered.lesson.document, recovered.lesson.id);
        setPlayingSaved(true);
        setExpanded(true);
      } else if (recovered.remix) {
        open(recovered.remix);
        window.history.replaceState(null, "", location.pathname);
      } else if (recovered.draft) setPendingDraft(recovered.draft);
    } catch (e) {
      setError(message(e));
    }
    setReady(true);
  }, [open]);
  useEffect(() => {
    if (!ready || !doc || !valid || playingSaved) return;
    try {
      persistDraft({
        document: doc,
        valid,
        selected,
        saveId,
        recovery,
      });
    } catch {
      setNotice(
        "Draft could not be stored locally. Export your experiment to keep a copy.",
      );
    }
  }, [doc, valid, ready, selected, saveId, playingSaved, recovery]);
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
      setSaved(usableEntries(entries));
      setSaveId(id);
      setNotice("Saved on this device.");
    } catch (e) {
      setNotice(`Couldn't save the experiment. ${message(e)}`);
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
      setNotice(`Couldn't export the experiment. ${message(e)}`);
    }
  };
  const importText = (text: string) => {
    try {
      open(parseDocument(text));
      setRecovery("");
    } catch (e) {
      setRecovery(text);
      setNotice(`Couldn't import the experiment. ${message(e)}`);
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
              setNotice(`Couldn't read the selected file. ${message(error)}`);
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
      const recovered = editableDocument(pendingDraft.document);
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
              if (d.authored)
                d.authored.layout.kind = layout === "bottom" ? "stack" : "grid";
            });
          } else {
            if (setupOpen && !(await preserveCurrentDraft())) return;
            open(createCanvasDocument(canvas, layout));
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
      current
        ? {
            ...current,
            editor: { ...current.editor, zoom },
            ...(current.authored
              ? {
                  authored: {
                    ...current.authored,
                    editor: { ...current.editor, zoom },
                  },
                }
              : {}),
          }
        : current,
    );
    setValid((current) =>
      current
        ? {
            ...current,
            editor: { ...current.editor, zoom },
            ...(current.authored
              ? {
                  authored: {
                    ...current.authored,
                    editor: { ...current.editor, zoom },
                  },
                }
              : {}),
          }
        : current,
    );
  };
  if (doc.authored && valid.authored)
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
        saveState={
          saveId &&
          saved.some(
            (entry) =>
              entry.id === saveId &&
              JSON.stringify(entry.document.authored) ===
                JSON.stringify(doc.authored),
          )
            ? "Saved on this device"
            : "Unsaved changes"
        }
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
  return (
    <p role="alert">
      This document could not be converted to an editable composition.
    </p>
  );
}
