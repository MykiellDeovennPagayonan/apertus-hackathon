import { publicDefinition } from "../../components/catalog";
import { SchemaForm } from "../../components/controls/SchemaForm";
import { object } from "../../runtime/parameterSchema";
import { ComponentDialog } from "../ComponentDialog";
import { type ComponentCatalog, download } from "./useComponentCatalog";
export function CompositionLibrary({
  catalog,
  open,
  onClose,
}: {
  catalog: ComponentCatalog;
  open: boolean;
  onClose: () => void;
}) {
  const {
    query,
    search,
    category,
    categorize,
    compatibility,
    setCompatibility,
    allRecipes,
    recipes,
    recipeCompatibility,
    insert,
    setRecipePreview,
    choices,
    componentCompatibility,
    add,
    importRecipe,
    recovery,
    retain,
    recipePreview,
    destination,
    setDestination,
    document,
  } = catalog;
  return (
    <ComponentDialog open={open} title="Add a component" wide onClose={onClose}>
      <div className="composition-catalog">
        <label>
          Destination canvas
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Automatic / independent lab</option>
            {document.nodes
              .filter(
                (n) => publicDefinition(n.definition).category === "canvases",
              )
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
          </select>
        </label>
        <output>{catalog.feedback}</output>
        <label>
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => categorize(e.target.value)}>
            {[
              "prebuilt",
              "saved",
              "all",
              "models",
              "controls",
              "displays",
              "canvases",
              "appearance",
              "behaviors",
              "resources",
              "layout",
            ].map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compatibility
          <select
            value={compatibility}
            onChange={(e) =>
              setCompatibility(e.target.value as "all" | "compatible")
            }
          >
            <option value="all">All components</option>
            <option value="compatible">Compatible with selection</option>
          </select>
        </label>
        {(category === "prebuilt" ||
          category === "saved" ||
          category === "all") &&
          allRecipes
            .filter(
              (r) =>
                category !== "saved" ||
                recipes.some((saved) => saved.id === r.id),
            )
            .filter((r) =>
              `${r.title} ${r.description} ${r.tags.join(" ")}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .filter(
              (r) =>
                compatibility === "all" || recipeCompatibility(r).compatible,
            )
            .map((r) => (
              <article key={r.id}>
                <strong>{r.title}</strong>
                <small>
                  Prebuilt · {r.document.nodes.length} children ·{" "}
                  {r.tags.join(", ")}
                </small>
                <p>{r.description}</p>
                <small>{recipeCompatibility(r).reason}</small>
                <button
                  type="button"
                  disabled={!recipeCompatibility(r).compatible}
                  onClick={() => {
                    if (insert(r)) onClose();
                  }}
                >
                  Insert
                </button>
                <button type="button" onClick={() => setRecipePreview(r)}>
                  Preview contents
                </button>
                {r.parameters.length > 0 && (
                  <details>
                    <summary>Customize exposed parameters</summary>
                    <SchemaForm
                      schema={object(
                        Object.fromEntries(
                          r.parameters.map((parameter) => [
                            parameter.name,
                            parameter.schema,
                          ]),
                        ),
                      )}
                      initial={Object.fromEntries(
                        r.parameters.map((parameter) => [
                          parameter.name,
                          parameter.default,
                        ]),
                      )}
                      label={`Configure and insert ${r.title}`}
                      onSubmit={(values) => {
                        const accepted = insert(r, values);
                        if (accepted) onClose();
                        return accepted
                          ? { accepted: true }
                          : {
                              accepted: false,
                              error: "Insertion was rejected",
                            };
                      }}
                    />
                  </details>
                )}
                <button
                  type="button"
                  onClick={() => download(r, "prebuilt.json")}
                >
                  Export prebuilt
                </button>
              </article>
            ))}
        {category !== "prebuilt" &&
          category !== "saved" &&
          choices.map((d) => (
            <article key={d.id}>
              <strong>{d.title}</strong>
              <small>
                {d.category} · {d.placement.join(", ")}
              </small>
              <p>{d.description}</p>
              <small>{componentCompatibility(d).reason}</small>
              <button
                type="button"
                onClick={() => {
                  if (add(d.id)) onClose();
                }}
              >
                {d.application ? "Apply preset" : "Add component"}
              </button>
              <details>
                <summary>Details</summary>
                <p>Tags: {d.tags.join(", ") || "none"}</p>
                <p>
                  Inputs: {Object.keys(d.inputs).join(", ") || "none"}
                  {"; "}outputs: {Object.keys(d.outputs).join(", ") || "none"}
                </p>
                {d.assumptions.length > 0 && (
                  <p>Assumptions: {d.assumptions.join(" ")}</p>
                )}
              </details>
            </article>
          ))}
        <label>
          Import prebuilt
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await importRecipe(await file.text());
              e.target.value = "";
            }}
          />
        </label>
        {recovery && (
          <>
            <textarea
              aria-label="Retained failed recipe"
              value={recovery}
              onChange={(e) => retain(e.target.value)}
            />
            <button type="button" onClick={() => importRecipe(recovery)}>
              Retry import
            </button>
          </>
        )}

        {recipePreview && (
          <section
            className="composition-recipe-preview"
            aria-label={`Preview ${recipePreview.title}`}
          >
            <h3>{recipePreview.title}</h3>
            <p>{recipePreview.description}</p>
            <ul>
              {recipePreview.document.nodes.map((n) => (
                <li key={n.id}>
                  {n.label} · {publicDefinition(n.definition).title}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setRecipePreview(null)}>
              Close preview
            </button>
          </section>
        )}
      </div>
    </ComponentDialog>
  );
}
