"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { publicDefinition } from "../../components/catalog";
import { SchemaForm } from "../../components/controls/SchemaForm";
import { RecipeLesson } from "../../components/views/RecipeLesson";
import {
  reconcileBoard,
  separateBoardLayout,
} from "../../runtime/authoring/board";
import { regenerateTruss } from "../../runtime/authoring/regenerateTruss";
import { requireValue } from "../../runtime/authoring/requireValue";
import { object } from "../../runtime/parameterSchema";
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
import { FeedbackView } from "./FeedbackView";
import { makeFeedback } from "./feedback";
import {
  ManualComponentSettings,
  manualDefinition,
} from "./ManualComponentSettings";
import CommandBar from "../../../app/_components/CommandBar";
import { download, useComponentCatalog } from "./useComponentCatalog";
import { useBuilderAi } from "./useBuilderAi";
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
  saveState,
  error,
  notice,
  fileMenu,
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
  saveState: string;
  error: string;
  notice: string;
  fileMenu: ReactNode;
  expanded: boolean;
  onExpanded: (v: boolean) => void;
  onZoom: (v: number) => void;
}) {
  const boardClipboard = useRef<BoardClipboard | null>(null);
  const documentMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent | KeyboardEvent) => {
      const menu = documentMenu.current;
      if (!menu?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        menu.open = false;
        menu.querySelector("summary")?.focus();
      } else if (!menu.contains(event.target as Node)) menu.open = false;
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, []);
  const catalog = useComponentCatalog(doc, edit);
  const ai = useBuilderAi({ doc, edit });
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
  const noticeFailure = /Couldn't |could not|unsupported or invalid/i.test(
    notice,
  );
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
        <Link href="/experiments">← Experiments</Link>
        <label className="composition-document-title">
          <span className="builder-sr-only">Experiment title</span>
          <input
            aria-label="Experiment title"
            value={doc.lesson.title}
            placeholder="Untitled experiment"
            maxLength={100}
            readOnly={expanded}
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
        <output className="composition-save-state">
          {saving ? "Saving…" : saveState}
        </output>
        {!expanded && (
          <>
            <button type="button" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
            <button type="button" disabled={!canRedo} onClick={redo}>
              Redo
            </button>
            <button
              type="button"
              className="composition-save-action"
              aria-label={saveLabel}
              disabled={!!error || saving}
              onClick={onSave}
            >
              <span className="toolbar-full-label">{saveLabel}</span>
              <span className="toolbar-short-label">
                {saving ? "Saving…" : "Save"}
              </span>
            </button>
            <details
              ref={documentMenu}
              className="composition-document-menu composition-view-menu"
            >
              <summary aria-label="More document actions">More</summary>
              <div>
                {history}
                {fileMenu}
              </div>
            </details>
          </>
        )}
        <button
          type="button"
          className="builder-primary"
          aria-label={expanded ? "Return to builder" : "Try lesson ↗"}
          onClick={() => {
            if (!expanded) {
              try {
                validateRunnableDocument(doc);
                catalog.report("");
              } catch (e) {
                catalog.report(
                  e instanceof Error ? e.message : "Complete the lesson first",
                );
                if (!doc.lesson.title || !doc.lesson.instruction)
                  setSelected("lesson");
                return;
              }
            }
            setSelected("");
            setAppearancePreview(false);
            onExpanded(!expanded);
          }}
        >
          <span className="toolbar-full-label">
            {expanded ? "Return to builder" : "Try lesson ↗"}
          </span>
          <span className="toolbar-short-label">
            {expanded ? "Edit" : "Try ↗"}
          </span>
        </button>
      </header>
      {error && (
        <section className="builder-feedback is-error" role="alert">
          <strong>Preview is using the last valid draft</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setTab("Connections")}>
            Review connections
          </button>
        </section>
      )}
      {!error && notice && (
        <FeedbackView
          message={makeFeedback(
            notice,
            noticeFailure ? "error" : "info",
            "Update document",
            "document.action",
          )}
        />
      )}
      {!libraryOpen && <FeedbackView message={catalog.message} />}
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
            data-composition-add
            onClick={() => openLibrary()}
          >
            + Add component
          </button>
          {tab === "Build" && (
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
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.75" />
              </svg>
              <span>{appearancePreview ? "Editing view" : "Preview"}</span>
            </button>
          )}
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
        footerLabel={
          /^displays\/(DataTable|Chart|Histogram|Heatmap)$/.test(
            current?.definition ?? "",
          )
            ? "Close settings"
            : "Done"
        }
        footerPrimary={
          !/^displays\/(DataTable|Chart|Histogram|Heatmap)$/.test(
            current?.definition ?? "",
          )
        }
        wide={selected === "lesson" || !!manualDefinition(current)}
      >
        <FeedbackView message={catalog.message} />
        {notice && (
          <FeedbackView
            message={makeFeedback(
              notice,
              noticeFailure ? "error" : "info",
              "Update document",
              "document.action",
            )}
          />
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
            Delete component
          </button>
        )}
      </ComponentDialog>
      <CompositionLibrary
        catalog={catalog}
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAiBuild={(prompt) => {
          ai.onPrompt(prompt);
          setLibraryOpen(false);
        }}
        aiBusy={ai.busy}
      />
      <SaveCompositeDialog
        catalog={catalog}
        open={saveOpen}
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
      <div className="builder-composer">
        <CommandBar
          placeholder={
            doc.authored?.nodes?.length
              ? "Add components, wire connections, or configure this composite…"
              : "Describe a composite to build (e.g. spring-mass oscillator with slider and readout)…"
          }
          chips={
            doc.authored?.nodes?.length
              ? [
                  "Add slider control component wired to model input",
                  "Add observation readout component wired to output",
                  "Connect available component ports",
                  "Adjust model configuration parameters",
                  "Group components into a reusable composite with exposed parameters",
                ]
              : [
                  "Assemble harmonic oscillator composite with mass slider and readout",
                  "Build inclined track composite with friction control and speedometer",
                  "Create balance scale composite with weights and angle readout",
                  "Assemble projectile launcher composite with launch angle control",
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
          submitLabel={
            doc.authored?.nodes?.length ? "Update Composite" : "Build Composite"
          }
        />
      </div>
    </main>
  );
}
