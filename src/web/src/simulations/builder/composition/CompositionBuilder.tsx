"use client";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { SchemaForm } from "../../components/controls/SchemaForm";
import { RecipeLesson } from "../../components/views/RecipeLesson";
import { regenerateTruss } from "../../runtime/authoring/regenerateTruss";
import { requireValue } from "../../runtime/authoring/requireValue";
import { object } from "../../runtime/parameterSchema";
import { ComponentDialog } from "../ComponentDialog";
import {
  type ExperimentDocument,
  isRunnableDocument,
  validateRunnableDocument,
} from "../document";
import { deleteComponents } from "../editor/selection";
import { SaveCompositeDialog } from "../library/SaveCompositeDialog";
import { ComponentSettings } from "./ComponentSettings";
import { CompositionGraph } from "./CompositionGraph";
import { CompositionLibrary } from "./CompositionLibrary";
import {
  ManualComponentSettings,
  manualDefinition,
} from "./ManualComponentSettings";
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
  onZoom: (v: number) => void;
}) {
  const catalog = useComponentCatalog(doc, edit);
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const feedback = catalog.feedback;
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
        {(expanded || tab === "Build") && (
          <div className={`composition-preview ${mobile ? "is-mobile" : ""}`}>
            <RecipeLesson
              document={requireValue(valid.authored)}
              authoring={!expanded}
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
              onCapture={(next) =>
                change("Capture starting values", () => next)
              }
            />
          </div>
        )}
      </div>
      <ComponentDialog
        open={!expanded && !!selected}
        title={
          current?.label ??
          document.groups.find((g) => g.id === selected)?.label ??
          "Lesson settings"
        }
        onClose={() => setSelected("")}
        wide={selected === "lesson" || !!manualDefinition(current)}
      >
        <output>{feedback || notice}</output>
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
    </main>
  );
}
