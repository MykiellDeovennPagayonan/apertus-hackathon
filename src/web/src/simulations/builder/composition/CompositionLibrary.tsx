import { useEffect, useRef, useState } from "react";
import type { CompositeRecipe } from "../../creation-and-editing/authoring-engine/document";
import { catalogRecipeAllowed } from "../../registry/catalogScope";
import { object } from "../../registry/contracts/parameterSchema";
import type { PublicDefinition } from "../../registry/contracts/publicDefinition";
import { SchemaForm } from "../../registry/controls/SchemaForm";
import {
  definitionDiscovery,
  discoverySections,
  searchRank,
} from "../../registry/discovery";
import { publicDefinition } from "../../registry/index";
import { BuilderIcon } from "../BuilderIcon";
import { ComponentDialog } from "../ComponentDialog";
import { portLabel } from "../graph/authoredGraph";
import { FeedbackView } from "./FeedbackView";
import type { Feedback } from "./feedback";
import { RecipeImport } from "./RecipeImport";
import { type ComponentCatalog, download } from "./useComponentCatalog";

type Entry =
  | { definition: PublicDefinition; recipe?: never }
  | { recipe: CompositeRecipe; definition?: never };
const recipeMetadata = (r: CompositeRecipe) =>
  r.discovery ?? {
    kind: "composite" as const,
    group: "composites" as const,
    summary: r.description || "A reusable assembly of connected components.",
    placement: "Adds an assembly of connected components",
  };
const title = (entry: Entry) => (entry.definition ?? entry.recipe).title;
const metadata = (entry: Entry) =>
  entry.definition
    ? definitionDiscovery(entry.definition)
    : recipeMetadata(entry.recipe);
const badge = (entry: Entry) =>
  ({
    object: "Object · 1 component",
    component: "Component",
    model: "Model",
    preset: "Preset",
    composite: "Composite",
    experiment: "Experiment",
  })[metadata(entry).kind];
const identity = (entry: Entry) =>
  `${entry.definition ? "definition" : "recipe"}/${(entry.definition ?? entry.recipe).id}@${(entry.definition ?? entry.recipe).version}`;

