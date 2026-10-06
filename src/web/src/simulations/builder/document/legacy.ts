import { requireRecord } from "../../runtime/records";
import { type Recipe, resolveRecipe } from "../../runtime/resolver";
import { type TemplateId, templateRecipe, templates } from "../descriptors";
import { composeLegacy } from "./migrations/composeLegacy";
import type { ControlRecord, ExperimentDocument, ResultRecord } from "./types";
import { validateDocument } from "./validateDocument";
export function controlFor(
  doc: ExperimentDocument,
  capability: string,
  id: string,
): ControlRecord {
  const cap = templates[doc.template].controls[capability];
  if (!cap) throw new Error("This action is unavailable for this object");
  return {
    id,
    capability,
    label: cap.label,
    target: cap.action === "RESET" ? "session" : targetFor(doc),
    widget: cap.widget,
    slot: cap.slot,
    ...(cap.min !== undefined
      ? { min: cap.min, max: cap.max, step: cap.step }
      : {}),
    ...(cap.fixed !== undefined ? { fixed: structuredClone(cap.fixed) } : {}),
  };
}
export function targetFor(doc: ExperimentDocument) {
  return doc.template === "line"
    ? requireRecord(requireRecipe(doc).assembly?.instances[0]).id
    : templates[doc.template].target;
}
export function resultFor(
  doc: ExperimentDocument,
  output: string,
  id: string,
): ResultRecord {
  const cap = templates[doc.template].outputs[output];
  if (!cap) throw new Error("This output is unavailable for this object");
  return {
    id,
    output,
    label: cap.label,
    target: targetFor(doc),
    unit: cap.unit,
    precision: doc.template === "town" ? 0 : 2,
    slot: "primary",
  };
}
export function fromRecipe(recipe: Recipe): ExperimentDocument {
  const resolved = resolveRecipe(recipe);
  const template: TemplateId =
    resolved.demo === "gas"
      ? "gas"
      : resolved.demo === "fraction-builder"
        ? "fractions"
        : resolved.demo === "town"
          ? "town"
          : "line";
  if (
    template === "line" &&
    (resolved.demo !== "assembly" ||
      !recipe.assembly?.instances.length ||
      recipe.assembly.instances.some(
        (instance) => instance.prefab.ref !== "prefabs/math-foundations/Line",
      ))
  )
    throw new Error(
      "Remix supports gas, fraction boards, town, and Cartesian lines. This recipe needs another authoring adapter.",
    );
  const t = templates[template];
  const doc: ExperimentDocument = {
    documentVersion: 1,
    template,
    recipe: structuredClone(recipe),
    lesson: {
      title: recipe.assembly?.title ?? t.name,
      instruction: t.instruction,
      explanation: recipe.assembly?.learningGoal ?? "",
    },
    presentation: {
      layout: template === "town" ? "floating" : "right",
      view: template,
      particles: true,
      directShading: true,
      camera: "overview",
      controls: [],
      results: [],
    },
    editor: { positions: {}, zoom: 0.7 },
  };
  doc.presentation.controls = Object.keys(t.controls).map((key) =>
    controlFor(doc, key, `control-${key}`),
  );
  doc.presentation.results = Object.keys(t.outputs).map((key) =>
    resultFor(doc, key, `result-${key}`),
  );
  if (template === "line" && (recipe.assembly?.instances.length ?? 0) > 1) {
    const composed = composeLegacy(doc);
    validateDocument(composed);
    return composed;
  }
  validateDocument(doc);
  return doc;
}
export function createDocument(template: TemplateId) {
  return fromRecipe(templateRecipe(template));
}
export function initialParameters(
  doc: ExperimentDocument,
): Record<string, unknown> {
  if (!doc.recipe) return {};
  const resolved = resolveRecipe(doc.recipe);
  if (doc.template === "line")
    return { ...requireRecord(resolved.assembly?.instances[0]).parameters };
  return doc.template === "town"
    ? resolved.defaults
    : resolved.instances[0].parameters;
}
export function setInitial(
  doc: ExperimentDocument,
  key: string,
  value: unknown,
) {
  if (doc.template === "line")
    requireRecord(requireRecipe(doc).assembly?.instances[0]).parameters[key] =
      value;
  else requireRecipe(doc).parameters[key] = value;
}
export function requireRecipe(doc: ExperimentDocument): Recipe {
  if (!doc.recipe) throw new Error("Add an object to your canvas first");
  return doc.recipe;
}
export function addObject(doc: ExperimentDocument) {
  if (doc.recipe)
    throw new Error(
      "This canvas supports one model; remove it before adding another",
    );
  doc.recipe = templateRecipe(doc.template);
}
export function removeObject(doc: ExperimentDocument) {
  doc.recipe = null;
  doc.presentation.controls = [];
  doc.presentation.results = [];
  doc.editor.positions = {};
}
export function deleteBlock(doc: ExperimentDocument, id: string) {
  if (["object", "view", "lesson", "layout"].includes(id))
    throw new Error(
      "This template requires its object, view and lesson. Choose another template to replace them.",
    );
  doc.presentation.controls = doc.presentation.controls.filter(
    (c) => c.id !== id,
  );
  doc.presentation.results = doc.presentation.results.filter(
    (r) => r.id !== id,
  );
  delete doc.editor.positions[id];
}
export function createBlankDocument(
  template: TemplateId,
  layout: ExperimentDocument["presentation"]["layout"],
): ExperimentDocument {
  const doc: ExperimentDocument = {
    documentVersion: 1,
    template,
    recipe: null,
    lesson: { title: "", instruction: "", explanation: "" },
    presentation: {
      layout,
      view: template,
      particles: true,
      directShading: false,
      camera: "overview",
      controls: [],
      results: [],
    },
    editor: { positions: {}, zoom: 1 },
  };
  validateDocument(doc);
  return doc;
}
