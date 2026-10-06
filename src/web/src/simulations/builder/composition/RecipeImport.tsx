"use client";
import { useEffect, useRef, useState } from "react";
import { validateRecipe } from "../../runtime/authoring/recipes";
import type { CompositeRecipe } from "../../runtime/authoring/types";
import { FeedbackView } from "./FeedbackView";
import { type Feedback, makeFeedback } from "./feedback";
import type { ComponentCatalog } from "./useComponentCatalog";
export function RecipeImport({
  catalog,
  onReveal,
  onBack,
}: {
  catalog: ComponentCatalog;
  onReveal: (recipe: CompositeRecipe) => void;
  onBack: () => void;
}) {
  const [filename, setFilename] = useState("");
  const [recipe, setRecipe] = useState<CompositeRecipe | null>(null);
  const [message, setMessage] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const readSequence = useRef(0);
  useEffect(() => heading.current?.focus(), []);
  const inspect = (text: string) => {
    catalog.retain(text);
    setRecipe(null);
    setMessage(null);
    let parsed: CompositeRecipe;
    try {
      parsed = JSON.parse(text);
    } catch {
      setMessage(
        makeFeedback(
          "This file isn't valid JSON. Choose an exported assembly or correct the retained JSON below.",
          "error",
          "read assembly",
          "import.parse",
        ),
      );
      return;
    }
    try {
      validateRecipe(parsed);
      // Nested recipes must be present and valid before the import can be saved.
      const seen = new Set<string>();
      const check = (r: CompositeRecipe, path: Set<string>) => {
        const key = `${r.id}@${r.version}`;
        if (path.has(key))
          throw new Error("Nested assembly dependencies contain a cycle.");
        if (seen.has(key)) return;
        validateRecipe(r);
        seen.add(key);
        for (const child of r.nested)
          check(
            catalog.resolve(child.recipe, child.version),
            new Set([...path, key]),
          );
      };
      check(parsed, new Set());
      setRecipe(parsed);
    } catch (e) {
      setMessage(
        makeFeedback(
          e instanceof Error ? e.message : "Unsupported assembly",
          "error",
          "validate assembly",
          "import.validation",
        ),
      );
    }
  };
  const read = async (file: File) => {
    const sequence = ++readSequence.current;
    setFilename(file.name);
    setBusy(true);
    setRecipe(null);
    setMessage(null);
    try {
      const text = await file.text();
      if (sequence === readSequence.current) inspect(text);
    } catch {
      if (sequence === readSequence.current)
        setMessage(
          makeFeedback(
            "The file couldn't be read. Choose it again to retry.",
            "error",
            "read file",
            "import.read",
          ),
        );
    } finally {
      if (sequence === readSequence.current) setBusy(false);
    }
  };
  const duplicate =
    recipe && catalog.allRecipes.some((r) => r.id === recipe.id);
  return (
    <section className="catalog-import-flow" aria-label="Import assembly">
      <button type="button" onClick={onBack}>
        ← Back to results
      </button>
      <h3 tabIndex={-1} ref={heading}>
        Import a saved assembly
      </h3>
      <p>
        Choose an exported JSON assembly. Review its contents before saving it
        to your library.
      </p>
      <fieldset
        className="catalog-file-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && !busy) void read(file);
        }}
      >
        <legend className="builder-sr-only">
          Choose or drop an assembly JSON file
        </legend>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="builder-sr-only"
          aria-label="Assembly JSON file"
          disabled={busy}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) void read(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy
            ? "Reading file…"
            : filename
              ? "Choose another file"
              : "Choose JSON file"}
        </button>
        <p>or drop a JSON file here</p>
        {filename && (
          <output aria-live="polite">
            {filename} ·{" "}
            {busy ? "Reading" : recipe ? "Validated" : "Needs review"}
          </output>
        )}
      </fieldset>
      <FeedbackView message={message} />
      {recipe && (
        <div className="catalog-import-review">
          <h4>{recipe.title}</h4>
          <p>{recipe.description}</p>
          <p>
            Version {recipe.version} ·{" "}
            {recipe.document.nodes.length + recipe.document.resources.length}{" "}
            components · {recipe.dependencies.length} dependencies ·{" "}
            {recipe.nested.length} nested assemblies
          </p>
          {duplicate && (
            <output>
              This identity already exists in the library. Save a separate copy
              to keep your existing assembly.
            </output>
          )}
          <button
            type="button"
            className="builder-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const imported = await catalog.importRecipe(
                catalog.recovery,
                !!duplicate,
              );
              setBusy(false);
              if (imported.recipe) onReveal(imported.recipe);
              else setMessage(imported.error);
            }}
          >
            {busy
              ? "Saving…"
              : duplicate
                ? "Save separate copy to library"
                : "Save to library"}
          </button>
        </div>
      )}
      {catalog.recovery && (
        <details>
          <summary>Technical details and retained JSON</summary>
          <textarea
            aria-label="Retained assembly JSON"
            rows={8}
            value={catalog.recovery}
            onChange={(e) => {
              catalog.retain(e.target.value);
              setRecipe(null);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inspect(catalog.recovery)}
          >
            Validate again
          </button>
        </details>
      )}
    </section>
  );
}
