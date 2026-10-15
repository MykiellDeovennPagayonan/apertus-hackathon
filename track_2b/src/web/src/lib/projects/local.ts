import { RECIPE_LIBRARY_KEY } from "../../simulations/builder/library/RecipeRepository";
import { LIBRARY_KEY } from "../../simulations/builder/persistence/storage";
import type { ProjectType } from "./types";

export async function deleteLocalProject(id: string, type: ProjectType) {
  const key = type === "experiment" ? LIBRARY_KEY : RECIPE_LIBRARY_KEY;
  const remove = () => {
    const entries = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(entries))
      throw new Error("The local library is unreadable. Nothing was deleted.");
    localStorage.setItem(
      key,
      JSON.stringify(entries.filter((entry) => entry?.id !== id)),
    );
  };
  if (navigator.locks) await navigator.locks.request(key, remove);
  else remove();
}