export function CompositionLibrary({
  catalog,
  open,
  onClose,
  documentFeedback,
  onNoticeDismiss,
}: {
  catalog: ComponentCatalog;
  open: boolean;
  onClose: () => void;
  documentFeedback?: Feedback | null;
  onNoticeDismiss?: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeSection, setSection] = useState("all");
  const [importing, setImporting] = useState(false);
  const importOpener = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const resultsScroll = useRef(0);
  const results = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (detail) detailHeading.current?.focus();
    else if (opener.current?.isConnected) {
      if (results.current) results.current.scrollTop = resultsScroll.current;
      opener.current.focus({ preventScroll: true });
    }
  }, [detail]);
  useEffect(() => {
    if (!open) {
      setDetail(null);
      setImporting(false);
      setSection("all");
    } else searchInput.current?.focus();
  }, [open]);
  const entries: Entry[] = open
    ? [
        ...catalog.choices
          .filter(
            () =>
              !["prebuilt", "saved", "composites", "experiments"].includes(
                catalog.category,
              ),
          )
          .map((definition) => ({ definition })),
        ...catalog.allRecipes
          .filter(catalogRecipeAllowed)
          .filter((recipe) => {
            const meta = recipeMetadata(recipe);
            const terms = catalog.query
              .trim()
              .toLowerCase()
              .split(/\s+/)
              .filter(Boolean);
            return (
              ["all", "prebuilt", "saved", meta.group].includes(
                catalog.category,
              ) &&
              (catalog.category !== "saved" ||
                catalog.recipes.some(
                  (r) => r.id === recipe.id && r.version === recipe.version,
                )) &&
              terms.every((term) =>
                `${recipe.title} ${meta.summary} ${recipe.tags.join(" ")}`
                  .toLowerCase()
                  .includes(term),
              ) &&
              (catalog.compatibility === "all" ||
                catalog.recipeCompatibility(recipe).compatible)
            );
          })
          .map((recipe) => ({ recipe })),
      ]
    : [];
  const compatibility = (entry: Entry) =>
    entry.definition
      ? catalog.componentCompatibility(entry.definition)
      : catalog.recipeCompatibility(entry.recipe);
  const add = (entry: Entry, values?: Record<string, unknown>) => {
    const accepted = entry.definition
      ? catalog.add(entry.definition.id)
      : catalog.insert(entry.recipe, values);
    if (accepted) onClose();
    return accepted;
  };
  const insertionSummary = (entry: Entry) => compatibility(entry).reason;
  const showDetails = (entry: Entry, button: HTMLButtonElement) => {
    opener.current = button;
    resultsScroll.current = results.current?.scrollTop ?? 0;
    setDetail(entry);
  };
  return (
    <ComponentDialog
      open={open}
      title="Add a component"
      subtitle="Find the pieces for your experiment"
      icon="composites"
      wide
      onClose={onClose}
      footerLabel="Close library"
      footerPrimary={false}
      className="component-library-dialog"
    >
      {open && (
        <FeedbackView
          floating
          message={documentFeedback ?? null}
          onDismiss={onNoticeDismiss}
        />
      )}
      <div className="composition-catalog">
        <div className="catalog-controls" hidden={importing || !!detail}>
          <div className="catalog-search-field">
            <BuilderIcon name="search" />
            <label className="catalog-search">
              <span className="builder-sr-only">Search components</span>
              <input
                ref={searchInput}
                type="search"
                placeholder="Search components…"
                value={catalog.query}
                onChange={(e) => catalog.search(e.target.value)}
              />
            </label>
            {catalog.query && (
              <button
                type="button"
                className="catalog-search-clear"
                aria-label="Clear component search"
                onClick={() => {
                  catalog.search("");
                  searchInput.current?.focus();
                }}
              >
                <BuilderIcon name="close" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="catalog-filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="component-library-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 17h16M9 4v6M15 14v6" />
            </svg>
            Filters
            {(catalog.destination ||
              catalog.category !== "all" ||
              catalog.compatibility !== "all") && (
              <span className="catalog-filter-dot" aria-hidden="true" />
            )}
          </button>
          <div
            className="catalog-filters"
            id="component-library-filters"
            hidden={!filtersOpen}
          >
            <label>
              Destination canvas
              <select
                value={catalog.destination}
                onChange={(e) => catalog.setDestination(e.target.value)}
              >
                <option value="">Automatic / independent lab</option>
                {catalog.destinationMissing && (
                  <option value={catalog.destination}>
                    Selected canvas removed — choose another
                  </option>
                )}
                {catalog.document.nodes
                  .filter((n) => publicDefinition(n).category === "canvases")
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Category
              <select
                value={catalog.category}
                onChange={(e) => {
                  setSection("all");
                  catalog.categorize(e.target.value);
                  results.current?.scrollTo(0, 0);
                }}
              >
                <option value="all">All components</option>
                {discoverySections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
                <option value="saved">My components & composites</option>
                <option value="prebuilt">All prepared assemblies</option>
              </select>
            </label>
            <label>
              Compatibility
              <select
                value={catalog.compatibility}
                onChange={(e) =>
                  catalog.setCompatibility(
                    e.target.value as "all" | "compatible",
                  )
                }
              >
                <option value="all">All components</option>
                <option value="compatible">Compatible with selection</option>
              </select>
            </label>
          </div>
          {catalog.destinationMissing && (
            <div className="builder-feedback is-error" role="alert">
              <strong>Selected canvas removed</strong>
              <p>
                Choose another canvas above or use automatic placement to
                continue.
              </p>
              <button type="button" onClick={() => catalog.setDestination("")}>
                Use automatic placement
              </button>
            </div>
          )}
          {!detail && !importing && (
            <FeedbackView
              message={catalog.message}
              floating={catalog.message?.severity !== "error"}
              onDismiss={() => catalog.report("")}
            />
          )}
          <button
            type="button"
            className="catalog-import-button"
            ref={importOpener}
            onClick={() => {
              resultsScroll.current = results.current?.scrollTop ?? 0;
              catalog.report("");
              setImporting(true);
            }}
          >
            Import HTML or assembly
          </button>
        </div>
        <div className="catalog-browse" hidden={!!detail || importing}>
          <nav className="catalog-sections" aria-label="Component sections">
            <p>Browse library</p>
            <button
              type="button"
              aria-pressed={activeSection === "all"}
              onClick={() => {
                setSection("all");
                results.current?.scrollTo(0, 0);
              }}
            >
              <BuilderIcon name="grid" />
              <span>All components</span>
              <small>{entries.length}</small>
            </button>
            {discoverySections.map((section) => {
              const count = entries.filter(
                (entry) => metadata(entry).group === section.id,
              ).length;
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={!count}
                  aria-pressed={activeSection === section.id}
                  onClick={() => {
                    setSection(section.id);
                    results.current?.scrollTo(0, 0);
                  }}
                >
                  <BuilderIcon name={section.id} />
                  <span>{section.title}</span>
                  <small>{count}</small>
                </button>
              );
            })}
          </nav>
          <section
            className="catalog-results"
            ref={results}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll this labeled results region.
            tabIndex={0}
            aria-label="Component results"
          >
            <output className="catalog-result-count">
              {
                entries.filter(
                  (entry) =>
                    activeSection === "all" ||
                    metadata(entry).group === activeSection,
                ).length
              }{" "}
              results
              {catalog.query && ` for “${catalog.query}”`}
              {catalog.category !== "all" &&
                ` · ${discoverySections.find((s) => s.id === catalog.category)?.title ?? catalog.category}`}
            </output>
            {entries.filter(
              (entry) =>
                activeSection === "all" ||
                metadata(entry).group === activeSection,
            ).length === 0 && (
              <div className="catalog-empty">
                <h3>No components found</h3>
                <p>
                  Try a shorter search or reset your filters to browse the full
                  library.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSection("all");
                    catalog.search("");
                    catalog.categorize("all");
                    catalog.setCompatibility("all");
                    searchInput.current?.focus();
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
            {discoverySections.map((section) => {
              if (activeSection !== "all" && activeSection !== section.id)
                return null;
              const sectionEntries = entries
                .filter((entry) => metadata(entry).group === section.id)
                .sort(
                  (a, b) =>
                    searchRank(title(a), catalog.query) -
                      searchRank(title(b), catalog.query) ||
                    title(a).localeCompare(title(b)),
                );
              if (!sectionEntries.length) return null;
              return (
                <section
                  key={section.id}
                  data-section={section.id}
                  aria-label={section.title}
                >
                  <h3>
                    {section.title}
                    <small>{sectionEntries.length}</small>
                  </h3>
                  <div className="catalog-card-grid">
                    {sectionEntries.map((entry) => {
                      const state = compatibility(entry);
                      return (
                        <article key={identity(entry)}>
                          <div className="catalog-card-heading">
                            <span
                              className="catalog-card-icon"
                              aria-hidden="true"
                            >
                              <BuilderIcon name={section.id} />
                            </span>
                            <div>
                              <strong>{title(entry)}</strong>
                              <small className="catalog-kind">
                                {badge(entry)}
                              </small>
                            </div>
                          </div>
                          <p>{metadata(entry).summary}</p>
                          <small className="catalog-placement">
                            {state.compatible
                              ? insertionSummary(entry)
                              : state.reason}
                          </small>
                          <div className="catalog-card-actions">
                            <button
                              type="button"
                              className="builder-primary"
                              disabled={!state.compatible}
                              onClick={() => add(entry)}
                            >
                              {entry.recipe
                                ? metadata(entry).kind === "experiment"
                                  ? "Add experiment"
                                  : metadata(entry).kind === "component"
                                    ? "Add component"
                                    : "Add composite"
                                : entry.definition.application
                                  ? "Apply preset"
                                  : "Add component"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) =>
                                showDetails(entry, e.currentTarget)
                              }
                              aria-label={`Details for ${title(entry)}`}
                            >
                              Details <BuilderIcon name="forward" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </section>
        </div>
        {importing && (
          <RecipeImport
            catalog={catalog}
            onBack={() => {
              setImporting(false);
              requestAnimationFrame(() => {
                if (results.current)
                  results.current.scrollTop = resultsScroll.current;
                importOpener.current?.focus();
              });
            }}
            onReveal={(recipe) => {
              setImporting(false);
              catalog.search("");
              catalog.categorize("saved");
              catalog.setCompatibility("all");
              opener.current = importOpener.current;
              setDetail({ recipe });
            }}
          />
        )}
        {detail && !importing && (
          <section
            className="catalog-detail"
            aria-label={`Details for ${title(detail)}`}
          >
            <FeedbackView
              message={catalog.message}
              floating={catalog.message?.severity !== "error"}
              onDismiss={() => catalog.report("")}
            />
            <button
              className="catalog-back"
              type="button"
              onClick={() => setDetail(null)}
            >
              <BuilderIcon name="back" /> Back to results
            </button>
            <div className="catalog-detail-heading">
              <span className="catalog-detail-icon">
                <BuilderIcon name={metadata(detail).group} />
              </span>
              <div>
                <span className="catalog-kind">{badge(detail)}</span>
                <h3 ref={detailHeading} tabIndex={-1}>
                  {title(detail)}
                </h3>
                <p>{metadata(detail).summary}</p>
              </div>
            </div>
            <div className="catalog-detail-layout">
              <div className="catalog-detail-content">
                {detail.recipe && (
                  <figure
                    className="catalog-schematic"
                    aria-label={`Contents overview for ${title(detail)}`}
                  >
                    <div>
                      {[
                        "canvases",
                        "models",
                        "controls",
                        "displays",
                        "resources",
                        "layout",
                        "appearance",
                        "behaviors",
                      ]
                        .map((category) => ({
                          category,
                          count: [
                            ...detail.recipe.document.nodes,
                            ...detail.recipe.document.resources,
                          ].filter(
                            (n) => publicDefinition(n).category === category,
                          ).length,
                        }))
                        .filter((group) => group.count)
                        .map((group) => (
                          <span key={group.category}>
                            <strong>{group.count}</strong> {group.category}
                          </span>
                        ))}
                    </div>
                    <figcaption>
                      Contents overview · previewing does not change your
                      experiment
                    </figcaption>
                  </figure>
                )}
                {detail.recipe ? (
                  <>
                    <h4>
                      Included components (
                      {detail.recipe.document.nodes.length +
                        detail.recipe.document.resources.length}
                      )
                    </h4>
                    <ul>
                      {[
                        ...detail.recipe.document.nodes,
                        ...detail.recipe.document.resources,
                      ].map((n) => (
                        <li key={n.id}>
                          {n.label} <small>{publicDefinition(n).title}</small>
                        </li>
                      ))}
                    </ul>
                    <h4>Exposed connections</h4>
                    <ul>
                      {detail.recipe.externalPorts.map((p) => (
                        <li key={p.name}>
                          {p.name} · {p.direction} · {p.port.kind} {p.port.unit}{" "}
                          ·{" "}
                          {p.required === false
                            ? "connect later"
                            : "required on insertion"}
                        </li>
                      ))}
                    </ul>
                    {!detail.recipe.externalPorts.length && (
                      <p>
                        No declared ports. Expand the group or expose
                        connections in its settings.
                      </p>
                    )}
                    {detail.recipe.parameters.length > 0 && (
                      <details>
                        <summary>Customize exposed parameters</summary>
                        <SchemaForm
                          schema={object(
                            Object.fromEntries(
                              detail.recipe.parameters.map((p) => [
                                p.name,
                                p.schema,
                              ]),
                            ),
                          )}
                          initial={Object.fromEntries(
                            detail.recipe.parameters.map((p) => [
                              p.name,
                              p.default,
                            ]),
                          )}
                          label={`Configure and insert ${detail.recipe.title}`}
                          onSubmit={(values) =>
                            add(detail, values)
                              ? { accepted: true }
                              : {
                                  accepted: false,
                                  error:
                                    "Insertion was rejected. Check the destination and try again.",
                                }
                          }
                        />
                      </details>
                    )}
                    {detail.recipe.assumptions.length > 0 && (
                      <>
                        <h4>Assumptions</h4>
                        <p>{detail.recipe.assumptions.join(" ")}</p>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => download(detail.recipe, "composite.json")}
                    >
                      Export assembly
                    </button>
                  </>
                ) : (
                  <>
                    <h4>Connections</h4>
                    <p className="catalog-section-help">
                      Connect these ports to other pieces in your experiment.
                    </p>
                    <div className="catalog-port-groups">
                      {(
                        [
                          ["Inputs", detail.definition.inputs],
                          ["Outputs", detail.definition.outputs],
                          ["Actions", detail.definition.commands],
                        ] as const
                      ).map(([heading, ports]) => (
                        <section key={heading} className="catalog-port-group">
                          <h5>
                            {heading}
                            <span>{Object.keys(ports).length}</span>
                          </h5>
                          {Object.keys(ports).length ? (
                            <ul>
                              {Object.entries(ports).map(([name]) => (
                                <li key={name}>
                                  <span>{portLabel(name)}</span>
                                  <code>{name}</code>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>No {heading.toLowerCase()}</p>
                          )}
                        </section>
                      ))}
                    </div>
                    {detail.definition.assumptions.length > 0 && (
                      <>
                        <h4>Assumptions</h4>
                        <p>{detail.definition.assumptions.join(" ")}</p>
                      </>
                    )}
                  </>
                )}
              </div>
              <aside className="catalog-detail-add">
                <h4>Add to your experiment</h4>
                <label>
                  Destination canvas
                  <select
                    value={catalog.destination}
                    onChange={(event) =>
                      catalog.setDestination(event.target.value)
                    }
                  >
                    <option value="">Automatic / independent lab</option>
                    {catalog.destinationMissing && (
                      <option value={catalog.destination}>
                        Selected canvas removed — choose another
                      </option>
                    )}
                    {catalog.document.nodes
                      .filter(
                        (node) =>
                          publicDefinition(node).category === "canvases",
                      )
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.label}
                        </option>
                      ))}
                  </select>
                </label>
                <p>{insertionSummary(detail)}</p>
                <button
                  type="button"
                  className="builder-primary"
                  disabled={!compatibility(detail).compatible}
                  onClick={() => add(detail)}
                >
                  {detail.recipe
                    ? metadata(detail).kind === "experiment"
                      ? "Add experiment"
                      : metadata(detail).kind === "component"
                        ? "Add component"
                        : "Add composite"
                    : detail.definition.application
                      ? "Apply preset"
                      : "Add component"}
                </button>
                {!compatibility(detail).compatible && (
                  <p>{compatibility(detail).reason}</p>
                )}
              </aside>
            </div>
          </section>
        )}
      </div>
    </ComponentDialog>
  );
}
