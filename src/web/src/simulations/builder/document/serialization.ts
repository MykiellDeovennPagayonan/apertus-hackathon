import {
  builtInRecipe,
  modelRecipe,
} from "../../components/composites/catalog";
import { migrateBoardDrawings } from "../../runtime/authoring/migrateDrawings";
import { insertRecipe } from "../../runtime/authoring/recipes";
import { requireValue } from "../../runtime/authoring/requireValue";
import { spatialRecipeDocument } from "../../runtime/authoring/spatialMigration";
import {
  type CompositeRecipe,
  emptyAuthoredDocument,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import { parseRecipe, resolveRecipe } from "../../runtime/resolver";
import { canonicalDocument, fromAssembly } from "./canonical";
import { fromRecipe } from "./legacy";
import type { ExperimentDocument } from "./types";
import { validateDocument } from "./validateDocument";
export function parseDocument(source: string): ExperimentDocument {
  const input: unknown = JSON.parse(source);
  if (input && typeof input === "object" && "documentVersion" in input) {
    validateDocument(input);
    if (input.authored) {
      input.authored = migrateBoardDrawings(input.authored);
      input.editor = structuredClone(input.authored.editor);
    }
    return input;
  }
  if (input && typeof input === "object" && "formatVersion" in input) {
    validateAuthoredDocument(input);
    return canonicalDocument(migrateBoardDrawings(input));
  }
  if (input && typeof input === "object" && "recipeVersion" in input) {
    const prefix = crypto.randomUUID();
    return canonicalDocument(
      insertRecipe(
        emptyAuthoredDocument(),
        input as CompositeRecipe,
        builtInRecipe,
        (id) => `${prefix}/${id}`,
      ),
    );
  }
  const recipe = parseRecipe(source);
  if (["projectile", "bridge", "town"].includes(resolveRecipe(recipe).demo))
    return canonicalDocument(spatialRecipeDocument(recipe));
  if (
    recipe.assembly &&
    !recipe.assembly.instances.every(
      (i) => i.prefab.ref === "prefabs/math-foundations/Line",
    )
  )
    return fromAssembly(recipe.assembly);
  try {
    return fromRecipe(recipe);
  } catch (error) {
    const demo = recipe.composition.ref.replace("compositions/", "");
    const map: Record<string, string> = {
      CountingExperiment: "counting",
      ArithmeticExperiment: "arithmetic",
      EqualGroupsExperiment: "equal-groups",
      FractionNumberLineExperiment: "fraction-number-line",
      RatioExperiment: "ratio",
      AreaPerimeterExperiment: "area-perimeter",
      CoordinateExperiment: "coordinates",
      ProbabilityExperiment: "probability",
    };
    const kind = map[demo];
    if (!kind) throw error;
    const r = modelRecipe(`models/${kind}`);
    Object.assign(
      requireValue(r.document.nodes.find((n) => n.id === "model"))
        .configuration,
      recipe.parameters,
    );
    return canonicalDocument(
      insertRecipe(emptyAuthoredDocument(), r, builtInRecipe, (id) => id),
    );
  }
}
export function serializeDocument(doc: ExperimentDocument) {
  validateDocument(doc);
  return JSON.stringify(doc, null, 2);
}
