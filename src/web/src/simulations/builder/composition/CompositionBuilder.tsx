"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import CommandBar from "../../../app/_components/CommandBar";
import { publicDefinition } from "../../components/catalog";
import { definitionDiscovery } from "../../components/catalog/discovery";
import { hasControlSettings } from "../../components/controls/controlContract";
import { SchemaForm } from "../../components/controls/SchemaForm";
import { RecipeLesson } from "../../components/views/RecipeLesson";
import {
  reconcileBoard,
  separateBoardLayout,
} from "../../runtime/authoring/board";
import { regenerateTruss } from "../../runtime/authoring/regenerateTruss";
import { requireValue } from "../../runtime/authoring/requireValue";
import { object } from "../../runtime/parameterSchema";
import { BuilderIcon } from "../BuilderIcon";
import { ComponentDialog } from "../ComponentDialog";
import {
  type ExperimentDocument,
  isRunnableDocument,
  validateRunnableDocument,
} from "../document";
import {
  type BoardClipboard,
  deleteBoardDrawingContent,
  pasteBoardContent,
} from "../editor/boardClipboard";
import { deleteComponents } from "../editor/selection";
import { SaveCompositeDialog } from "../library/SaveCompositeDialog";
import { ComponentSettings } from "./ComponentSettings";
import { CompositeInterfaceEditor } from "./CompositeInterfaceEditor";
import { CompositionGraph } from "./CompositionGraph";
import { CompositionLibrary } from "./CompositionLibrary";
import { ConstructionBoardPreview } from "./ConstructionBoardPreview";
import { constructionPreview } from "./constructionPreview";
import { FeedbackView } from "./FeedbackView";
import { makeFeedback } from "./feedback";
import {
  ManualComponentSettings,
  manualDefinition,
} from "./ManualComponentSettings";
import { useBuilderAi } from "./useBuilderAi";
import { download, useComponentCatalog } from "./useComponentCatalog";
import "./composition.css";
type Edit = (
  change: (d: ExperimentDocument) => void,
  group?: string | null,
  action?: string,
) => boolean;
export default function CompositionBuilder({
  doc,
  valid,
  edit: commit,
  onBusyChange,
  undo,
  redo,
  canUndo,
  canRedo,
  onSave,
  saving,
  saveState,
  error,
  notice,
  onNoticeDismiss,
  fileMenu,
  expanded,
  onExpanded,
  onZoom,
  onExit,
  onHome,
  storageNotice,
}: {
  onExit: () => void;
  onHome: () => void;
  storageNotice?: ReactNode;
  doc: ExperimentDocument;
  valid: ExperimentDocument;
  edit: Edit;
  onBusyChange?: (busy: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  saving: boolean;
  saveState: string;
  error: string;
  notice: string;
  onNoticeDismiss: () => void;
  fileMenu: ReactNode;
  expanded: boolean;
  onExpanded: (v: boolean) => void;
  onZoom: (v: number, pan?: { x: number; y: number }) => void;
}) {
  const boardClipboard = useRef<BoardClipboard | null>(null);
  const composer = useRef<HTMLDivElement>(null);
  const tryLesson = useRef<HTMLButtonElement>(null);
  const returnToBuilder = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(expanded);
  useEffect(() => {
    if (expanded) returnToBuilder.current?.focus();
    else if (wasExpanded.current) tryLesson.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded]);
  const mutationLock = useRef(false);
  const edit: Edit = (...args) => !mutationLock.current && commit(...args);
  const catalog = useComponentCatalog(doc, edit);
  const ai = useBuilderAi({
    doc,
    edit: commit,
    onBusyChange: (busy) => {
      mutationLock.current = busy;
      onBusyChange?.(busy);
    },
  });
  const visibleDocument = useMemo(
    () => (ai.preview ? constructionPreview(doc, ai.preview) : doc),
    [doc, ai.preview],
  );
  const {
    document,
    components,
    change,
    select,
    report,
    regeneration,
    setRegeneration,
    regenerationDialog,
  } = catalog;
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Connections");
  const [mobile, setMobile] = useState(false);
  const [appearancePreview, setAppearancePreview] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  useEffect(() => {
    if (ai.busy) {
      setSelected("");
      setLibraryOpen(false);
      setSaveOpen(false);
      setAppearancePreview(false);
    }
  }, [ai.busy]);
  useEffect(() => {
    if (expanded || appearancePreview) return;
    const element = composer.current;
    const root = element?.closest<HTMLElement>(".composition-builder");
    if (!element || !root) return;
    const measure = () =>
      root.style.setProperty(
        "--builder-composer-height",
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
      root.style.removeProperty("--builder-composer-height");
    };
  }, [expanded, appearancePreview]);
  const documentNotice =
    /^(Saved on this device\.|Saved to your account\.)$/.test(notice)
      ? ""
      : notice;
  const noticeFailure =
    /Couldn't |could not|unsupported or invalid|failed|unsaved/i.test(
      documentNotice,
    );
  const documentFeedback = documentNotice
    ? makeFeedback(
        documentNotice,
        noticeFailure ? "error" : "info",
        noticeFailure ? "Update experiment" : "Experiment updated",
        "document.action",
      )
    : null;
  const saveLabel = saving
    ? "Saving…"
    : isRunnableDocument(doc)
      ? "Save experiment"
      : "Save draft";
  const current = components.find((n) => n.id === selected);
  const errorText = (e: unknown) =>
    e instanceof Error ? e.message : "Change rejected";
  const openLibrary = (category = "all", target?: string) => {
    catalog.categorize(category === "results" ? "displays" : category);
    catalog.search("");
    catalog.report("");
    if (target) {
      select([target]);
      const n = components.find((n) => n.id === target);
      const canvas = document.nodes.find(
        (c) => c.definition.startsWith("canvases/") && c.scope === n?.scope,
      );
      catalog.setDestination(canvas?.id ?? "");
    }
    setSelected("");
    setLibraryOpen(true);
  };
  const selectSettings = (id: string) => {
    setSelected(id);
    select(document.groups.find((g) => g.id === id)?.members ?? [id]);
  };
  return (
    <main
      className={`manual-builder composition-builder ${expanded ? "is-expanded" : ""}`}
      data-tab={tab}
    >
      <h1 className="builder-sr-only">
        {doc.lesson.title || "Untitled experiment"}
      </h1>
      <header className="builder-toolbar composition-toolbar">
        <Link
          href="/"
          onNavigate={(event) => {
            event.preventDefault();
            onHome();
          }}
        >
          Home
        </Link>
        {expanded ? (
          <button
            type="button"
            className="composition-return"
            ref={returnToBuilder}
            aria-label="Return to builder"
            onClick={() => {
              setSelected("");
              setAppearancePreview(false);
              onExpanded(false);
            }}
          >
            <BuilderIcon name="back" /> Return to builder
          </button>
        ) : (
          <Link
            href="/experiments"
            onClick={(event) => {
              event.preventDefault();
              onExit();
            }}
          >
            <BuilderIcon name="back" /> Experiments
          </Link>
        )}
        <label className="composition-document-title">
          <span className="builder-sr-only">Experiment title</span>
          <input
            aria-label="Experiment title"
            value={doc.lesson.title}
            placeholder="Untitled experiment"
            maxLength={100}
            readOnly={expanded || ai.busy}
            onChange={(event) =>
              edit(
                (d) => {
                  d.lesson.title = event.target.value;
                  if (d.authored) d.authored.lesson.title = event.target.value;
                },
                "experiment-title",
                "Rename experiment",
              )
            }
          />
        </label>
        {!expanded && (
          <details
            data-workspace-menu
            name="builder-toolbar-menu"
            className="composition-storage composition-view-menu"
            inert={ai.busy}
          >
            <summary
              aria-label={`Storage details: ${saving ? "Saving…" : saveState}`}
            >
              <span className="composition-save-state" aria-live="polite">
                {saving ? "Saving…" : saveState}
              </span>
              <BuilderIcon name="info" />
            </summary>
            <div>{storageNotice}</div>
          </details>
        )}
        {!expanded && (
          <>
            <button type="button" disabled={!canUndo || ai.busy} onClick={undo}>
              Undo
            </button>
            <button type="button" disabled={!canRedo || ai.busy} onClick={redo}>
              Redo
            </button>
            <button
              type="button"
              className="composition-save-action"
              aria-label={saveLabel}
              disabled={!!error || saving || ai.busy}
              onClick={onSave}
            >
              <span className="toolbar-full-label">{saveLabel}</span>
              <span className="toolbar-short-label">
                {saving ? "Saving…" : "Save"}
              </span>
            </button>
          </>
        )}
        {!expanded && (
          <button
            type="button"
            disabled={ai.busy}
            className="builder-primary"
            ref={tryLesson}
            aria-label="Try lesson ↗"
            onClick={() => {
              try {
                validateRunnableDocument(doc, false);
                catalog.report("");
              } catch (e) {
                catalog.report(
                  e instanceof Error ? e.message : "Complete the lesson first",
                );
                if (!doc.lesson.title || !doc.lesson.instruction)
                  setSelected("lesson");
                return;
              }
              setSelected("");
              setAppearancePreview(false);
              onExpanded(true);
            }}
          >
            <span className="toolbar-full-label">
              Try lesson <BuilderIcon name="external" />
            </span>
            <span className="toolbar-short-label">
              Try <BuilderIcon name="external" />
            </span>
          </button>
        )}
      </header>
      {!selected && !libraryOpen && !saveOpen && (
        <>
          {error ? (
            <FeedbackView
              floating
              message={{
                ...makeFeedback(
                  error,
                  "error",
                  "apply experiment changes",
                  "document.validation",
                ),
                title: "Preview uses the last valid draft",
              }}
            >
              <button type="button" onClick={() => setTab("Connections")}>
                Review connections
              </button>
            </FeedbackView>
          ) : (
            <FeedbackView
              floating
              message={documentFeedback}
              onDismiss={onNoticeDismiss}
            />
          )}
          {!documentFeedback && !error && (
            <FeedbackView
              floating
              message={catalog.message}
              onDismiss={() => catalog.report("")}
            />
          )}
        </>
      )}
      {!expanded && (
        <nav
          className="builder-tabs composition-tabs"
          aria-label="Builder panels"
        >
          <fieldset
            className="composition-mode-switch"
            aria-label="Authoring mode"
          >
            {["Connections", "Build"].map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={tab === name}
                onClick={() => {
                  setTab(name);
                  setSelected("");
                  setAppearancePreview(false);
                }}
              >
                {name}
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={ai.busy}
            data-composition-add
            aria-label="+ Add component"
            onClick={() => openLibrary()}
          >
            <span className="toolbar-full-label">+ Add component</span>
            <span className="toolbar-short-label" aria-hidden="true">
              + Add
            </span>
          </button>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Child controls emit click on keyboard activation. */}
          <details
            data-workspace-menu
            name="builder-toolbar-menu"
            className="composition-view-menu composition-settings-menu"
            inert={ai.busy}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button")) {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Lesson settings">
              <span className="toolbar-full-label">Lesson settings</span>
              <span className="toolbar-short-label" aria-hidden="true">
                <BuilderIcon name="settings" />
              </span>
            </summary>
            <div>
              {tab === "Build" && !ai.busy && (
                <button
                  type="button"
                  className="composition-appearance-toggle"
                  aria-label={
                    appearancePreview
                      ? "Show builder controls"
                      : "Preview experiment appearance"
                  }
                  aria-pressed={appearancePreview}
                  title={
                    appearancePreview
                      ? "Show builder controls"
                      : "Hide builder controls and preview the experiment appearance"
                  }
                  onClick={() => {
                    setAppearancePreview((value) => !value);
                    setSelected("");
                  }}
                >
                  <BuilderIcon name="eye" />
                  <span>
                    {appearancePreview
                      ? "Show editing controls"
                      : "Preview appearance"}
                  </span>
                </button>
              )}
              <button type="button" onClick={() => setSelected("lesson")}>
                <BuilderIcon name="layout" /> Title and layout
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobile(!mobile);
                  setTab("Build");
                }}
              >
                <BuilderIcon name="canvases" />{" "}
                {mobile ? "Desktop preview" : "Mobile preview"}
              </button>
            </div>
          </details>
          <div className="composition-actions" inert={ai.busy}>
            {fileMenu}
          </div>
        </nav>
      )}

      <div className="composition-workspace">
        <CompositionGraph
          doc={visibleDocument}
          constructing={ai.busy}
          construction={ai.preview}
          selected={ai.busy ? "" : selected}
          onSelect={selectSettings}
          onAdd={openLibrary}
          edit={edit}
          onZoom={onZoom}
          active={!expanded && tab === "Connections"}
          onSelectionChange={select}
          onSaveComposite={(ids) => {
            select(ids);
            catalog.setParameterTargets([]);
            setSaveOpen(true);
          }}
        />
        {
          <div
            hidden={!expanded && tab !== "Build"}
            className={`composition-preview ${!expanded && mobile ? "is-mobile" : ""} ${appearancePreview ? "is-appearance-preview" : ""} ${expanded || (!mobile && valid.authored?.presentation?.mode === "board") ? "is-board-workspace" : ""}`}
          >
            {ai.busy ? (
              <ConstructionBoardPreview update={ai.preview} />
            ) : (
              <RecipeLesson
                document={requireValue(valid.authored)}
                authoring={!expanded && !appearancePreview && tab === "Build"}
                workspace={expanded || !mobile}
                onBoardAction={(action, layoutIds, itemIds = []) => {
                  if (action === "separate") {
                    change("Arrange group contents separately", (d) => {
                      layoutIds.forEach((id) => {
                        separateBoardLayout(d, id);
                      });
                    });
                    return;
                  }
                  const ids: string[] = [];
                  const collect = (
                    layout: typeof document.layout,
                    selected = false,
                  ) => {
                    const inside = selected || layoutIds.includes(layout.id);
                    if (inside && layout.node) ids.push(layout.node);
                    layout.children.forEach((child) => {
                      collect(child, inside);
                    });
                  };
                  collect(document.layout);
                  if (action === "copy") {
                    boardClipboard.current = {
                      document: structuredClone(doc),
                      ids,
                      itemIds,
                    };
                    report("Content copied. Use Paste to place a copy.");
                    return;
                  }
                  if (action === "paste" && !boardClipboard.current) {
                    report("Copy some board content first.");
                    return;
                  }
                  edit(
                    (d) => {
                      if (action === "delete") {
                        deleteBoardDrawingContent(d, itemIds);
                        deleteComponents(d, ids);
                        if (d.authored) {
                          const prune = (layout: typeof document.layout) => {
                            layout.children = layout.children.filter(
                              (child) => !layoutIds.includes(child.id),
                            );
                            layout.children.forEach(prune);
                          };
                          prune(d.authored.layout);
                          if (layoutIds.includes(d.authored.layout.id)) {
                            d.authored.layout.children = [];
                            delete d.authored.layout.node;
                          }
                          reconcileBoard(d.authored);
                        }
                      } else
                        pasteBoardContent(
                          d,
                          action === "duplicate"
                            ? { document: doc, ids, itemIds }
                            : requireValue(boardClipboard.current),
                        );
                    },
                    null,
                    action === "delete"
                      ? "Delete board content"
                      : "Paste board content",
                  );
                }}
                onPresentationChange={(presentation, group, action) =>
                  edit(
                    (d) => {
                      if (d.authored) d.authored.presentation = presentation;
                    },
                    group ?? null,
                    action ?? "Edit board presentation",
                  )
                }
                selected={selected}
                onSelect={selectSettings}
                onAuthorChange={(node) =>
                  change("Edit starting geometry", (d) => {
                    const target = d.nodes.find((n) => n.id === node.id);
                    if (target) {
                      const { id: _, ...configuration } = node;
                      target.configuration = configuration;
                    }
                  })
                }
                onCanvasChange={(nodeId, viewport) =>
                  change("Set canvas starting view", (d) => {
                    const target = d.nodes.find((node) => node.id === nodeId);
                    if (target) Object.assign(target.configuration, viewport);
                  })
                }
                onCapture={
                  expanded || appearancePreview
                    ? undefined
                    : (next) => change("Capture starting values", () => next)
                }
              />
            )}
          </div>
        }
      </div>
      <ComponentDialog
        open={!expanded && !!selected}
        subtitle={
          current
            ? `${publicDefinition(current.definition).category === "controls" ? "Control" : publicDefinition(current.definition).category} · ${publicDefinition(current.definition).title}`
            : undefined
        }
        title={
          current?.label ??
          document.groups.find((g) => g.id === selected)?.label ??
          "Lesson settings"
        }
        onClose={() => setSelected("")}
        icon={
          current
            ? definitionDiscovery(publicDefinition(current.definition)).group
            : "settings"
        }
        footerActions={
          current && hasControlSettings(current.definition) ? (
            <button
              type="submit"
              form={`control-settings-${current.id}`}
              aria-label="Apply control settings"
              className="builder-primary"
            >
              Apply changes
            </button>
          ) : undefined
        }
        footerLabel="Close settings"
        footerPrimary={false}
        footerNote={
          current
            ? hasControlSettings(current.definition)
              ? "Apply to update this control."
              : "Apply buttons commit form changes; other settings update immediately."
            : "Lesson text and layout changes save as you edit."
        }
        wide={selected === "lesson" || !!manualDefinition(current)}
      >
        {selected && (
          <>
            <FeedbackView
              message={catalog.message}
              floating={catalog.message?.severity !== "error"}
              onDismiss={() => catalog.report("")}
            />
            <FeedbackView
              floating
              message={documentFeedback}
              onDismiss={onNoticeDismiss}
            />
          </>
        )}
        {regeneration && (
          <dialog
            ref={regenerationDialog}
            aria-label="Replace truss topology"
            onCancel={() => setRegeneration(null)}
          >
            <h2>Replace truss topology</h2>
            <p>
              This replaces {regeneration.removed} joints and members with{" "}
              {regeneration.added} generated components. Member edits and
              selection are cleared. Load and controls are kept. Undo restores
              the previous truss.
            </p>
            <button
              type="button"
              onClick={() => {
                change("Regenerate truss", () => regeneration.document);
                setRegeneration(null);
              }}
            >
              Replace topology
            </button>
            <button type="button" onClick={() => setRegeneration(null)}>
              Cancel
            </button>
          </dialog>
        )}
        {current?.definition === "models/BridgeResponse" && (
          <section aria-label="Generate truss">
            <p>
              Generate supported topology (replaces edited joints and members).
            </p>
            {[
              { label: "Standard truss", span: 1, dense: false },
              { label: "Dense truss", span: 1, dense: true },
              { label: "Long truss", span: 2, dense: false },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  try {
                    const prefix = crypto.randomUUID();
                    setRegeneration(
                      regenerateTruss(
                        document,
                        current.id,
                        p.span,
                        p.dense,
                        (id) => `${prefix}/${id}`,
                      ),
                    );
                  } catch (e) {
                    report(errorText(e));
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </section>
        )}
        {document.groups
          .filter((g) => g.id === selected)
          .map((g) => (
            <div className="catalog-group" key={g.id}>
              <CompositeInterfaceEditor
                group={g}
                document={document}
                onChange={(ports) =>
                  change(`Edit ${g.label} interface`, (d) => {
                    requireValue(
                      d.groups.find((p) => p.id === g.id),
                    ).exposedPorts = ports;
                  })
                }
              />
              <strong>{g.label}</strong>{" "}
              <span>{g.members.length} children</span>
              <button
                type="button"
                onClick={() =>
                  change(
                    `${g.collapsed ? "Expand" : "Collapse"} ${g.label}`,
                    (d) => {
                      requireValue(
                        d.groups.find((p) => p.id === g.id),
                      ).collapsed = !g.collapsed;
                    },
                  )
                }
              >
                {g.collapsed ? "Expand" : "Collapse"}
              </button>
              <button type="button" onClick={() => select(g.members)}>
                Select group
              </button>
              <button
                type="button"
                onClick={() =>
                  change(`Ungroup ${g.label}`, (d) => {
                    d.groups = d.groups.filter((p) => p.id !== g.id);
                    for (const child of d.groups)
                      if (child.parent === g.id) {
                        if (g.parent) child.parent = g.parent;
                        else delete child.parent;
                      }
                  })
                }
              >
                Ungroup
              </button>
              {g.parameters.length > 0 && (
                <details>
                  <summary>Edit exposed parameters</summary>
                  <SchemaForm
                    key={`${g.id}/${JSON.stringify(
                      g.parameters.map(
                        (parameter) =>
                          components.find((node) => node.id === parameter.node)
                            ?.configuration[parameter.field],
                      ),
                    )}`}
                    schema={object(
                      Object.fromEntries(
                        g.parameters.map((parameter) => [
                          parameter.name,
                          parameter.schema,
                        ]),
                      ),
                    )}
                    initial={Object.fromEntries(
                      g.parameters.map((parameter) => [
                        parameter.name,
                        components.find((node) => node.id === parameter.node)
                          ?.configuration[parameter.field] ?? parameter.default,
                      ]),
                    )}
                    label={`${g.label} parameters`}
                    onSubmit={(values) => {
                      const accepted = change(
                        `Edit ${g.label} parameters`,
                        (d) => {
                          for (const parameter of g.parameters)
                            requireValue(
                              [...d.nodes, ...d.resources].find(
                                (node) => node.id === parameter.node,
                              ),
                            ).configuration[parameter.field] = structuredClone(
                              values[parameter.name],
                            );
                        },
                      );
                      return accepted
                        ? { accepted: true }
                        : {
                            accepted: false,
                            error: "Parameters were rejected.",
                          };
                    }}
                  />
                </details>
              )}
            </div>
          ))}

        {manualDefinition(current) ? (
          <ManualComponentSettings
            catalog={catalog}
            node={requireValue(current)}
          />
        ) : (
          !document.groups.some((g) => g.id === selected) && (
            <ComponentSettings catalog={catalog} id={selected} />
          )
        )}
        {current && !manualDefinition(current) && (
          <button
            className="settings-delete"
            type="button"
            onClick={() => {
              if (
                edit(
                  (d) => deleteComponents(d, [current.id]),
                  null,
                  "Delete component",
                )
              )
                setSelected("");
            }}
          >
            <BuilderIcon name="trash" /> Delete component
          </button>
        )}
      </ComponentDialog>
      <CompositionLibrary
        catalog={catalog}
        open={libraryOpen && !ai.busy}
        onClose={() => setLibraryOpen(false)}
        documentFeedback={documentFeedback}
        onNoticeDismiss={onNoticeDismiss}
      />
      <SaveCompositeDialog
        catalog={catalog}
        open={saveOpen && !ai.busy}
        onClose={() => setSaveOpen(false)}
      />
      {document.compatibility && (
        <details className="composition-recovery">
          <summary>Imported document recovery</summary>
          {document.compatibility.notices.map((n) => (
            <p key={n}>{n}</p>
          ))}
          <button
            type="button"
            onClick={() =>
              download(
                document.compatibility?.source,
                "original-experiment.json",
              )
            }
          >
            Export original document
          </button>
        </details>
      )}
      {!expanded && !appearancePreview && (
        <div ref={composer} className="builder-composer">
          <CommandBar
            placeholder={
              doc.authored?.nodes?.length
                ? "What would you like to change or explore?…"
                : "What would you like to explore? Try: Show me how springs work…"
            }
            chips={
              doc.authored?.nodes?.length
                ? doc.authored.nodes.some(
                    (node) => node.definition === "models/SpringMass",
                  )
                  ? [
                      "What happens if the spring is stronger?",
                      "Make it stop bouncing so much",
                      "Add a chart",
                    ]
                  : [
                      "Add a slider I can change",
                      "Add an example to compare",
                      "Add a chart",
                    ]
                : [
                    "Show me how springs work",
                    "Show me how pendulums work",
                    "Why do traffic jams happen?",
                    "Show me how a ball flies",
                  ]
            }
            disabled={ai.busy}
            status={ai.status}
            value={ai.draft}
            onChange={ai.setDraft}
            landing={false}
            compact={true}
            lastRequest={ai.lastRequest}
            onSubmit={ai.onPrompt}
            onStop={ai.cancel}
            onOpenLibrary={() =>
              openLibrary(
                /\b(chart|graph|plot)\b/i.test(ai.draft) ? "displays" : "all",
              )
            }
            submitLabel={
              doc.authored?.nodes?.length
                ? "Update experiment"
                : "Build experiment"
            }
          />
        </div>
      )}
    </main>
  );
}
