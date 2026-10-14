import { validateDocument } from "../../simulations/builder/document/validateDocument";
import type { SavedExperiment } from "../../simulations/builder/persistence/storage";
import type { CompositeRecipe } from "../../simulations/creation-and-editing/authoring-engine/document";
import { parseRecipe } from "../../simulations/creation-and-editing/validator/parseRecipe";

function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The library response is unreadable.");
}
function revision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new Error("The saved revision is unreadable.");
  return value;
}
function experiment(value: unknown): SavedExperiment & { revision: number } {
  record(value);
  if (
    typeof value.id !== "string" ||
    (value.recovery !== undefined && typeof value.recovery !== "string")
  )
    throw new Error("The saved experiment is unreadable.");
  validateDocument(value.document);
  return {
    id: value.id,
    document: value.document,
    revision: revision(value.revision),
    ...(value.recovery === undefined ? {} : { recovery: value.recovery }),
  };
}
function component(value: unknown) {
  record(value);
  return {
    recipe: parseRecipe(value.recipe),
    revision: revision(value.revision),
  };
}
async function request(
  kind: "simulations" | "components",
  ownerId: string,
  body?: unknown,
) {
  const response = await fetch(`/api/library/${kind}`, {
    method: body === undefined ? "GET" : "PUT",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "X-Library-Owner": ownerId,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result: unknown = await response.json();
  record(result);
  if (!response.ok)
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : "Your library is unavailable.",
    );
  return result;
}
export async function loadRemoteSimulations(ownerId: string) {
  const { entries } = await request("simulations", ownerId);
  if (!Array.isArray(entries))
    throw new Error("The saved library is unreadable.");
  return entries.map(experiment);
}
export async function saveRemoteSimulation(
  entry: SavedExperiment,
  ownerId: string,
  expectedRevision: number | null,
) {
  const result = await request("simulations", ownerId, {
    id: entry.id,
    document: entry.document,
    ...(entry.recovery === undefined ? {} : { recovery: entry.recovery }),
    expectedRevision,
  });
  return experiment(result.entry);
}
export async function loadRemoteComponents(ownerId: string) {
  const { entries } = await request("components", ownerId);
  if (!Array.isArray(entries))
    throw new Error("The component library is unreadable.");
  return entries.map(component);
}
export async function saveRemoteComponent(
  recipe: CompositeRecipe,
  ownerId: string,
  expectedRevision: number | null = null,
) {
  const result = await request("components", ownerId, {
    recipe,
    expectedRevision,
  });
  return component(result.entry);
}
