import { parseDocument } from "../../simulations/builder/document/serialization";
import {
  validateDocument,
  validateRunnableDocument,
} from "../../simulations/builder/document/validateDocument";
import type { CompositeRecipe } from "../../simulations/runtime/authoring/types";
import { assertData } from "../../simulations/runtime/authoring/validate";
import { parseRecipe } from "../../simulations/runtime/recipes/schema";
import { ProjectError, type ProjectPayload, type ProjectType } from "./types";
export function nameFields(value: unknown) {
  if (typeof value !== "string" || /[\p{Cc}\p{Cf}]/u.test(value))
    throw new ProjectError(
      "Use a name without control characters or line breaks.",
    );
  const name = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!name || Array.from(name).length > 100)
    throw new ProjectError("Choose a name between 1 and 100 characters.");
  return { name, normalizedName: name.toLowerCase() };
}
export function identity(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9/_:.-]{0,159}$/.test(value)
  )
    throw new ProjectError("Invalid project identity.");
  return value;
}
export function revision(value: unknown, allowNull = false): number | null {
  if (allowNull && value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new ProjectError("A valid expected save revision is required.");
  return value;
}
export function record(
  input: unknown,
  fields: string[],
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ProjectError("Expected a project record.");
  for (const key of Object.keys(input))
    if (!fields.includes(key))
      throw new ProjectError(`Unexpected field: ${key}.`);
  return input as Record<string, unknown>;
}
export function projectType(value: unknown): ProjectType {
  if (value !== "experiment" && value !== "composition")
    throw new ProjectError("Choose experiment or composition.");
  return value;
}
export function text(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || Array.from(value).length > max)
    throw new ProjectError(`${label} must contain at most ${max} characters.`);
  return value.trim();
}
export function tags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 10)
    throw new ProjectError("Use at most ten tags.");
  return [...new Set(value.map((tag) => text(tag, 40, "Tag")).filter(Boolean))];
}
export function payload(type: ProjectType, input: unknown): ProjectPayload {
  try {
    assertData(input);
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 1_500_000)
      throw new Error("Project content is too large.");
    if (type === "composition") return parseRecipe(input);
    validateDocument(input);
    return structuredClone(input);
  } catch (error) {
    throw new ProjectError(
      error instanceof Error ? error.message : "Invalid project content.",
    );
  }
}
/** Current recipes contain expanded graph content and registered catalog dependencies only. */
export function publicPayload(
  type: ProjectType,
  input: ProjectPayload,
): ProjectPayload {
  const copy = payload(type, input);
  if (type === "experiment") {
    const fields = [
      "documentVersion",
      "recipeMetadata",
      "authored",
      "scene",
      "template",
      "recipe",
      "lesson",
      "presentation",
      "editor",
    ];
    const portable = Object.fromEntries(
      Object.entries(copy).filter(([key]) => fields.includes(key)),
    );
    const document = parseDocument(JSON.stringify(portable));
    if (document.authored && !document.authored.nodes.length)
      throw new ProjectError(
        "Add at least one component before publishing an experiment.",
      );
    if (document.authored) delete document.authored.compatibility;
    validateRunnableDocument(document);
    if (document.recipeMetadata?.nested.length)
      throw new ProjectError("Expand nested recipes before publishing.");
    return document;
  }
  const recipeFields = [
    "recipeVersion",
    "catalog",
    "id",
    "version",
    "title",
    "description",
    "tags",
    "document",
    "nested",
    "parameters",
    "discovery",
    "externalPorts",
    "dependencies",
    "assumptions",
  ];
  const recipe = Object.fromEntries(
    Object.entries(copy).filter(([key]) => recipeFields.includes(key)),
  ) as CompositeRecipe;
  if (recipe.recipeVersion !== 2 || recipe.nested.length)
    throw new ProjectError(
      "Expand this composition into the current recipe format before publishing.",
    );
  if (!recipe.document.nodes.length && !recipe.document.resources.length)
    throw new ProjectError("Add content before publishing a composition.");
  delete recipe.document.compatibility;
  return payload(type, recipe);
}
export function renamePayload(
  type: ProjectType,
  input: ProjectPayload,
  name: string,
): ProjectPayload {
  const copy = structuredClone(input);
  if (type === "composition") {
    const recipe = copy as CompositeRecipe;
    recipe.title = name;
    recipe.document.lesson.title = name;
  } else {
    const document =
      copy as import("../../simulations/builder/document/types").ExperimentDocument;
    document.lesson.title = name;
    if (document.authored) document.authored.lesson.title = name;
    if (document.recipeMetadata) document.recipeMetadata.title = name;
  }
  return payload(type, copy);
}
