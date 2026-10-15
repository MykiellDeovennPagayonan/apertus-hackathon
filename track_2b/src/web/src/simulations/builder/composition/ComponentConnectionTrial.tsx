"use client";
import { useMemo, useState } from "react";
import {
  applyComponentSuggestions,
  componentTrial,
} from "../../creation-and-editing/authoring-engine/componentTrial";
import type {
  AuthoredDocument,
  CompositeRecipe,
} from "../../creation-and-editing/authoring-engine/document";
import { RecipeLesson } from "../../creation-and-editing/simulation/RecipeLesson";
import type { ComponentCatalog } from "./useComponentCatalog";

export function ComponentConnectionTrial({
  recipe,
  catalog,
}: {
  recipe: CompositeRecipe;
  catalog?: ComponentCatalog;
}) {
  const choices = useMemo(
    () => componentTrial(recipe, catalog?.document),
    [recipe, catalog?.document],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [trial, setTrial] = useState<AuthoredDocument | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const prepare = () =>
    applyComponentSuggestions(choices.document, choices.suggestions, selected);
  return (
    <details className="component-connection-trial">
      <summary>
        Suggested connections
        {choices.suggestions.length ? ` (${choices.suggestions.length})` : ""}
      </summary>
      <p>
        Choose controls and displays to try. Your saved HTML component stays
        independent.
      </p>
      {choices.suggestions.map((s) => (
        <label className="project-check" key={s.id}>
          <input
            type="checkbox"
            checked={selected.includes(s.id)}
            onChange={(e) => {
              setSelected(
                e.target.checked
                  ? [...selected, s.id]
                  : selected.filter((id) => id !== s.id),
              );
              setTrial(null);
              setError("");
            }}
          />
          <span>{s.label}</span>
        </label>
      ))}
      {!choices.suggestions.length && (
        <p>This component has no declared connections.</p>
      )}
      <div className="project-actions">
        <button
          type="button"
          onClick={() => {
            try {
              setTrial(prepare());
              setRevision((r) => r + 1);
              setError("");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not connect these components.",
              );
            }
          }}
        >
          Try selected connections
        </button>
        {catalog && (
          <button
            type="button"
            onClick={() => {
              try {
                const document = prepare();
                if (
                  !catalog.change(
                    `Add ${recipe.title} with connections`,
                    () => document,
                  )
                )
                  throw new Error("The builder rejected this change.");
                setError("Added to your experiment.");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not add component.",
                );
              }
            }}
          >
            Add to experiment with connections
          </button>
        )}
        {trial && (
          <button type="button" onClick={() => setTrial(null)}>
            Stop trial
          </button>
        )}
      </div>
      {error && <output aria-live="polite">{error}</output>}
      {trial && (
        <section
          className="publication-preview"
          aria-label="Component connection trial"
        >
          <RecipeLesson key={revision} document={trial} />
        </section>
      )}
    </details>
  );
}
