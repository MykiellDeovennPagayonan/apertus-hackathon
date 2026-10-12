"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOffline } from "../../app/_components/DeploymentProvider";
import LoadingState from "../../app/_components/LoadingState";
import PublishDialog from "../../app/_components/PublishDialog";
import UnsavedDialog from "../../app/_components/UnsavedDialog";
import {
  getProject,
  getPublication,
  listProjects,
  saveProject,
} from "../../lib/projects/client";
import { unwrapPortable } from "../../lib/projects/portable";
import type {
  Project,
  ProjectSummary,
  ProjectType,
} from "../../lib/projects/types";
import { builtInRecipe } from "../components/composites/catalog";
import type { CompositeRecipe } from "../runtime/authoring/types";
import { parseRecipe } from "../runtime/recipes/schema";
import { BuilderIcon } from "./BuilderIcon";
import { ComponentDialog } from "./ComponentDialog";
import CompositionBuilder from "./composition/CompositionBuilder";
import { contentFingerprint } from "./composition/constructionPreview";
import {
  type ExperimentDocument,
  isRunnableDocument,
  parseDocument,
  serializeDocument,
} from "./document";
import { createFreshDocument } from "./document/canonical";
import { planInsertion } from "./editor/insertionPlan";
import { useDocumentHistory } from "./history/useDocumentHistory";
import { RecipeRepository } from "./library/RecipeRepository";
import {
  editableDocument,
  persistDraft,
  readBuilderRecovery,
  usableEntries,
} from "./persistence/recovery";
import "./builder.css";
import {
  loadLibrary,
  type SavedExperiment as Saved,
  saveEntry,
} from "./persistence/storage";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";
export default function Builder() {
  const offline = useOffline();
  const { data: account } = useSession();
  const ownerId = account?.user.id;
  const params = useSearchParams();
  const router = useRouter();
  const queryKey = params.toString();
  const [projectType, setProjectType] = useState<ProjectType>("experiment");
  const [sharingAllowed, setSharingAllowed] = useState(false);
  const [publishing, setPublishing] = useState<Project | null>(null);
  const [transition, setTransition] = useState<(() => void) | null>(null);
  const pendingAfterPublish = useRef<(() => void) | null>(null);
  const baseline = useRef("");
  const savedSnapshot = useRef<Project | null>(null);
  const workspaceGeneration = useRef(0);
  const createId = useRef<string | null>(null);
  const localExpected = useRef<Saved | undefined>(undefined);
  const compositionExpected = useRef<CompositeRecipe | undefined>(undefined);
  const basedOn = useRef<string | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [doc, setDoc] = useState<ExperimentDocument | null>(null);
  const latestDoc = useRef(doc);
  latestDoc.current = doc;
  const [valid, setValid] = useState<ExperimentDocument | null>(null);
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileMenu = useRef<HTMLDetailsElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [savedLibraryOpen, setSavedLibraryOpen] = useState(false);
  const saveAction = useRef<() => void>(() => {});
  const storageBusy = useRef(false);
  useEffect(() => {
    const closeOutside = (e: PointerEvent) => {
      if (
        e.target instanceof Node &&
        !fileMenu.current?.contains(e.target) &&
        !storageBusy.current
      )
        workspaceGeneration.current++;
      fileMenu.current
        ?.closest("main")
        ?.querySelectorAll<HTMLDetailsElement>(
          "details[data-workspace-menu][open]",
        )
        .forEach((menu) => {
          if (e.target instanceof Node && !menu.contains(e.target))
            menu.open = false;
        });
    };
    const closeEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        fileMenu.current
          ?.closest("main")
          ?.querySelectorAll<HTMLDetailsElement>(
            "details[data-workspace-menu][open]",
          )
          .forEach((menu) => {
            menu.open = false;
            menu.querySelector("summary")?.focus();
          });
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAction.current();
      }
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
  const initialRecovery = useRef<ReturnType<typeof readBuilderRecovery> | null>(
    null,
  );
  const [saved, setSaved] = useState<Saved[]>([]);
  const [remoteList, setRemoteList] = useState<ProjectSummary[]>([]);
  const [remoteCursor, setRemoteCursor] = useState<string | null>(null);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [saveRevision, setSaveRevision] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [draftState, setDraftState] = useState("Saved locally");
  const [recovery, setRecovery] = useState("");
  const [constructionBusy, setConstructionBusy] = useState(false);
  const constructionLock = useRef(false);
  const [playingSaved, setPlayingSaved] = useState(false);
  const { past, future, edit, undo, redo, resetHistory } = useDocumentHistory(
    doc,
    setDoc,
    setValid,
    setError,
    setNotice,
    expanded,
    playingSaved,
    constructionBusy,
  );
  const open = useCallback(
    (
      next: ExperimentDocument,
      id: string | null = null,
      recovered = "",
      revision?: number,
    ) => {
      fileMenu.current?.removeAttribute("open");
      setSavedLibraryOpen(false);
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
      setSaveRevision(revision);
      baseline.current = id ? contentFingerprint(next) : "";
      savedSnapshot.current = null;
      createId.current = null;
      localExpected.current = undefined;
      compositionExpected.current = undefined;
      setProjectType("experiment");
      setSharingAllowed(false);
      basedOn.current = undefined;

      setNotice(
        convertedTown
          ? "Town example converted to editable pieces. Residents now use explicit departure schedules and navigation across authored ground; the original saved copy stays intact until you save."
          : "",
      );
    },
    [resetHistory],
  );
  const recoveryQuery = useRef(queryKey);
  useEffect(() => {
    if (recoveryQuery.current !== queryKey) {
      initialRecovery.current = null;
      recoveryQuery.current = queryKey;
    }
    let disposed = false;
    const initialize = async () => {
      try {
        let entries: Saved[];
        if (ownerId) {
          const page = await listProjects(ownerId, "experiment");
          if (disposed) return;
          setRemoteList(page.entries);
          setRemoteCursor(page.nextCursor);
          const lessonId = new URLSearchParams(queryKey).get("lesson");
          if (lessonId) {
            const lesson = await getProject(lessonId, ownerId);
            entries = [
              {
                id: lesson.projectId,
                document: lesson.payload as ExperimentDocument,
                revision: lesson.saveRevision,
              },
            ];
          } else entries = [];
        } else entries = await loadLibrary();
        if (disposed) return;
        if (!Array.isArray(entries))
          throw new Error("Saved library is unreadable");
        const usable = usableEntries(entries);
        setSaved(usable);
        if (usable.length !== entries.length)
          setNotice(
            "Some saved experiments use unsupported or invalid documents. Their stored copies have been preserved.",
          );
        // Development effect replay must reopen the same recipe after its URL is cleaned.
        const recovered =
          initialRecovery.current ?? readBuilderRecovery(entries, ownerId);
        initialRecovery.current = recovered;
        const query = new URLSearchParams(queryKey);
        const requestedProject = query.get("project");
        const publicId = query.get("community") ?? query.get("insert");
        if (offline && publicId)
          throw new Error(
            "Community imports are unavailable offline. Import a downloaded recipe instead.",
          );
        if (query.has("new")) {
          const fresh = createFreshDocument();
          open(fresh);
          baseline.current = contentFingerprint(fresh);
        } else if (requestedProject) {
          if (!ownerId)
            throw new Error("Sign in to open this account project.");
          const kind =
            query.get("type") === "composition" ? "composition" : "experiment";
          const project = await getProject(requestedProject, ownerId, kind);
          if (disposed) return;
          const draft = recovered.draft;
          const hasDraft =
            draft?.saveId === project.projectId &&
            (draft.projectType ?? "experiment") === kind;
          open(
            hasDraft
              ? draft.document
              : parseDocument(JSON.stringify(project.payload)),
            project.projectId,
            hasDraft ? (draft.recovery ?? "") : "",
            hasDraft ? draft.revision : project.saveRevision,
          );
          if (hasDraft)
            baseline.current = contentFingerprint(
              parseDocument(JSON.stringify(project.payload)),
            );
          setProjectType(kind);
          setSharingAllowed(project.sharingAllowed);
          savedSnapshot.current = project;
        } else if (publicId) {
          const publication = await getPublication(publicId);
          if (disposed) return;
          if (query.has("insert")) {
            if (publication.projectType !== "composition")
              throw new Error(
                "Only compositions can be inserted into the builder.",
              );
            const base = editableDocument(
              recovered.draft?.document ?? createFreshDocument(),
            );
            if (!base.authored)
              throw new Error("The target draft is unavailable.");
            const recipe = parseRecipe(publication.payload);
            const plan = planInsertion(
              base.authored,
              { recipe },
              "",
              [],
              builtInRecipe,
              crypto.randomUUID(),
            );
            base.authored = plan.document;
            base.editor = structuredClone(plan.document.editor);
            base.lesson = structuredClone(plan.document.lesson);
            open(
              base,
              recovered.draft?.saveId ?? null,
              "",
              recovered.draft?.revision,
            );
            baseline.current = "";
          } else {
            open(parseDocument(JSON.stringify(publication.payload)));
            setProjectType(publication.projectType);
          }
          basedOn.current = publication.publicationId;
          setNotice(
            `Copied ${publication.name} by ${publication.authorName}. The original publication stays unchanged.`,
          );
        } else if (recovered.lesson) {
          open(
            recovered.lesson.document,
            recovered.lesson.id,
            "",
            recovered.lesson.revision,
          );
          setPlayingSaved(true);
          setExpanded(true);
        } else if (recovered.remix) {
          open(recovered.remix);
          window.history.replaceState(null, "", location.pathname);
        } else if (recovered.draft) {
          try {
            open(
              recovered.draft.document,
              recovered.draft.saveId ?? null,
              recovered.draft.recovery ?? "",
              recovered.draft.revision,
            );
          } catch {
            open(
              recovered.draft.valid,
              recovered.draft.saveId ?? null,
              "",
              recovered.draft.revision,
            );
            setRecovery(JSON.stringify(recovered.draft.document, null, 2));
            setNotice(
              "Recovered your last valid draft. The incomplete copy is available for repair.",
            );
          }
          localExpected.current = recovered.draft.expectedLocal;
          compositionExpected.current = recovered.draft.expectedComposition;
          setSelected(recovered.draft.selected ?? "");
          setProjectType(recovered.draft.projectType ?? "experiment");
          setSharingAllowed(recovered.draft.sharingAllowed ?? false);
          basedOn.current = recovered.draft.basedOnPublicationId;
        } else {
          const fresh = createFreshDocument();
          open(fresh);
          baseline.current = contentFingerprint(fresh);
        }
      } catch (e) {
        if (disposed) return;
        let restored = false;
        try {
          const raw = localStorage.getItem(
            ownerId
              ? `apertus-builder-draft-v1:${ownerId}`
              : "apertus-builder-draft-v1",
          );
          if (raw) {
            const draft = JSON.parse(raw);
            open(
              editableDocument(draft.valid),
              draft.saveId ?? null,
              draft.recovery ?? "",
              draft.revision,
            );
            setProjectType(draft.projectType ?? "experiment");
            setSharingAllowed(draft.sharingAllowed ?? false);
            localExpected.current = draft.expectedLocal;
            compositionExpected.current = draft.expectedComposition;
            basedOn.current = draft.basedOnPublicationId;
            baseline.current = "";
            restored = true;
          }
        } catch {
          /* Leave the unreadable original intact until explicitly saved. */
        }
        if (!restored) {
          open(createFreshDocument());
          setReady(false);
          setError(message(e));
          return;
        }
        setNotice(
          `Couldn't open the requested library. Recovered your local draft. ${message(e)}`,
        );
      }
      setReady(true);
    };
    void initialize();
    return () => {
      disposed = true;
    };
  }, [open, ownerId, queryKey, offline]);
  useEffect(() => {
    if (!ready || !doc || !valid || playingSaved) return;
    try {
      setDraftState("Saving locally…");
      persistDraft(
        {
          document: doc,
          valid,
          selected,
          saveId,
          projectType,
          sharingAllowed,
          basedOnPublicationId: basedOn.current,
          expectedLocal: localExpected.current,
          expectedComposition: compositionExpected.current,
          ...(ownerId ? { revision: saveRevision } : {}),
          recovery,
        },
        ownerId,
      );
      setDraftState("Saved locally");
    } catch {
      setDraftState("Local save failed");
      setNotice(
        "Draft could not be stored locally. Export your experiment to keep a copy.",
      );
    }
  }, [
    doc,
    valid,
    ready,
    selected,
    saveId,
    saveRevision,
    playingSaved,
    recovery,
    ownerId,
    projectType,
    sharingAllowed,
  ]);
  const dirty =
    doc !== null &&
    (contentFingerprint(doc) !== baseline.current ||
      sharingAllowed !== (savedSnapshot.current?.sharingAllowed ?? false));
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const requestTransition = (action: () => void) => {
    if (constructionLock.current) return;
    if (dirty) setTransition(() => action);
    else action();
  };
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
  const save = async (): Promise<boolean> => {
    if (!doc || storageBusy.current || constructionLock.current) return false;
    storageBusy.current = true;
    setSaving(true);
    const snapshot = structuredClone(doc);
    const generation = workspaceGeneration.current;
    try {
      if (!saveId && !createId.current) createId.current = crypto.randomUUID();
      const id = saveId ?? createId.current;
      if (!id) throw new Error("Project identity could not be allocated.");
      if (ownerId) {
        if (saveId && saveRevision === undefined)
          throw new Error(
            "Reopen this project before saving it to your account; its original save revision is unavailable.",
          );
        const previous =
          savedSnapshot.current ??
          (saveId ? await getProject(id, ownerId, projectType) : null);
        const content =
          projectType === "composition"
            ? parseRecipe(serializeDocument(snapshot))
            : snapshot;
        const project = await saveProject(
          {
            projectId: id,
            projectType,
            name: snapshot.lesson.title,
            description: previous?.description ?? "",
            tags: previous?.tags ?? [],
            payload: content,
            sharingAllowed,
          },
          ownerId,
          saveId ? (saveRevision ?? previous?.saveRevision ?? null) : null,
          saveId ? undefined : basedOn.current,
          id,
          basedOn.current ? [basedOn.current] : undefined,
        );
        if (!alive.current || generation !== workspaceGeneration.current)
          return false;
        savedSnapshot.current = project;
        setRemoteList((old) => {
          const { payload: _payload, ...summary } = project;
          return [
            ...old.filter((item) => item.projectId !== project.projectId),
            summary,
          ];
        });
        setSaveRevision(project.saveRevision);
        if (projectType === "experiment")
          setSaved((old) => [
            ...old.filter((e) => e.id !== id),
            {
              id,
              document: project.payload as ExperimentDocument,
              revision: project.saveRevision,
            },
          ]);
      } else if (projectType === "composition") {
        const recipe = parseRecipe(serializeDocument(snapshot));
        recipe.id = id;
        const store = new RecipeRepository(localStorage);
        if (!navigator.locks)
          throw new Error(
            "This browser cannot coordinate local saves. Download your recipe instead.",
          );
        await navigator.locks.request("apertus-composites-v1", () => {
          if (basedOn.current) {
            const sources = JSON.parse(
              localStorage.getItem("apertus-local-composition-sources-v1") ??
                "{}",
            );
            sources[id] = basedOn.current;
            localStorage.setItem(
              "apertus-local-composition-sources-v1",
              JSON.stringify(sources),
            );
          }
          return store.save(recipe, compositionExpected.current);
        });
        compositionExpected.current = structuredClone(recipe);
      } else {
        const entries = await saveEntry(
          {
            id,
            document: snapshot,
            ...(basedOn.current
              ? { basedOnPublicationId: basedOn.current }
              : {}),
          },
          localExpected.current ??
            (saveId ? saved.find((entry) => entry.id === id) : undefined),
        );
        if (!alive.current || generation !== workspaceGeneration.current)
          return false;
        setSaved(usableEntries(entries));
        localExpected.current = structuredClone(
          entries.find((entry) => entry.id === id),
        );
      }
      setSaveId(id);
      baseline.current = contentFingerprint(snapshot);
      const currentSaved =
        latestDoc.current !== null &&
        contentFingerprint(latestDoc.current) === contentFingerprint(snapshot);
      setNotice(
        currentSaved
          ? ownerId
            ? "Saved to your account."
            : "Saved on this device."
          : "Saved the earlier snapshot. Your newer edits are still unsaved.",
      );
      return currentSaved;
    } catch (e) {
      if (alive.current)
        setNotice(`Couldn't save the experiment. ${message(e)}`);
      return false;
    } finally {
      storageBusy.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const reviewPublication = async (after?: () => void) => {
    if (!ownerId) {
      setNotice(
        "Sign in to publish. You can save locally or download a recipe.",
      );
      return;
    }
    if (!sharingAllowed) {
      setNotice("Enable community sharing before publishing.");
      return;
    }
    if (!(await save()) || !savedSnapshot.current) return;
    pendingAfterPublish.current = after ?? null;
    setTransition(null);
    setPublishing(savedSnapshot.current);
  };
  saveAction.current = () => {
    void save();
  };
  const download = () => {
    if (!doc || constructionLock.current) return;
    try {
      const url = URL.createObjectURL(
        new Blob(
          [
            basedOn.current
              ? JSON.stringify(
                  {
                    apertusExportVersion: 1,
                    publicationId: basedOn.current,
                    payload: JSON.parse(serializeDocument(doc)),
                  },
                  null,
                  2,
                )
              : serializeDocument(doc),
          ],
          { type: "application/json" },
        ),
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
    if (constructionLock.current) return;
    try {
      const portable = unwrapPortable(JSON.parse(text));
      const imported = parseDocument(text);
      requestTransition(() => {
        open(imported);
        basedOn.current = portable.publicationId;
      });
      setRecovery("");
    } catch (e) {
      setRecovery(text);
      setNotice(`Couldn't import the experiment. ${message(e)}`);
    }
  };
  const importField = (
    <>
      <button type="button" onClick={() => importInput.current?.click()}>
        <BuilderIcon name="upload" /> Import recipe…
      </button>
      <input
        ref={importInput}
        hidden
        aria-label="Import experiment or recipe"
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
    </>
  );
  const library = (saved.length > 0 || remoteList.length > 0) && (
    <section className="builder-library">
      <h2>{ownerId ? "Your saved experiments" : "Saved on this device"}</h2>
      {ownerId &&
        remoteList.map((entry) => (
          <div key={entry.projectId}>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void getProject(entry.projectId, ownerId)
                  .then((project) =>
                    requestTransition(() => {
                      open(
                        parseDocument(JSON.stringify(project.payload)),
                        project.projectId,
                        "",
                        project.saveRevision,
                      );
                      setSharingAllowed(project.sharingAllowed);
                      savedSnapshot.current = project;
                    }),
                  )
                  .catch((e) =>
                    setNotice(`Couldn't open this experiment. ${message(e)}`),
                  );
              }}
            >
              Open {entry.name}
            </button>
            <a
              href={`/experiments/builder?lesson=${encodeURIComponent(entry.projectId)}`}
            >
              Try lesson <BuilderIcon name="external" />
            </a>
          </div>
        ))}
      {ownerId && remoteCursor && (
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            void listProjects(ownerId, "experiment", "", remoteCursor)
              .then((page) => {
                setRemoteList((old) => [...old, ...page.entries]);
                setRemoteCursor(page.nextCursor);
              })
              .catch((e) => setNotice(message(e)));
          }}
        >
          More saved experiments
        </button>
      )}
      {!ownerId &&
        saved.map((entry) => (
          <div key={entry.id}>
            <button
              type="button"
              onClick={() =>
                requestTransition(() => {
                  open(
                    entry.document,
                    entry.id,
                    entry.recovery,
                    entry.revision,
                  );
                  localExpected.current = entry;
                })
              }
            >
              Open {entry.document.lesson.title || "Untitled experiment"}
            </button>{" "}
            {isRunnableDocument(entry.document) && (
              <a href={`/experiments/builder?lesson=${entry.id}`}>
                Try lesson <BuilderIcon name="external" />
              </a>
            )}
          </div>
        ))}
    </section>
  );
  if (!ready)
    return error ? (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry opening builder
        </button>
        <Link href="/projects">My projects</Link>
      </div>
    ) : (
      <LoadingState
        title="Opening builder…"
        description="Restoring your canvas and components."
      />
    );
  if (!doc || !valid)
    return (
      <LoadingState
        title="Opening builder…"
        description="Restoring your canvas and components."
      />
    );
  const setWorkspaceZoom = (zoom: number, pan?: { x: number; y: number }) => {
    if (
      !Number.isFinite(zoom) ||
      zoom < 0.2 ||
      zoom > 2 ||
      (pan && (!Number.isFinite(pan.x) || !Number.isFinite(pan.y)))
    )
      return;
    // Camera navigation is editor metadata, not a lesson edit or an undo step.
    const update = (current: ExperimentDocument | null) => {
      if (
        !current ||
        (current.editor.zoom === zoom &&
          (!pan ||
            (current.editor.pan?.x === pan.x &&
              current.editor.pan?.y === pan.y)) &&
          (!current.authored || current.authored.editor.zoom === zoom))
      )
        return current;
      return {
        ...current,
        editor: { ...current.editor, zoom, ...(pan ? { pan } : {}) },
        ...(current.authored
          ? {
              authored: {
                ...current.authored,
                editor: {
                  ...current.authored.editor,
                  zoom,
                  ...(pan ? { pan } : {}),
                },
              },
            }
          : {}),
      };
    };
    setDoc(update);
    setValid(update);
  };
  if (doc.authored && valid.authored)
    return (
      <>
        {transition && (
          <UnsavedDialog
            account={Boolean(ownerId)}
            experimentName={doc.lesson.title}
            error={notice}
            busy={saving}
            onCancel={() => setTransition(null)}
            onDiscard={() => {
              const next = transition;
              setTransition(null);
              next();
            }}
            onDownload={download}
            onSave={() => {
              const next = transition;
              void save().then((ok) => {
                if (ok) {
                  setTransition(null);
                  next();
                }
              });
            }}
            onPublish={
              ownerId && sharingAllowed
                ? () => {
                    void reviewPublication(transition);
                  }
                : undefined
            }
          />
        )}
        {publishing && ownerId && (
          <PublishDialog
            project={publishing}
            ownerId={ownerId}
            onClose={() => {
              setPublishing(null);
              pendingAfterPublish.current = null;
            }}
            onPublished={(publication) => {
              const next = pendingAfterPublish.current;
              if (next) {
                setPublishing(null);
                pendingAfterPublish.current = null;
                next();
              } else
                setNotice(
                  `Published ${publication.name}. Editing will not change this snapshot.`,
                );
            }}
          />
        )}
        <CompositionBuilder
          onBusyChange={(busy) => {
            constructionLock.current = busy;
            setConstructionBusy(busy);
          }}
          key={`${sessionRevision}/${doc.template}`}
          doc={doc}
          valid={valid}
          edit={edit}
          undo={undo}
          redo={redo}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onSave={() => {
            void save();
          }}
          onExit={() => requestTransition(() => router.push("/experiments"))}
          onHome={() => requestTransition(() => router.push("/"))}
          storageNotice={
            <div className="builder-local-notice">
              {ownerId ? (
                <>
                  <span>
                    Draft recovery stays on this device; Save stores a private
                    account copy.
                  </span>
                  <label>
                    <input
                      type="checkbox"
                      checked={sharingAllowed}
                      onChange={(event) =>
                        setSharingAllowed(event.target.checked)
                      }
                    />{" "}
                    Allow this project to be published to the community
                  </label>
                </>
              ) : (
                <>
                  You're working locally. Browser data can be cleared; download
                  a recipe to keep a portable copy.{" "}
                  {!offline && (
                    <>
                      <Link href="/auth/sign-in">Sign in</Link> to save to your
                      account and publish.
                    </>
                  )}
                </>
              )}
            </div>
          }
          saving={saving}
          onNoticeDismiss={() => setNotice("")}
          saveState={
            draftState === "Local save failed" || dirty || !saveId
              ? draftState
              : ownerId
                ? "Saved to account"
                : "Saved on device"
          }
          error={error}
          notice={notice}
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
            // biome-ignore lint/a11y/useKeyWithClickEvents: Native buttons and links emit click on keyboard activation.
            <details
              data-workspace-menu
              name="builder-toolbar-menu"
              className="builder-file-menu composition-document-menu composition-view-menu"
              ref={fileMenu}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a")) {
                  fileMenu.current?.removeAttribute("open");
                  fileMenu.current?.querySelector("summary")?.focus();
                }
              }}
            >
              <summary aria-label="More document actions">
                <span className="toolbar-full-label">More</span>
                <span className="toolbar-short-label" aria-hidden="true">
                  <BuilderIcon name="more" />
                </span>
              </summary>
              <div>
                <div className="builder-menu-group">
                  <p>Experiment</p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      requestTransition(() => {
                        const fresh = createFreshDocument();
                        open(fresh);
                        baseline.current = contentFingerprint(fresh);
                      })
                    }
                  >
                    <BuilderIcon name="plus" /> New experiment
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedLibraryOpen(true)}
                  >
                    <BuilderIcon name="folder" /> Open saved experiment…
                  </button>
                </div>
                <div className="builder-menu-group">
                  <p>Import and export</p>
                  {importField}
                  <button
                    type="button"
                    onClick={download}
                    disabled={Boolean(error)}
                  >
                    <BuilderIcon name="download" /> Download recipe
                  </button>
                </div>
                <div className="builder-menu-group">
                  <p>Sharing and navigation</p>
                  {!offline && (
                    <button
                      aria-label="Publish"
                      type="button"
                      disabled={!ownerId || saving || !sharingAllowed}
                      onClick={() => {
                        void reviewPublication();
                      }}
                    >
                      <BuilderIcon name="share" />
                      <span>
                        Publish
                        {(!ownerId || !sharingAllowed) && (
                          <small>
                            {!ownerId
                              ? "Sign in to publish"
                              : "Enable sharing in storage settings"}
                          </small>
                        )}
                      </span>
                    </button>
                  )}
                  <Link
                    href="/projects"
                    onClick={(event) => {
                      event.preventDefault();
                      requestTransition(() => router.push("/projects"));
                    }}
                  >
                    <BuilderIcon name="folder" /> My projects
                  </Link>
                  {!offline && (
                    <Link
                      href="/community"
                      onClick={(event) => {
                        event.preventDefault();
                        requestTransition(() => router.push("/community"));
                      }}
                    >
                      <BuilderIcon name="share" /> Community
                    </Link>
                  )}
                </div>
                <div className="builder-menu-group">{history}</div>
                <button
                  className="composition-clear-action"
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    requestTransition(() => {
                      const next = createFreshDocument();
                      next.lesson.title = doc.lesson.title;
                      if (next.authored)
                        next.authored.lesson.title = doc.lesson.title;
                      const metadata = savedSnapshot.current;
                      open(next, saveId, "", saveRevision);
                      setProjectType(projectType);
                      setSharingAllowed(sharingAllowed);
                      savedSnapshot.current = metadata;
                      baseline.current = "";
                    })
                  }
                >
                  <BuilderIcon name="trash" /> Clear canvas
                </button>
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
        <ComponentDialog
          open={savedLibraryOpen}
          title="Open saved experiment"
          subtitle={
            ownerId
              ? "Private experiments saved to your account"
              : "Experiments saved on this device"
          }
          icon="folder"
          onClose={() => setSavedLibraryOpen(false)}
          footerLabel="Close library"
          footerPrimary={false}
          className="saved-experiments-dialog"
        >
          {library || (
            <div className="saved-experiments-empty">
              <BuilderIcon name="folder" />
              <h3>No saved experiments yet</h3>
              <p>Save your current experiment to find it here.</p>
            </div>
          )}
        </ComponentDialog>
      </>
    );
  return (
    <p role="alert">
      This document could not be converted to an editable composition.
    </p>
  );
}
