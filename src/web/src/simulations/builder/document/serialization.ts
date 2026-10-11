import { unwrapPortable } from "../../../lib/projects/portable";
import {
  builtInRecipe,
  modelRecipe,
} from "../../components/composites/catalog";
import { convertToBoard, extent } from "../../runtime/authoring/board";
import {
  migrateControlDependencies,
  migrateControls,
} from "../../runtime/authoring/migrateControls";
import { migrateBoardDrawings } from "../../runtime/authoring/migrateDrawings";
import { insertRecipe } from "../../runtime/authoring/recipes";
import { requireValue } from "../../runtime/authoring/requireValue";
import { spatialRecipeDocument } from "../../runtime/authoring/spatialMigration";
import {
  type CompositeRecipe,
  emptyAuthoredDocument,
} from "../../runtime/authoring/types";
import { validateAuthoredDocument } from "../../runtime/authoring/validate";
import { arrangeFocusedExperiment } from "../../runtime/recipes/compatibility/presentation";
import { loadRecipe as loadAuthoredRecipe } from "../../runtime/recipes/loadRecipe";
import { serializeRecipe as serializeAuthoredRecipe } from "../../runtime/recipes/serializeRecipe";
import { parseRecipe, resolveRecipe } from "../../runtime/resolver";
import { canonicalDocument, fromAssembly } from "./canonical";
import { fromRecipe } from "./legacy";
import type { ExperimentDocument } from "./types";
import { validateDocument } from "./validateDocument";
export function parseDocument(source: string): ExperimentDocument {
  const input: unknown = unwrapPortable(JSON.parse(source)).payload;
  if (input && typeof input === "object" && "documentVersion" in input) {
    if ("authored" in input && input.authored) {
      const original =
        input.authored as import("../../runtime/authoring/types").AuthoredDocument;
      input.authored = migrateControls(original);
      const metadata =
        "recipeMetadata" in input
          ? (input.recipeMetadata as
              | Omit<CompositeRecipe, "document">
              | undefined)
          : undefined;
      if (Array.isArray(metadata?.dependencies))
        metadata.dependencies = migrateControlDependencies(
          original,
          input.authored as import("../../runtime/authoring/types").AuthoredDocument,
          metadata.dependencies,
        );
    }
    validateDocument(input);
    if (input.authored) {
      input.authored = migrateBoardDrawings(migrateControls(input.authored));
      input.editor = structuredClone(input.authored.editor);
    }
    return input;
  }
  if (input && typeof input === "object" && "formatVersion" in input) {
    const migrated = migrateControls(
      input as import("../../runtime/authoring/types").AuthoredDocument,
    );
    validateAuthoredDocument(migrated);
    return canonicalDocument(migrateBoardDrawings(migrated));
  }
  if (input && typeof input === "object" && "recipeVersion" in input) {
    if ((input as CompositeRecipe).recipeVersion === 1) {
      const prefix = crypto.randomUUID();
      const recipe = input as CompositeRecipe;
      const authored = insertRecipe(
        emptyAuthoredDocument(),
        recipe,
        builtInRecipe,
        (id) => `${prefix}/${id}`,
      );
      authored.lesson = structuredClone(recipe.document.lesson);
      return canonicalDocument(authored);
    }
    const { recipe, document } = loadAuthoredRecipe(input);
    const { document: _document, ...recipeMetadata } = recipe;
    const result = canonicalDocument(document);
    result.recipeMetadata = recipeMetadata;
    return result;
  }
  const recipe = parseRecipe(source);
  const resolved = resolveRecipe(recipe);
  if (resolved.demo === "gas") {
    const gas = modelRecipe("prefabs/AuthoredGasContainer");
    const model = requireValue(
      gas.document.nodes.find((node) => node.id === "model"),
    );
    model.configuration.inputs = structuredClone(
      resolved.instances[0].parameters,
    );
    const authored = insertRecipe(
      emptyAuthoredDocument(),
      gas,
      builtInRecipe,
      (id) => `gas-experiment/${id}`,
    );
    authored.lesson = structuredClone(gas.document.lesson);
    authored.compatibility = {
      source: structuredClone(recipe) as unknown as Record<string, unknown>,
      notices: [],
    };
    authored.presentation = convertToBoard(authored);
    const rectangles = [
      { x: 0, y: 0, width: 768, height: 360 },
      { x: 792, y: 0, width: 360, height: 160 },
      { x: 792, y: 184, width: 360, height: 160 },
    ];
    authored.presentation.items.forEach((item, index) => {
      item.rect = rectangles[index];
    });
    authored.presentation.startView = extent(rectangles);
    return canonicalDocument(authored);
  }
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
    const authored = insertRecipe(
      emptyAuthoredDocument(),
      r,
      builtInRecipe,
      (id) => `imported/${id}`,
    );
    authored.lesson = structuredClone(r.document.lesson);
    if (kind === "counting") arrangeFocusedExperiment(authored, "counting");
    return canonicalDocument(authored);
  }
}
export function serializeDocument(doc: ExperimentDocument) {
  validateDocument(doc);
  if (doc.authored && doc.recipeMetadata)
    return serializeAuthoredRecipe({
      ...doc.recipeMetadata,
      document: doc.authored,
    });
  return JSON.stringify(doc, null, 2);
}
